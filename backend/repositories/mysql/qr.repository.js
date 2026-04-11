import pool from '../../utils/mysql.helper.js';

class QRRepositoryMySQL {
  async createQR(data) {
    const { user_id, token, expiresAt } = data;
    await pool.query(
      'INSERT INTO qrs (user_id, token, expiresAt) VALUES (?, ?, ?)',
      [user_id, token, expiresAt]
    );
    return data;
  }

  async findQRByToken(token) {
    const [rows] = await pool.query(
      'SELECT * FROM qrs WHERE token = ?',
      [token]
    );
    return rows[0];
  }

  async markAsUsed(token, monitorId) {
    await pool.query(
      'UPDATE qrs SET used = TRUE, scanned_by = ? WHERE token = ?',
      [monitorId, token]
    );
  }

  async hasAlreadyClaimedToday(userId) {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
      'SELECT * FROM meal_logs WHERE user_id = ? AND date = ? AND status = "permitido"',
      [userId, today]
    );
    return rows.length > 0;
  }

  async logMealScanned(userId, status, monitorId) {
    const today = new Date().toISOString().split('T')[0];
    const [result] = await pool.query(
      'INSERT INTO meal_logs (user_id, date, status, scanned_at, monitor_id) VALUES (?, ?, ?, NOW(), ?)',
      [userId, today, status, monitorId]
    );
    return { id: result.insertId, userId, date: today, status };
  }

  async getQRConfig() {
    const [rows] = await pool.query('SELECT config_value FROM settings WHERE config_key = "qr_config"');
    return rows[0] ? JSON.parse(rows[0].config_value) : { start_time: "06:00", end_time: "22:00" };
  }
}

export default new QRRepositoryMySQL();
