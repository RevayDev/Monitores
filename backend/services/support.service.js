import nodemailer from 'nodemailer';
import pool from '../utils/mysql.helper.js';

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
}

export default new SupportService();
