import nodemailer from 'nodemailer';
import pool from '../utils/mysql.helper.js';
import { notifyUser } from '../socket.js';

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

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

    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
    const transporter = getTransporter();

    if (!supportEmail || !transporter) {
      return {
        delivered: false,
        ticketId,
        message: 'Solicitud guardada en sistema. Correo SMTP no configurado.'
      };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Monitores Support" <${process.env.SMTP_USER}>`,
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

    const transporter = getTransporter();
    if (transporter && ticket.requester_email) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Monitores Support" <${process.env.SMTP_USER}>`,
        to: ticket.requester_email,
        subject: `[Monitores][Ticket #${ticket.id}] Respuesta a tu solicitud`,
        text: `Hola ${ticket.requester_name},\n\nTu solicitud \"${ticket.subject}\" fue respondida por el equipo.\n\nRespuesta:\n${responseMessage}\n\nEstado: ${newStatus || 'answered'}\n\nGracias.`
      });
    }

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
    return { ok: true, message: 'Ticket eliminado.' };
  }
}

export default new SupportService();
