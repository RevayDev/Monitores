import pool from '../utils/mysql.helper.js';
import { notifyUser, notifyStaffTicketUpdate } from '../socket.js';
import emailService from './email.service.js';

const normalize = (value) => String(value || '').trim();

class SupportService {
  validStatuses = new Set(['open', 'in_progress', 'answered', 'closed']);

  normalizeStatus(status) {
    const normalized = normalize(status).toLowerCase();
    return this.validStatuses.has(normalized) ? normalized : null;
  }

  async notifySupportTeams(ticket, actorId = null) {
    const [staffRows] = await pool.query(
      `SELECT id, role
       FROM users
       WHERE role IN ('admin', 'dev')
       ORDER BY id ASC`
    );
    const uniqueRows = (staffRows || []).filter((row, index, arr) => arr.findIndex((item) => Number(item.id) === Number(row.id)) === index);
    if (!uniqueRows.length) return;

    for (const row of uniqueRows) {
      const userId = Number(row.id);
      if (!userId) continue;
      const role = String(row.role || '').toLowerCase();
      const link = role === 'admin' ? '/admin-dashboard' : '/dev-dashboard';
      const [insertResult] = await pool.query(
        `INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
         VALUES (?, 'support_ticket', ?, ?, 0, NOW())`,
        [
          userId,
          `Nuevo ticket #${ticket.id}: ${ticket.subject}`,
          link
        ]
      );
      notifyUser(userId, {
        id: insertResult.insertId,
        user_id: userId,
        type: 'support_ticket',
        message: `Nuevo ticket #${ticket.id}: ${ticket.subject}`,
        link,
        is_read: 0,
        created_at: new Date().toISOString(),
        metadata: { ticketId: ticket.id, category: ticket.category, actorId }
      });
    }
  }

  async notifyRequester(ticketId, payload) {
    const [rows] = await pool.query('SELECT requester_user_id FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const requesterUserId = rows?.[0]?.requester_user_id;
    if (!requesterUserId) return;
    notifyUser(requesterUserId, payload);
  }

  async submitTicket(payload, requester) {
    const name = normalize(payload?.name || requester?.nombre);
    const email = normalize(payload?.email || requester?.email).toLowerCase();
    const category = normalize(payload?.category || 'tecnico').toLowerCase();
    const subject = normalize(payload?.subject);
    const message = normalize(payload?.message);

    if (!name || !email || !subject || !message) {
      throw new Error('Completa nombre, correo, asunto y mensaje.');
    }

    const [insertResult] = await pool.query(
      `INSERT INTO support_tickets
        (requester_user_id, requester_name, requester_email, category, subject, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())`,
      [requester?.id || null, name, email, category || 'tecnico', subject, message]
    );

    const ticketId = insertResult.insertId;
    const createdTicket = {
      id: ticketId,
      requester_name: name,
      requester_email: email,
      category: category || 'tecnico',
      subject
    };

    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [
        requester?.id || null,
        'SUPPORT_TICKET_CREATED',
        'support_ticket',
        ticketId,
        JSON.stringify({ email, category, subject })
      ]
    );

    await this.notifySupportTeams(createdTicket, requester?.id || null);
    notifyStaffTicketUpdate({ action: 'created', ticketId });

    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;

    if (!supportEmail) {
      return {
        delivered: false,
        ticketId,
        message: 'Solicitud guardada en sistema. Correo SMTP no configurado.'
      };
    }

    try {
      await emailService.sendMail({
        to: supportEmail,
        replyTo: email,
        subject: `[Monitores][Soporte #${ticketId}] ${subject}`,
        text: `Ticket: #${ticketId}\nCategoria: ${category}\nNombre: ${name}\nCorreo: ${email}\nUsuarioID: ${requester?.id || 'N/A'}\n\n${message}`
      });

      return {
        delivered: true,
        ticketId,
        message: 'Solicitud guardada y enviada al correo de soporte.'
      };
    } catch (err) {
      console.error('[SMTP] Error al enviar ticket de soporte:', err.message);
      return {
        delivered: false,
        ticketId,
        message: 'Solicitud guardada en sistema. Correo SMTP no configurado o fallido.'
      };
    }
  }

  async listTickets({ status = '', limit = 50 } = {}) {
    const max = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const params = [];
    let where = '';

    if (status) {
      where = 'WHERE status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT id, requester_user_id, requester_name, requester_email, category, subject, message, status, assigned_to, response_message, responded_by, responded_at, created_at, updated_at
       FROM support_tickets
       ${where}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, max]
    );

    return rows;
  }

  async respondTicket(ticketId, payload, actor) {
    const responseMessage = normalize(payload?.responseMessage);
    const newStatus = normalize(payload?.status || 'answered').toLowerCase();

    if (!responseMessage) {
      throw new Error('La respuesta no puede estar vacia.');
    }

    const [existing] = await pool.query('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const ticket = existing[0];
    if (!ticket) throw new Error('Ticket no encontrado.');

    await pool.query(
      `UPDATE support_tickets
       SET response_message = ?, responded_by = ?, responded_at = NOW(), status = ?, assigned_to = COALESCE(assigned_to, ?), updated_at = NOW()
       WHERE id = ?`,
      [responseMessage, actor?.id || null, newStatus || 'answered', actor?.id || null, ticketId]
    );

    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [actor?.id || null, 'SUPPORT_TICKET_RESPONDED', 'support_ticket', ticketId, JSON.stringify({ status: newStatus || 'answered' })]
    );

    if (ticket.requester_email) {
      try {
        await emailService.sendSupportResponseEmail({
          toEmail: ticket.requester_email,
          ticketId: ticket.id,
          subject: ticket.subject,
          userName: ticket.requester_name,
          originalMessage: ticket.message,
          responseMessage: responseMessage,
          status: newStatus || 'answered',
          responderName: actor?.nombre || 'Soporte Monitores Hub'
        });
      } catch (err) {
        console.error('[SMTP] Error al enviar respuesta de ticket por correo:', err.message);
      }
    }

    notifyStaffTicketUpdate({ action: 'responded', ticketId, status: newStatus || 'answered' });

    return { ok: true, message: 'Respuesta enviada y ticket actualizado.' };
  }

  async updateTicketStatus(ticketId, payload, actor) {
    const newStatus = this.normalizeStatus(payload?.status);
    if (!newStatus) {
      throw new Error('Estado invalido.');
    }

    const [existing] = await pool.query('SELECT id, status FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const ticket = existing[0];
    if (!ticket) throw new Error('Ticket no encontrado.');
    if (ticket.status === 'closed' && newStatus !== 'closed') {
      throw new Error('El ticket ya esta cerrado.');
    }

    await pool.query(
      `UPDATE support_tickets
       SET status = ?, assigned_to = COALESCE(assigned_to, ?), updated_at = NOW()
       WHERE id = ?`,
      [newStatus, actor?.id || null, ticketId]
    );

    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [actor?.id || null, 'SUPPORT_TICKET_STATUS_UPDATED', 'support_ticket', ticketId, JSON.stringify({ from: ticket.status, to: newStatus })]
    );

    // Emit live socket event for status change
    try {
      const { getIo } = await import('../socket.js');
      const io = getIo();
      io.to(`ticket_chat_${ticketId}`).emit('ticket_status_changed', { status: newStatus });
    } catch (err) {
      // ignore
    }

    notifyStaffTicketUpdate({ action: 'status_updated', ticketId, status: newStatus });

    if (ticket.requester_user_id) {
      await this.notifyRequester(ticketId, {
        id: Date.now(),
        type: 'support_ticket_status',
        event: 'support_ticket_status',
        message: newStatus === 'closed'
          ? `Tu chat de soporte #${ticketId} ha sido cerrado.`
          : `El estado de tu chat de soporte #${ticketId} cambió a ${newStatus}.`,
        link: `/support/chat/${ticketId}`,
        metadata: { ticketId, status: newStatus }
      });
    }

    return { ok: true, message: 'Estado actualizado.' };
  }

  async deleteTicket(ticketId, actor) {
    const [existing] = await pool.query('SELECT id, status FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const ticket = existing[0];
    if (!ticket) throw new Error('Ticket no encontrado.');

    await pool.query('DELETE FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [actor?.id || null, 'SUPPORT_TICKET_DELETED', 'support_ticket', ticketId, JSON.stringify({ previousStatus: ticket.status })]
    );
    notifyStaffTicketUpdate({ action: 'deleted', ticketId, previousStatus: ticket.status });
    return { ok: true, message: 'Ticket eliminado.' };
  }

  async getTicketMessages(ticketId) {
    const [rows] = await pool.query(
      `SELECT id, ticket_id, sender_id, sender_name, sender_role, sender_avatar, message, created_at
       FROM support_ticket_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC`,
      [ticketId]
    );
    return rows;
  }

  async addTicketMessage(ticketId, payload, actor = null) {
    let senderId = actor?.id || payload.sender_id || null;
    let senderName = payload.sender_name || 'Sistema';
    let senderRole = payload.sender_role || 'bot';
    let senderAvatar = payload.sender_avatar || null;
    const message = String(payload.message || '').trim();

    if (!message) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    if (senderId) {
      const [userRows] = await pool.query('SELECT nombre, foto, role FROM users WHERE id = ? LIMIT 1', [senderId]);
      const user = userRows[0];
      if (user) {
        senderName = user.nombre;
        senderRole = user.role === 'admin' ? 'admin' : (user.role === 'dev' ? 'dev' : 'user');
        senderAvatar = user.foto;
      }
    }

    const [insertResult] = await pool.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_name, sender_role, sender_avatar, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [ticketId, senderId, senderName, senderRole, senderAvatar, message]
    );

    const savedMessage = {
      id: insertResult.insertId,
      ticket_id: ticketId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      sender_avatar: senderAvatar,
      message,
      created_at: new Date().toISOString()
    };

    // Update ticket updated_at
    await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [ticketId]);

    // Emit live socket event to ticket room
    try {
      const { getIo } = await import('../socket.js');
      const io = getIo();
      const roomName = `ticket_chat_${ticketId}`;
      console.log('📤 Backend: Emitting ticket_message_received to room:', roomName, 'message:', savedMessage);
      io.to(roomName).emit('ticket_message_received', savedMessage);
      console.log('✅ Backend: Event emitted successfully');
    } catch (err) {
      console.error('❌ Backend: Error emitting socket event:', err);
      // socket not active or initialized, ignore
    }

    // Notify ticket requester directly when a support staff / system message arrives.
    if (senderRole !== 'user') {
      await this.notifyRequester(ticketId, {
        id: Date.now(),
        type: 'support_ticket_message',
        event: 'support_ticket_message',
        message: `Tienes un nuevo mensaje en tu chat de soporte #${ticketId}.`,
        link: `/support/chat/${ticketId}`,
        metadata: { ticketId }
      });
    }

    return savedMessage;
  }

  async assignTicketToAdvisor(ticketId, advisor) {
    const [existing] = await pool.query('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const ticket = existing[0];
    if (!ticket) throw new Error('Ticket no encontrado.');

    const advisorId = advisor.id;
    const [userRows] = await pool.query('SELECT nombre, foto FROM users WHERE id = ? LIMIT 1', [advisorId]);
    const advisorUser = userRows[0];
    if (!advisorUser) throw new Error('Asesor no encontrado.');

    await pool.query(
      `UPDATE support_tickets
       SET assigned_to = ?, status = 'in_progress', updated_at = NOW()
       WHERE id = ?`,
      [advisorId, ticketId]
    );

    // Create system message
    const welcomeMsgText = `El asesor **${advisorUser.nombre}** se ha unido al chat.`;
    const systemMsg = await this.addTicketMessage(ticketId, {
      sender_id: null,
      sender_name: 'Sistema',
      sender_role: 'bot',
      sender_avatar: advisorUser.foto || null,
      message: welcomeMsgText
    });

    notifyStaffTicketUpdate({ action: 'assigned', ticketId, advisorId });

    // Notify rooms of assignment
    try {
      const { getIo } = await import('../socket.js');
      const io = getIo();
      io.to(`ticket_chat_${ticketId}`).emit('advisor_joined', {
        advisorName: advisorUser.nombre,
        assignedTo: advisorId,
        systemMessage: systemMsg
      });
      
      // Also notify user directly via notifyUser helper if ticket requester has ID
      if (ticket.requester_user_id) {
        await this.notifyRequester(ticketId, {
          id: Date.now(),
          type: 'support_ticket_assigned',
          event: 'support_ticket_assigned',
          message: `El asesor ${advisorUser.nombre} ha tomado tu chat de soporte.`,
          link: `/support/chat/${ticketId}`,
          metadata: { ticketId, advisorId }
        });
      }
    } catch (err) {
      // ignore socket failure
    }

    return { ok: true, advisorName: advisorUser.nombre, systemMessage: systemMsg };
  }
}

export default new SupportService();
