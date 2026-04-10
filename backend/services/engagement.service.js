import crypto from 'crypto';
import engagementRepository, { hashToken } from '../repositories/mysql/engagement.repository.js';

const QR_VALIDITY_HOURS = 2;
const DUPLICATE_SCAN_MINUTES = 5;
const toYmd = (date) => date.toISOString().slice(0, 10);
const todayBogota = () => new Date().toISOString().slice(0, 10);

class EngagementService {
  async getCurrentQr(userId) {
    await engagementRepository.revokeExpiredQrs(userId);
    const current = await engagementRepository.getCurrentQrByUser(userId);
    if (!current) return null;
    const now = new Date();
    const today = toYmd(now);
    const canGenerate = !(current.code_date === today && now > new Date(current.expires_at));
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
    const today = toYmd(now);
    if (latestQr && latestQr.code_date === today && now > new Date(latestQr.expires_at)) {
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
    if (!qr) throw new Error('QR invalido.');

    const now = new Date();
    if (qr.status === 'revoked' || qr.status === 'expired') {
      throw new Error('QR no activo para almuerzo.');
    }
    if (now < new Date(qr.valid_from) || now > new Date(qr.expires_at)) {
      throw new Error('QR fuera de ventana valida.');
    }

    const already = await engagementRepository.getLunchUsageToday(qr.user_id);
    if (already) throw new Error('Este usuario ya recibio almuerzo hoy.');

    const lunchId = await engagementRepository.createLunchUsage({
      userId: qr.user_id,
      qrCodeId: qr.id,
      scannerUserId
    });

    const scanner = await engagementRepository.getUserById(scannerUserId);
    await engagementRepository.createNotification({
      userId: qr.user_id,
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

    return { success: true, lunchId, userId: qr.user_id, date: todayBogota() };
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
    const [messages, ownThreads, savedThreads] = await Promise.all([
      engagementRepository.getMyForumHistory(userId),
      engagementRepository.getMyForumThreads(userId),
      engagementRepository.getSavedForumThreads(userId)
    ]);
    return {
      messages,
      ownThreads,
      savedThreads
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
    await engagementRepository.deleteThread(threadId);
    return { success: true };
  }

  async deleteMessage(userId, messageId) {
    const message = await engagementRepository.getForumMessageById(messageId);
    if (!message) throw new Error('Mensaje no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const isModerator = ['monitor', 'admin', 'dev'].includes(user?.role);
    if (Number(message.user_id) !== Number(userId) && !isModerator) {
      throw new Error('No autorizado para borrar este mensaje.');
    }
    await engagementRepository.deleteMessage(messageId);
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
    const forums = await engagementRepository.getForumCards(subject);
    return forums;
  }

  async createForum(userId, payload, context = {}) {
    const { title, content, subject_id } = payload || {};
    if (!title || !content || !subject_id) throw new Error('title, content y subject_id son obligatorios.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, Number(subject_id), user?.email);
    if (!canAccess) throw new Error('No tienes acceso al modulo del foro.');
    const forumId = await engagementRepository.createForum({
      title: String(title).trim(),
      content: String(content).trim(),
      userId,
      subjectId: Number(subject_id)
    });
    await engagementRepository.createActivityLog({
      userId,
      action: 'FORUM_CREATED_V2',
      entityType: 'forum',
      entityId: forumId,
      metadata: { subject_id: Number(subject_id) },
      ip: context.ip,
      userAgent: context.userAgent
    });
    return { id: forumId };
  }

  async getForumById(forumId, userId) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, Number(forum.subject_id), user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este foro.');
    const comments = await engagementRepository.getForumComments(Number(forumId));
    return { ...forum, comments };
  }

  async createForumComment(forumId, userId, payload, context = {}) {
    const forum = await engagementRepository.getForumById(Number(forumId));
    if (!forum) throw new Error('Foro no encontrado.');
    const user = await engagementRepository.getUserById(userId);
    const canAccess = await engagementRepository.canAccessModule(userId, Number(forum.subject_id), user?.email);
    if (!canAccess) throw new Error('No tienes acceso a este foro.');

    const { content, media_url, type } = payload || {};
    if (!content) throw new Error('content es obligatorio.');
    const commentId = await engagementRepository.createForumComment({
      forumId: Number(forumId),
      userId,
      content: String(content).trim(),
      mediaUrl: media_url || null,
      type: type || 'text'
    });

    if (Number(forum.user_id) !== Number(userId)) {
      await engagementRepository.createNotification({
        userId: forum.user_id,
        type: 'forum_comment',
        title: 'Nuevo comentario en tu foro',
        body: forum.title,
        metadata: { forumId: Number(forumId) }
      });
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
}

export default new EngagementService();
