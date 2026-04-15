import crypto from 'crypto';
import engagementRepository, { hashToken } from '../repositories/mysql/engagement.repository.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { notifyUser } from '../socket.js';

const QR_VALIDITY_HOURS = 2;
const DUPLICATE_SCAN_MINUTES = 5;

const getBogotaDateStr = () => {
  return new Intl.DateTimeFormat('fr-CA', { 
    timeZone: 'America/Bogota', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
};

const todayBogota = () => {
  return new Intl.DateTimeFormat('fr-CA', { 
    timeZone: 'America/Bogota', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(/,/g, '');
};

const toYmd = (date) => {
  return new Intl.DateTimeFormat('fr-CA', { 
    timeZone: 'America/Bogota', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date(date));
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FORUM_UPLOADS_DIR = path.resolve(__dirname, '../uploads/forum');

class EngagementService {
  normalizeAttachments(items = []) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        file_url: String(item?.file_url || item?.url || '').trim(),
        file_type: String(item?.file_type || item?.type || 'file').toLowerCase()
      }))
      .filter((item) => item.file_url)
      .map((item) => ({
        file_url: item.file_url,
        file_type: ['image', 'file', 'link'].includes(item.file_type) ? item.file_type : 'file'
      }));
  }

  extractMentionIds(text = '') {
    const value = String(text || '');
    const ids = [];
    for (const match of value.matchAll(/@\{(\d+)\}/g)) {
      ids.push(Number(match[1]));
    }
    for (const match of value.matchAll(/@[^#\n\r]+#(\d+)/g)) {
      ids.push(Number(match[1]));
    }
    return [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  }

  async getCurrentQr(userId) {
    await engagementRepository.revokeExpiredQrs(userId);
    const current = await engagementRepository.getCurrentQrByUser(userId);
    if (!current) return null;
    const now = new Date();
    const today = getBogotaDateStr();
    const qrDate = toYmd(current.code_date || current.created_at);
    const canGenerate = !(qrDate === today && now > new Date(current.expires_at));
    return {
      ...current,
      can_generate: canGenerate,
      blocked_until: canGenerate ? null : `${today}T23:59:59`
    };
  }

  async generateQr(userId, moduleId, context = {}) {
    await engagementRepository.revokeExpiredQrs(userId);
    const actor = await engagementRepository.getUserById(userId);

    if (moduleId) {
      const canAccess = await engagementRepository.canAccessModule(userId, moduleId, actor?.email);
      if (!canAccess) throw new Error('No tienes acceso a este modulo.');
    }

    const activeQr = await engagementRepository.getActiveQrByUser(userId);
    if (activeQr) return { ...activeQr, reused: true };

    const latestQr = await engagementRepository.getCurrentQrByUser(userId);
    const now = new Date();
    const today = getBogotaDateStr();
    const latestQrDate = latestQr ? toYmd(latestQr.code_date || latestQr.created_at) : null;

    if (latestQr && latestQrDate === today && now > new Date(latestQr.expires_at)) {
      throw new Error('Tu QR de hoy ya expiro. Podras generar uno nuevo manana.');
    }

    const token = crypto.randomBytes(24).toString('base64url');
    const tokenHash = hashToken(token);
    const validFrom = now;
    const expiresAt = new Date(validFrom.getTime() + QR_VALIDITY_HOURS * 60 * 60 * 1000);

    const qrCodeId = await engagementRepository.createQrCode({
      userId,
      token,
      tokenHash,
      validFrom,
      expiresAt
    });

    await engagementRepository.createActivityLog({
      userId,
      action: 'QR_GENERATED',
      entityType: 'qr_code',
      entityId: qrCodeId,
      metadata: { moduleId: moduleId || null },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return {
      id: qrCodeId,
      user_id: userId,
      token,
      valid_from: validFrom,
      expires_at: expiresAt,
      status: 'active',
      use_count: 0,
      reused: false
    };
  }

  async validateQr({ token, moduleId, scannerUserId }, context = {}) {
    const qr = await engagementRepository.findQrByToken(token);
    const tokenHash = hashToken(token);

    if (!qr) {
      await engagementRepository.createQrScanLog({
        qrCodeId: null,
        tokenHash,
        scannerUserId,
        studentUserId: null,
        moduleId,
        result: 'invalid',
        reason: 'token_not_found',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR invalido.');
    }

    const now = new Date();
    if (qr.status === 'revoked' || qr.status === 'expired') {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId,
        result: 'expired',
        reason: 'status_not_active',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR no activo.');
    }

    if (now < new Date(qr.valid_from) || now > new Date(qr.expires_at)) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId,
        result: 'expired',
        reason: 'outside_window',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR fuera de ventana valida.');
    }

    const qrOwner = await engagementRepository.getUserById(qr.user_id);
    const canAccessModule = await engagementRepository.canAccessModule(qr.user_id, moduleId, qrOwner?.email);
    if (!canAccessModule) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId,
        result: 'out_window',
        reason: 'student_not_enrolled',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('El estudiante no pertenece al modulo.');
    }

    const duplicatedByDay = await engagementRepository.findAttendanceDuplicate({
      studentId: qr.user_id,
      moduleId
    });
    if (duplicatedByDay) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId,
        result: 'duplicate',
        reason: 'attendance_already_registered_today',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('Asistencia ya registrada hoy para este modulo.');
    }

    const recent = await engagementRepository.findRecentAcceptedScan({
      studentUserId: qr.user_id,
      moduleId,
      minutes: DUPLICATE_SCAN_MINUTES
    });
    if (recent) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId,
        result: 'duplicate',
        reason: 'interval_lock',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('Escaneo duplicado en intervalo corto.');
    }

    const student = await engagementRepository.getUserById(qr.user_id);
    const attendanceId = await engagementRepository.createAttendance({
      monitorId: scannerUserId,
      studentId: qr.user_id,
      studentName: student?.nombre || 'Estudiante',
      moduleId,
      qrCodeId: qr.id
    });
    await engagementRepository.increaseQrUsage(qr.id);

    await engagementRepository.createQrScanLog({
      qrCodeId: qr.id,
      tokenHash,
      scannerUserId,
      studentUserId: qr.user_id,
      moduleId,
      result: 'accepted',
      reason: null,
      clientIp: context.ip,
      userAgent: context.userAgent
    });

    await engagementRepository.createActivityLog({
      userId: scannerUserId,
      action: 'QR_VALIDATED_OK',
      entityType: 'attendance',
      entityId: attendanceId,
      metadata: { studentId: qr.user_id, moduleId },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return {
      success: true,
      attendanceId,
      student: {
        id: student?.id || qr.user_id,
        nombre: student?.nombre || null,
        email: student?.email || null
      }
    };
  }

  async scanQrForLunch({ token, scannerUserId }, context = {}) {
    if (!token) throw new Error('Token QR obligatorio.');
    const qr = await engagementRepository.findQrByToken(token);
    const tokenHash = hashToken(token);
    if (!qr) {
      await engagementRepository.createQrScanLog({
        qrCodeId: null,
        tokenHash,
        scannerUserId,
        studentUserId: null,
        moduleId: 0,
        result: 'invalid',
        reason: 'token_not_found',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR invalido.');
    }

    const now = new Date();
    if (qr.status === 'revoked' || qr.status === 'expired') {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId: 0,
        result: 'expired',
        reason: 'status_not_active',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR no activo para almuerzo.');
    }
    if (now < new Date(qr.valid_from) || now > new Date(qr.expires_at)) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId: 0,
        result: 'expired',
        reason: 'outside_window',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('QR fuera de ventana valida.');
    }

    const already = await engagementRepository.getLunchUsageToday(qr.user_id);
    if (already) {
      await engagementRepository.createQrScanLog({
        qrCodeId: qr.id,
        tokenHash,
        scannerUserId,
        studentUserId: qr.user_id,
        moduleId: 0,
        result: 'duplicate',
        reason: 'lunch_already_claimed_today',
        clientIp: context.ip,
        userAgent: context.userAgent
      });
      throw new Error('Este usuario ya recibio almuerzo hoy.');
    }

    const lunchId = await engagementRepository.createLunchUsage({
      userId: qr.user_id,
      qrCodeId: qr.id,
      scannerUserId
    });
    await engagementRepository.createQrScanLog({
      qrCodeId: qr.id,
      tokenHash,
      scannerUserId,
      studentUserId: qr.user_id,
      moduleId: 0,
      result: 'accepted',
      reason: 'lunch_registered',
      clientIp: context.ip,
      userAgent: context.userAgent
    });

    const scanner = await engagementRepository.getUserById(scannerUserId);
    const student = await engagementRepository.getUserById(qr.user_id);
    await engagementRepository.createNotification({
      userId: qr.user_id,
      type: 'lunch_delivered',
      title: 'Almuerzo registrado',
      body: `Tu almuerzo fue registrado por ${scanner?.nombre || 'monitor'}.`,
      metadata: { lunchId }
    });
    notifyUser(qr.user_id, {
      type: 'lunch_delivered',
      title: 'Almuerzo registrado',
      body: `Tu almuerzo fue registrado por ${scanner?.nombre || 'monitor'}.`,
      metadata: { lunchId }
    });
    await engagementRepository.createActivityLog({
      userId: scannerUserId,
      action: 'LUNCH_DELIVERED',
      entityType: 'lunch_usage',
      entityId: lunchId,
      metadata: { studentId: qr.user_id, date: todayBogota() },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { 
      success: true, 
      lunchId, 
      userId: qr.user_id, 
      date: todayBogota(),
      student: {
        nombre: student?.nombre || 'Estudiante'
      }
    };
  }

  async getModuleForum(moduleId, userId) {
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) throw new Error('No tienes acceso al foro de este modulo.');

    const threads = await engagementRepository.getForumThreadsByModule(moduleId);
    const hydrated = await Promise.all(
      threads.map(async (thread) => ({
        ...thread,
        messages: await engagementRepository.getForumMessagesByThread(thread.id)
      }))
    );
    return hydrated;
  }

  async createThread(moduleId, userId, { title, message }, context = {}) {
    if (!title || !message) throw new Error('Titulo y mensaje son obligatorios.');

    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este modulo.');

    const threadId = await engagementRepository.createForumThread({ moduleId, userId, title });
    await engagementRepository.createForumMessage({
      threadId,
      moduleId,
      userId,
      roleSnapshot: user?.role || 'student',
      message
    });
    await engagementRepository.createActivityLog({
      userId,
      action: 'FORUM_THREAD_CREATED',
      entityType: 'forum_thread',
      entityId: threadId,
      metadata: { moduleId },
      ip: context.ip,
      userAgent: context.userAgent
    });
    return { id: threadId };
  }

  async createThreadMessage(threadId, userId, { message }, context = {}) {
    if (!message) throw new Error('Mensaje obligatorio.');
    const thread = await engagementRepository.getThreadById(threadId);
    if (!thread) throw new Error('Thread no encontrado.');
    if (thread.status === 'closed') throw new Error('Thread cerrado.');

    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, thread.module_id, user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este thread.');
    const messageId = await engagementRepository.createForumMessage({
      threadId,
      moduleId: thread.module_id,
      userId,
      roleSnapshot: user?.role || 'student',
      message
    });

    await engagementRepository.createActivityLog({
      userId,
      action: 'FORUM_MESSAGE_CREATED',
      entityType: 'forum_message',
      entityId: messageId,
      metadata: { threadId },
      ip: context.ip,
      userAgent: context.userAgent
    });

    if (Number(thread.created_by) !== Number(userId)) {
      await engagementRepository.createNotification({
        userId: thread.created_by,
        type: 'forum_reply',
        title: 'Respondieron tu foro',
        body: `Nuevo comentario en "${thread.title}"`,
        metadata: { threadId: thread.id, moduleId: thread.module_id }
      });
      notifyUser(thread.created_by, {
        type: 'forum_reply',
        title: 'Respondieron tu foro',
        body: `Nuevo comentario en "${thread.title}"`,
        metadata: { threadId: thread.id, moduleId: thread.module_id }
      });
    }
    return { id: messageId };
  }

  async getMyModules(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    return engagementRepository.getMyModules(userId, user.role, user.email);
  }

  async getMyAttendance(userId) {
    const user = await engagementRepository.getUserById(userId);
    return engagementRepository.getMyAttendance(userId, user?.nombre || null);
  }

  async getMyQrStatus(userId) {
    await engagementRepository.revokeExpiredQrs(userId);
    return engagementRepository.getCurrentQrByUser(userId);
  }

  async getMyForumHistory(userId) {
    const [legacyMessages, ownForums, savedForums] = await Promise.all([
      engagementRepository.getMyForumHistory(userId),
      engagementRepository.getMyCreatedForums(userId),
      engagementRepository.getMySavedForums(userId)
    ]);
    return {
      messages: legacyMessages,
      own_forums: ownForums,
      saved_forums: savedForums
    };
  }

  async saveThread(userId, threadId) {
    const thread = await engagementRepository.getForumThreadById(threadId);
    if (!thread) throw new Error('Thread no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, thread.module_id, user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este thread.');
    await engagementRepository.saveForumThread(userId, threadId);
    return { success: true };
  }

  async unsaveThread(userId, threadId) {
    await engagementRepository.unsaveForumThread(userId, threadId);
    return { success: true };
  }

  async deleteThread(userId, threadId) {
    const thread = await engagementRepository.getForumThreadById(threadId);
    if (!thread) throw new Error('Thread no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const isModerator = ['monitor', 'admin', 'dev'].includes(user?.role);
    if (Number(thread.created_by) !== Number(userId) && !isModerator) {
      throw new Error('No autorizado para borrar este thread.');
    }
    
    // Extract Image URLs before wiping DB
    const messages = await engagementRepository.getForumMessagesByThread(threadId);
    const urlsToClean = [];
    for (const msg of messages) {
       const links = String(msg.message || '').match(/https?:\/\/[^\s)]+/g) || [];
       urlsToClean.push(...links);
    }

    await engagementRepository.deleteThread(threadId);

    // Physically erase attachments on disk
    for (const url of urlsToClean) {
      if (!url || !url.includes('/uploads/forum/')) continue;
      const fileName = url.split('/uploads/forum/')[1];
      if (!fileName) continue;
      const target = path.resolve(FORUM_UPLOADS_DIR, fileName);
      if (!target.startsWith(FORUM_UPLOADS_DIR)) continue;
      try {
        if (fs.existsSync(target)) fs.unlinkSync(target);
      } catch {
        // no-op
      }
    }

    return { success: true };
  }

  async deleteMessage(userId, messageId) {
    const message = await engagementRepository.getForumMessageById(messageId);
    if (!message) throw new Error('Mensaje no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const isModerator = ['admin', 'dev'].includes(user?.role?.toLowerCase());
    if (Number(message.user_id) !== Number(userId) && !isModerator) {
      throw new Error('No autorizado para borrar este mensaje.');
    }
    
    // Extract Image URLs before wiping DB
    const urlsToClean = String(message.message || '').match(/https?:\/\/[^\s)]+/g) || [];

    await engagementRepository.deleteMessage(messageId);

    // Physically erase attachments on disk
    for (const url of urlsToClean) {
      if (!url || !url.includes('/uploads/forum/')) continue;
      const fileName = url.split('/uploads/forum/')[1];
      if (!fileName) continue;
      const target = path.resolve(FORUM_UPLOADS_DIR, fileName);
      if (!target.startsWith(FORUM_UPLOADS_DIR)) continue;
      try {
        if (fs.existsSync(target)) fs.unlinkSync(target);
      } catch {
        // no-op
      }
    }

    return { success: true };
  }

  async getNotifications(userId) {
    return engagementRepository.getUserNotifications(userId);
  }

  async readNotifications(userId) {
    await engagementRepository.markNotificationsAsRead(userId);
    return { success: true };
  }

  async deleteNotification(userId, notificationId) {
    const ok = await engagementRepository.deleteNotification(notificationId, userId);
    if (!ok) throw new Error('Notificacion no encontrada.');
    return { success: true };
  }

  async listForums({ subjectId }, userId) {
    const subject = subjectId ? Number(subjectId) : null;
    const forums = await engagementRepository.getForumCardsForUser(subject, userId);
    return forums;
  }

  async listForumsByModule(moduleId, userId) {
    if (!Number.isInteger(moduleId) || moduleId <= 0) throw new Error('Modulo invalido.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) return []; // Retornar lista vacia en lugar de error para acceso historico
    return engagementRepository.getForumCardsForUser(moduleId, userId);
  }

  async listForumMembers(moduleId, userId) {
    if (!Number.isInteger(moduleId) || moduleId <= 0) throw new Error('Modulo invalido.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) return []; // Retornar lista vacia en lugar de error para acceso historico
    return engagementRepository.getForumMentionableUsers(moduleId);
  }

  async createForum(userId, payload, context = {}) {
    const { title, content, subject_id, modulo_id, attachments } = payload || {};
    const moduleId = Number(modulo_id || subject_id);
    if (!title || !content || !moduleId) throw new Error('title, content y modulo_id son obligatorios.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) throw new Error('No tienes acceso al modulo del foro.');
    const duplicate = await engagementRepository.findRecentForumDuplicate({
      userId,
      title: String(title).trim(),
      content: String(content).trim()
    });
    if (duplicate?.id) return { id: duplicate.id, duplicated: true };

    const forumId = await engagementRepository.createForum({
      title: String(title).trim(),
      content: String(content).trim(),
      userId,
      subjectId: moduleId,
      attachments: this.normalizeAttachments(attachments)
    });

    const moduleRow = await engagementRepository.getModuleById(moduleId);
    const monitorId = Number(moduleRow?.monitorId || 0);
    if (monitorId > 0 && monitorId !== Number(userId)) {
      await engagementRepository.createNotification({
        userId: monitorId,
        type: 'actividad_foro_monitor',
        title: 'Nueva pregunta en tu modulo',
        body: String(title).trim(),
        metadata: { forumId, moduleId }
      });
      notifyUser(monitorId, {
        userId: monitorId,
        type: 'actividad_foro_monitor',
        title: 'Nueva pregunta en tu modulo',
        body: String(title).trim(),
        metadata: { forumId, moduleId }
      });
    }

    if (mentionIds.length) {
      const mentionedUsers = await engagementRepository.getUsersByIdsInModule(moduleId, mentionIds);
      await Promise.all(
        mentionedUsers
          .filter((member) => Number(member.id) !== Number(userId))
          .map((member) =>
            engagementRepository.createNotification({
              userId: member.id,
              type: 'mencion_foro',
              title: 'Te mencionaron en una pregunta',
              body: String(title).trim(),
              metadata: { forumId, moduleId }
            }).then(() => {
              notifyUser(member.id, {
                type: 'mencion_foro',
                title: 'Te mencionaron en una pregunta',
                body: String(title).trim(),
                metadata: { forumId, moduleId }
              });
            })
          )
      );
    }

    await engagementRepository.createActivityLog({
      userId,
      action: 'FORUM_CREATED_V2',
      entityType: 'forum',
      entityId: forumId,
      metadata: { subject_id: moduleId },
      ip: context.ip,
      userAgent: context.userAgent
    });
    return { id: forumId };
  }

  async getForumById(forumId, userId) {
    const forum = await engagementRepository.getForumByIdForUser(Number(forumId), userId);
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const moduleId = Number(forum.modulo_id || forum.subject_id);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);

    const isOwner = Number(forum.user_id) === Number(userId);
    const isSaved = Number(forum.is_saved) === 1;

    if (!canAccess && !isOwner && !isSaved) {
      throw new Error('No tienes acceso a este foro.');
    }
    const [replies, attachments] = await Promise.all([
      engagementRepository.getForumReplies(Number(forumId)),
      engagementRepository.getForumAttachments({ forumId: Number(forumId) })
    ]);
    const enrichedReplies = await Promise.all(
      (replies || []).map(async (reply) => ({
        ...reply,
        attachments: await engagementRepository.getForumAttachments({ replyId: Number(reply.id) })
      }))
    );
    return { 
      ...forum, 
      modulo_id: moduleId, 
      attachments, 
      comments: enrichedReplies, 
      replies: enrichedReplies,
      is_active_member: canAccess
    };
  }

  async updateForum(userId, forumId, payload) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const isModerator = ['admin', 'dev'].includes(String(user?.role || '').toLowerCase());
    
    const moduleId = Number(forum.modulo_id || forum.subject_id);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);

    if (Number(forum.user_id) !== Number(userId) && !isModerator) {
      throw new Error('No autorizado para editar esta pregunta.');
    }

    if (!canAccess && !isModerator) {
      throw new Error('No puedes editar foros si ya no perteneces al modulo.');
    }
    await engagementRepository.updateForum(Number(forumId), {
      title: payload.title?.trim(),
      content: payload.content?.trim(),
      attachments: this.normalizeAttachments(payload.attachments)
    });
    return { success: true };
  }

  async createForumReply(forumId, userId, payload, context = {}) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const moduleId = Number(forum.modulo_id || forum.subject_id);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este foro.');

    const { content, attachments } = payload || {};
    if (!content) throw new Error('content es obligatorio.');

    const duplicate = await engagementRepository.findRecentReplyDuplicate({
      forumId: Number(forumId),
      userId,
      content: String(content).trim()
    });
    if (duplicate?.id) return { id: duplicate.id, duplicated: true };

    const commentId = await engagementRepository.createForumReply({
      forumId: Number(forumId),
      userId,
      content: String(content).trim(),
      attachments: this.normalizeAttachments(attachments)
    });

    const mentionIds = this.extractMentionIds(content);
    const isAuthorMentioned = mentionIds.includes(Number(forum.user_id));

    if (Number(forum.user_id) !== Number(userId) && !isAuthorMentioned) {
      await engagementRepository.createNotification({
        userId: forum.user_id,
        type: 'respuesta_foro',
        title: 'Respondieron tu pregunta',
        body: forum.title,
        metadata: { forumId: Number(forumId), moduleId }
      });
      notifyUser(forum.user_id, {
        type: 'respuesta_foro',
        title: 'Respondieron tu pregunta',
        body: forum.title,
        metadata: { forumId: Number(forumId), moduleId }
      });
    }

    // Notificar al monitor del modulo si no es el autor de la respuesta
    const monitorId = Number(forum.module_monitor_id);
    if (monitorId && monitorId !== Number(userId) && monitorId !== Number(forum.user_id)) {
      await engagementRepository.createNotification({
        userId: monitorId,
        type: 'actividad_foro_monitor',
        title: 'Actividad en tu modulo',
        body: `Nueva respuesta en "${forum.title}"`,
        metadata: { forumId: Number(forumId), moduleId }
      });
      notifyUser(monitorId, {
        type: 'actividad_foro_monitor',
        title: 'Actividad en tu modulo',
        body: `Nueva respuesta en "${forum.title}"`,
        metadata: { forumId: Number(forumId), moduleId }
      });
    }

    if (mentionIds.length) {
      const mentionedUsers = await engagementRepository.getUsersByIdsInModule(moduleId, mentionIds);
      await Promise.all(
        mentionedUsers
          .filter((member) => Number(member.id) !== Number(userId))
          .map((member) =>
            engagementRepository.createNotification({
              userId: member.id,
              type: 'mencion_foro',
              title: 'Te mencionaron en un foro',
              body: forum.title,
              metadata: { forumId: Number(forumId), moduleId }
            }).then(() => {
              notifyUser(member.id, {
                type: 'mencion_foro',
                title: 'Te mencionaron en un foro',
                body: forum.title,
                metadata: { forumId: Number(forumId), moduleId }
              });
            })
          )
      );
    }

    await engagementRepository.createActivityLog({
      userId,
      action: 'FORUM_COMMENT_CREATED_V2',
      entityType: 'forum_comment',
      entityId: commentId,
      metadata: { forum_id: Number(forumId) },
      ip: context.ip,
      userAgent: context.userAgent
    });
    return { id: commentId };
  }

  async reportForum(userId, payload) {
    const { type, targetId, reason } = payload;
    if (!type || !targetId || !reason) throw new Error('type, targetId y reason son obligatorios.');
    const numericTargetId = Number(targetId);
    if (!Number.isInteger(numericTargetId) || numericTargetId <= 0) {
      throw new Error('targetId invalido.');
    }
    
    const user = await engagementRepository.getUserById(userId);
    let moduleId;

    if (type === 'thread') {
      const forum = await engagementRepository.getForumById(numericTargetId);
      if (!forum) throw new Error('Foro no encontrado.');
      moduleId = Number(forum.modulo_id || forum.subject_id);
    } else {
      const reply = await engagementRepository.getForumReplyById(numericTargetId);
      if (!reply) throw new Error('Respuesta no encontrada.');
      const forum = await engagementRepository.getForumById(Number(reply.forum_id));
      moduleId = Number(forum?.modulo_id || forum?.subject_id);
    }

    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);
    const isModerator = ['admin', 'dev'].includes(String(user?.role || '').toLowerCase());
    if (!canAccess && !isModerator) {
      throw new Error('No puedes reportar contenido si no perteneces al modulo.');
    }

    let reportedId;
    if (type === 'thread') {
      const forum = await engagementRepository.getForumById(numericTargetId);
      reportedId = forum.user_id;
    } else {
      const reply = await engagementRepository.getForumReplyById(numericTargetId);
      reportedId = reply.user_id;
    }

    const reportId = await engagementRepository.createForumReport({
      type,
      targetId: numericTargetId,
      reporterId: userId,
      reportedId,
      reason: reason.trim()
    });
    return { success: true, reportId };
  }

  async getReports(userId, filters = {}) {
    if (!userId || !Number.isInteger(Number(userId))) {
      throw new Error('ID de usuario invalido para ver reportes.');
    }
    const user = await engagementRepository.getUserById(userId);
    const role = String(user?.role || '').toLowerCase();
    
    const queryFilters = {};
    if (['monitor', 'monitor_academico'].includes(role)) {
      queryFilters.monitorId = userId;
    } else if (!['admin', 'dev'].includes(role)) {
      throw new Error('No autorizado para ver reportes.');
    }

    return engagementRepository.getForumReports(queryFilters);
  }

  async resolveReport(userId, reportId) {
    const user = await engagementRepository.getUserById(userId);
    if (!['admin', 'dev', 'monitor', 'monitor_academico'].includes(String(user?.role || '').toLowerCase())) {
      throw new Error('No autorizado.');
    }
    await engagementRepository.resolveForumReport(reportId, userId);
    return { success: true };
  }

  async updateForumReply(userId, replyId, payload) {
    const reply = await engagementRepository.getForumReplyById(Number(replyId));
    if (!reply) throw new Error('Respuesta no encontrada.');
    const forum = await engagementRepository.getForumById(Number(reply.forum_id));
    const user = await engagementRepository.getUserById(userId);
    const isModerator = ['admin', 'dev'].includes(String(user?.role || '').toLowerCase());
    
    const moduleId = Number(forum?.modulo_id || forum?.subject_id);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);

    if (Number(reply.user_id) !== Number(userId) && !isModerator) {
      throw new Error('No autorizado para editar esta respuesta.');
    }

    if (!canAccess && !isModerator) {
      throw new Error('No puedes editar respuestas si ya no perteneces al modulo.');
    }
    await engagementRepository.updateForumReply(Number(replyId), {
      content: payload.content?.trim(),
      attachments: this.normalizeAttachments(payload.attachments)
    });
    return { success: true };
  }

  async createForumComment(forumId, userId, payload, context = {}) {
    return this.createForumReply(forumId, userId, payload, context);
  }

  async toggleForumSave(forumId, userId) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const isSaved = await engagementRepository.isForumFavorite(userId, Number(forumId));
    if (isSaved) {
      await engagementRepository.removeForumFavorite(userId, Number(forumId));
      return { saved: false };
    }
    await engagementRepository.setForumFavorite(userId, Number(forumId));
    return { saved: true };
  }

  async deleteForum(forumId, userId) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const role = String(user?.role || '').toLowerCase();
    const canModerate = ['admin', 'dev'].includes(role);

    const moduleId = Number(forum.modulo_id || forum.subject_id);
    const canAccess = await engagementRepository.canAccessModule(userId, moduleId, user?.email);

    if (Number(forum.user_id) !== Number(userId) && !canModerate) {
      throw new Error('No autorizado para borrar este foro.');
    }

    if (!canAccess && !canModerate) {
      throw new Error('No puedes borrar foros si ya no perteneces al modulo.');
    }

    // Recolecta URLs de adjuntos y contenido markdown para borrar archivos físicos locales.
    const [forumAttachments, forumReplies] = await Promise.all([
      engagementRepository.getForumAttachments({ forumId: Number(forumId) }),
      engagementRepository.getForumReplies(Number(forumId))
    ]);
    const replyAttachmentLists = await Promise.all(
      (forumReplies || []).map((reply) => engagementRepository.getForumAttachments({ replyId: Number(reply.id) }))
    );
    const attachmentUrls = [
      ...(forumAttachments || []).map((a) => a.file_url),
      ...replyAttachmentLists.flat().map((a) => a.file_url)
    ];
    const markdownUrls = [
      ...(String(forum.content || '').match(/https?:\/\/[^\s)]+/g) || []),
      ...(forumReplies || []).flatMap((r) => String(r.content || '').match(/https?:\/\/[^\s)]+/g) || [])
    ];
    const allUrls = [...new Set([...attachmentUrls, ...markdownUrls])];

    await engagementRepository.deleteForum(Number(forumId));

    for (const url of allUrls) {
      if (!url || !url.includes('/uploads/forum/')) continue;
      const fileName = url.split('/uploads/forum/')[1];
      if (!fileName) continue;
      const target = path.resolve(FORUM_UPLOADS_DIR, fileName);
      if (!target.startsWith(FORUM_UPLOADS_DIR)) continue;
      try {
        if (fs.existsSync(target)) fs.unlinkSync(target);
      } catch {
        // no-op
      }
    }

    return { success: true };
  }

  async getMyStats(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    return engagementRepository.getGlobalStatsByRole(user);
  }

  async getStudentStats(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    if (!['student', 'estudiante'].includes(user.role)) throw new Error('Acceso no permitido para este endpoint.');
    return engagementRepository.getStudentStats(user);
  }

  async getMonitorAcademicStats(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    if (!['monitor', 'monitor_academico'].includes(user.role)) throw new Error('Acceso no permitido para este endpoint.');
    return engagementRepository.getMonitorAcademicStats(user);
  }

  async getMonitorAdminStats(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    if (!['monitor_administrativo', 'admin', 'dev'].includes(user.role)) throw new Error('Acceso no permitido para este endpoint.');
    return engagementRepository.getMonitorAdminStats(user);
  }

  async getAdminStats(userId) {
    const user = await engagementRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    if (!['admin', 'dev'].includes(user.role)) throw new Error('Acceso no permitido para este endpoint.');
    return engagementRepository.getAdminStats();
  }

  async updateForumPresence(userId, forumId, isTyping) {
    return engagementRepository.updateForumPresence(forumId, userId, isTyping);
  }

  async getForumPresence(forumId, userId) {
    return engagementRepository.getForumPresence(forumId, userId);
  }

  async resetAllScans(userId) {
    const user = await engagementRepository.getUserById(userId);
    const isDev = ['dev'].includes(String(user?.role || '').toLowerCase());
    if (!isDev) throw new Error('No autorizado para esta operacion.');

    await engagementRepository.createActivityLog({
      userId,
      action: 'DEV_RESET_SCANS',
      entityType: 'database',
      entityId: 0,
      metadata: { timestamp: new Date().toISOString() }
    });

    return engagementRepository.resetAllScans();
  }
}

export default new EngagementService();
