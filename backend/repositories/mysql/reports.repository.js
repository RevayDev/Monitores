import pool from '../../utils/mysql.helper.js';

class ReportsRepositoryMySQL {
  async createReport(data) {
    const { monitorId, studentName, studentEmail, reason, details, tipo, reported_id } = data;
    const [result] = await pool.query(
      `INSERT INTO complaints (monitorId, studentName, studentEmail, reason, details, tipo, reported_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [monitorId, studentName, studentEmail, reason, details, tipo, reported_id]
    );
    return { id: result.insertId, ...data, date: new Date() };
  }

  async getAllReports() {
    const [rows] = await pool.query(`
      SELECT c.*, u.nombre as reported_name
      FROM complaints c
      LEFT JOIN users u ON c.reported_id = u.id
      ORDER BY c.date DESC
    `);
    return rows;
  }

  async getMealLogs() {
    const [rows] = await pool.query(`
      SELECT ml.*, u.nombre as user_name
      FROM meal_logs ml
      JOIN users u ON ml.user_id = u.id
      ORDER BY ml.logged_at DESC
      LIMIT 100
    `);
    return rows;
  }
}

export default new ReportsRepositoryMySQL();
