import nodemailer from 'nodemailer';

// Abstract Email Provider Interface
class EmailProvider {
  async send({ to, subject, text, html }) {
    throw new Error('Method not implemented');
  }
  async verify() {
    throw new Error('Method not implemented');
  }
}

// Nodemailer SMTP Provider
class SMTPProvider extends EmailProvider {
  constructor() {
    super();
    this.transporter = null;
    this.init();
  }

  init() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[SMTP] ⚠️ Credenciales de correo no completas en el archivo .env. El envío de correos podría fallar.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // TLS (STARTTLS), secure must be false for 587
      auth: {
        user,
        pass,
      },
    });
  }

  async send(options) {
    if (!this.transporter) {
      this.init();
      if (!this.transporter) {
        throw new Error('SMTP transporter no inicializado por falta de configuración en .env');
      }
    }

    const from = process.env.SMTP_FROM || `"Monitores Hub" <${process.env.SMTP_USER}>`;
    return await this.transporter.sendMail({
      from,
      ...options
    });
  }

  async verify() {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[SMTP] ❌ Error de verificación de conexión SMTP:', error.message);
      return false;
    }
  }
}

// Email Service Manager
class EmailService {
  constructor() {
    // Easily swappable provider (e.g. SMTP, Resend, Brevo, SendGrid, etc.)
    this.provider = new SMTPProvider();
  }

  async verifySMTP() {
    console.log('[SMTP] Verificando conexión con el servidor de correo...');
    const ok = await this.provider.verify();
    if (ok) {
      console.log('[SMTP] ✅ Conexión SMTP verificada y lista para enviar correos.');
    } else {
      console.warn('[SMTP] ⚠️ La verificación SMTP falló. Comprueba el archivo .env y las credenciales de la cuenta.');
    }
  }

  async sendMail(options) {
    try {
      return await this.provider.send(options);
    } catch (error) {
      console.error(`[SMTP] Error al enviar correo:`, error?.message);
      throw error;
    }
  }

  async sendPasswordResetEmail(toEmail, resetLink, userName) {
    const subject = 'Restablecer contraseña - Monitores Hub';
    
    // Fallback plain text version
    const text = `Hola ${userName || 'Usuario'},\n\n` +
      `Has solicitado restablecer la contraseña de tu cuenta de Monitores Hub.\n\n` +
      `Para continuar, haz clic en el siguiente enlace o cópialo en tu navegador:\n` +
      `${resetLink}\n\n` +
      `Este enlace de recuperación es válido durante 30 minutos.\n\n` +
      `Si no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.\n\n` +
      `Soporte Monitores Hub: ${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}`;

    // Premium HTML template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña - Monitores Hub</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }
    .header {
      background-color: #7c3aed;
      background-image: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      font-weight: 500;
      color: #ddd6fe;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7c3aed;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3), 0 2px 4px -1px rgba(124, 58, 237, 0.15);
      transition: background-color 0.2s ease;
    }
    .btn:hover {
      background-color: #6d28d9;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .warning p {
      font-size: 13px;
      line-height: 1.5;
      color: #92400e;
      margin: 0;
      font-weight: 500;
    }
    .footer {
      background-color: #f5f3ff;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0d9ff;
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer a {
      color: #7c3aed;
      text-decoration: none;
    }
    .no-reply-box {
      background-color: #fdf4ff;
      border: 1px solid #e9d5ff;
      border-left: 4px solid #a855f7;
      padding: 12px 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 11px;
      color: #6b21a8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Monitores Hub</h1>
        <p>Sistema Central de Monitorías Universitarias</p>
      </div>
      <div class="content">
        <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en la plataforma de gestión de monitorías.</p>
        
        <div class="button-container">
          <a href="${resetLink}" target="_blank" class="btn">Restablecer Contraseña</a>
        </div>

        <div class="warning">
          <p>⚠️ <strong>Aviso Importante:</strong> Este enlace de recuperación es válido durante los próximos <strong>30 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña seguirá siendo la misma.</p>
        </div>

        <p style="margin-bottom: 0;">Si tienes problemas para hacer clic en el botón, copia y pega la siguiente URL en tu navegador:</p>
        <p style="font-size: 12px; word-break: break-all; color: #64748b; margin-top: 5px;">${resetLink}</p>
      </div>
      <div class="footer">
        <div class="no-reply-box">⛔ <strong>Este es un correo automático.</strong> Por favor, no respondas directamente a este mensaje. Para asistencia adicional, contáctanos a través de los canales oficiales.</div>
        <p>Soporte de Monitores Hub: <a href="mailto:${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}">${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}</a></p>
        <p style="margin-top: 15px; font-size: 10px; color: #94a3b8;">&copy; 2026 Monitores Hub. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendMail({ to: toEmail, subject, text, html });
  }

  async sendSupportResponseEmail({ toEmail, ticketId, subject, userName, originalMessage, responseMessage, status, responderName }) {
    const emailSubject = `[Monitores Hub][Ticket #${ticketId}] Respuesta a tu solicitud`;
    
    // Fallback plain text version
    const text = `Hola ${userName || 'Usuario'},\n\n` +
      `Tu ticket de soporte #${ticketId} ha sido respondido por nuestro equipo.\n\n` +
      `Detalles del ticket:\n` +
      `- Asunto: ${subject}\n` +
      `- Estado: ${status}\n` +
      `- Atendido por: ${responderName}\n\n` +
      `Mensaje Original:\n` +
      `${originalMessage}\n\n` +
      `Respuesta del equipo:\n` +
      `${responseMessage}\n\n` +
      `Gracias por contactar con Monitores Hub.\n\n` +
      `Soporte Monitores Hub: ${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}`;

    // Premium HTML template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Respuesta a tu ticket de soporte - Monitores Hub</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }
    .header {
      background-color: #4f46e5;
      background-image: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      font-weight: 500;
      color: #c7d2fe;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .response-card {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 5px solid #22c55e;
      padding: 20px;
      border-radius: 12px;
      margin: 25px 0;
    }
    .response-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #15803d;
    }
    .response-text {
      font-size: 14px;
      line-height: 1.6;
      color: #166534;
      margin: 0;
      white-space: pre-wrap;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      font-size: 13px;
    }
    .details-table th, .details-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
    }
    .details-table th {
      font-weight: 700;
      color: #64748b;
      width: 30%;
    }
    .details-table td {
      color: #334155;
    }
    .original-message {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 15px;
      border-radius: 10px;
      font-size: 13px;
      color: #64748b;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Monitores Hub Soporte</h1>
        <p>Respuesta a la Solicitud de Soporte #${ticketId}</p>
      </div>
      <div class="content">
        <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
        <p>Gracias por ponerte en contacto con nosotros. Nuestro equipo de soporte ha revisado tu solicitud y ha emitido una respuesta oficial.</p>
        
        <div class="response-card">
          <h3>Respuesta de Soporte:</h3>
          <p class="response-text">${responseMessage}</p>
        </div>

        <h4 style="margin: 30px 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Detalles del Ticket:</h4>
        <table class="details-table">
          <tr>
            <th>Ticket ID</th>
            <td>#${ticketId}</td>
          </tr>
          <tr>
            <th>Asunto</th>
            <td>${subject}</td>
          </tr>
          <tr>
            <th>Atendido Por</th>
            <td><strong>${responderName}</strong> (Soporte Técnico)</td>
          </tr>
          <tr>
            <th>Estado</th>
            <td><span style="display: inline-block; padding: 4px 8px; background-color: #e0e7ff; color: #4338ca; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${status === 'closed' ? 'Cerrado' : 'Respondido'}</span></td>
          </tr>
        </table>

        <h4 style="margin: 25px 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Tu Mensaje Original:</h4>
        <div class="original-message">${originalMessage}</div>
      </div>
      <div class="footer">
        <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-left:4px solid #a855f7;padding:12px 15px;border-radius:8px;margin-bottom:12px;font-size:11px;color:#6b21a8;text-align:left;">
          ⛔ <strong>Importante:</strong> Este es un canal de envío automático. Por favor <strong>no respondas</strong> a este correo directamente. Si necesitas ayuda adicional, contáctanos a través de los canales oficiales de Monitores Hub.
        </div>
        <p>Soporte de Monitores Hub: <a href="mailto:${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}">${process.env.SUPPORT_EMAIL || 'monitoreshub@gmail.com'}</a></p>
        <p style="margin-top: 15px; font-size: 10px; color: #94a3b8;">&copy; 2026 Monitores Hub. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendMail({ to: toEmail, subject: emailSubject, text, html });
  }
}

export default new EmailService();
