import crypto from 'crypto';
import qrRepository from '../repositories/mysql/qr.repository.js';
import usersRepository from '../repositories/mysql/users.repository.js';

const SECRET_KEY = 'monitores_anti_fraud_secret_key';

class QRService {
  async generateQR(userId) {
    // Window of 1 minute (60 seconds)
    const timestamp = Math.floor(Date.now() / 60000);
    const hash = this._generateHash(userId, timestamp);
    
    // Return a combined string that includes the user and timestamp for validation
    return `${userId}:${timestamp}:${hash}`;
  }

  _generateHash(userId, timestamp) {
    return crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${userId}:${timestamp}`)
      .digest('hex');
  }

  async validateQR(qrData, monitorId) {
    try {
      if (!qrData || !qrData.includes(':')) {
        return { success: false, message: '❌ Formato de QR inválido' };
      }

      const [userId, timestamp, hash] = qrData.split(':');
      const currentTimestamp = Math.floor(Date.now() / 60000);

      // 1. VALIDATE EXPIRATION (30-60 seconds)
      // We allow the current minute and the previous one to handle clock drift
      const ts = parseInt(timestamp, 10);
      if (ts < currentTimestamp - 1 || ts > currentTimestamp) {
        return { success: false, message: '❌ Código QR expirado' };
      }

      // 2. VALIDATE HASH
      const expectedHash = this._generateHash(userId, ts);
      if (hash !== expectedHash) {
        return { success: false, message: '❌ Código QR inválido (Hash mismatch)' };
      }

      // 3. CHECK DOUBLE CLAIMING (Meal Logs)
      const alreadyClaimed = await qrRepository.hasAlreadyClaimedToday(userId);
      if (alreadyClaimed) {
        return { success: false, message: '❌ Almuerzo ya reclamado hoy' };
      }

      // 4. CHECK SCHEDULE WINDOW
      const now = new Date();
      const config = await qrRepository.getQRConfig();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = (currentHour * 60) + currentMinutes;

      const [startH, startM] = config.start_time.split(':').map(Number);
      const [endH, endM] = config.end_time.split(':').map(Number);
      const startTimeInMinutes = (startH * 60) + (startM || 0);
      const endTimeInMinutes = (endH * 60) + (endM || 0);

      if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
        return { 
          success: false, 
          message: `❌ Fuera de horario permitido (${config.start_time} - ${config.end_time})` 
        };
      }

      // 5. PROCESS VALIDATION
      const user = await usersRepository.findById(userId);
      if (!user) {
        return { success: false, message: '❌ Usuario no encontrado' };
      }

      // Log in meal_logs
      await qrRepository.logMealScanned(userId, 'permitido', monitorId);

      return { 
        success: true, 
        message: '✅ Acceso permitido', 
        user: { id: user.id, nombre: user.nombre } 
      };

    } catch (error) {
      console.error('Error validating QR:', error);
      return { success: false, message: '❌ Error al procesar QR' };
    }
  }
}

export default new QRService();
