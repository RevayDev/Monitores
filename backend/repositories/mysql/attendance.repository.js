import pool from '../../utils/mysql.helper.js';

class AttendanceRepositoryMySQL {
  async registerAttendance(data) {
    const { monitorId, studentName, date, rating, comment, modalidad, estado } = data;
    const [result] = await pool.query(
      `INSERT INTO attendance (monitorId, studentName, date, rating, comment, modalidad, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [monitorId, studentName, date, rating, comment, modalidad, estado]
    );
    return { id: result.insertId, ...data };
  }

  async getAttendanceByModule(moduleId) {
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE monitorId = ? ORDER BY date DESC',
      [moduleId]
    );
    return rows;
  }
}

export default new AttendanceRepositoryMySQL();
