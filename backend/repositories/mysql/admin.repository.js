import pool from '../../utils/mysql.helper.js';

class AdminRepositoryMySQL {
  async getStats() {
    const [usersResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const [monitorsResult] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "monitor"');
    const [studentsResult] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "student"');
    const [modulesResult] = await pool.query('SELECT COUNT(*) as total FROM modules');
    const [attendanceResult] = await pool.query('SELECT COUNT(*) as total FROM attendance');
    
    return {
      totalUsers: usersResult[0].total,
      totalMonitors: monitorsResult[0].total,
      totalStudents: studentsResult[0].total,
      totalModules: modulesResult[0].total,
      totalAttendance: attendanceResult[0].total
    };
  }

  async getComplaints() {
    const [rows] = await pool.query('SELECT * FROM complaints ORDER BY date DESC');
    return rows;
  }
}

export default new AdminRepositoryMySQL();
