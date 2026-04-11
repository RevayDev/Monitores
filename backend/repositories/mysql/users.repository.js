import pool from '../../utils/mysql.helper.js';

class UsersRepositoryMySQL {
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  async findByEmailOrUsername(identifier) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );
    return rows[0] || null;
  }

  async existsByEmailOrUsername(email, username, excludeUserId = null) {
    let sql = 'SELECT id, email, username FROM users WHERE (email = ? OR username = ?)';
    const params = [email, username];
    if (excludeUserId) {
      sql += ' AND id <> ?';
      params.push(excludeUserId);
    }
    sql += ' LIMIT 1';
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  }

  async create(userData) {
    const { nombre, username, email, password, role, sede, cuatrimestre, foto, is_principal, restrictions } = userData;
    const createdAt = new Date().toISOString();
    const [result] = await pool.query(
      'INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, foto, restrictions, is_principal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, username, email, password, role, sede, cuatrimestre, foto || null, restrictions || null, is_principal || false, createdAt]
    );
    return { id: result.insertId, ...userData, createdAt };
  }

  async update(id, userData) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(userData)) {
      if (key !== 'id' && key !== 'currentUserId' && key !== 'baseRole') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async anonymize(id) {
    const marker = `${id}_${Date.now()}`;
    const anonName = `Usuario eliminado #${id}`;
    const anonUser = `deleted_${marker}`;
    const anonEmail = `deleted+${marker}@anon.local`;
    await pool.query(
      `
      UPDATE users
      SET nombre = ?,
          username = ?,
          email = ?,
          password = ?,
          foto = NULL,
          is_active = 0,
          restrictions = JSON_OBJECT('login', true, 'management', true, 'dashboards', true, 'search', true, 'registrations', true)
      WHERE id = ?
      `,
      [anonName, anonUser, anonEmail, `deleted_${marker}`, id]
    );
    return this.findById(id);
  }

  async getPersonalAcademicStats(userId, userName = '') {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) AS total_assistances,
        SUM(CASE WHEN a.status = 'AUSENTE' THEN 1 ELSE 0 END) AS total_absences,
        SUM(CASE WHEN a.status = 'EXCUSA' THEN 1 ELSE 0 END) AS total_excuses
      FROM academic_session_attendance a
      WHERE a.student_id = ?
         OR (a.student_id IS NULL AND a.student_name = ?)
      `,
      [userId, userName || '']
    );

    const [historyRows] = await pool.query(
      `
      SELECT
        a.id,
        a.status,
        a.excuse_reason,
        a.excuse_description,
        s.start_time,
        s.end_time,
        m.id AS module_id,
        m.modulo AS module_name
      FROM academic_session_attendance a
      JOIN academic_sessions s ON s.id = a.session_id
      LEFT JOIN modules m ON m.id = s.module_id
      WHERE a.student_id = ?
         OR (a.student_id IS NULL AND a.student_name = ?)
      ORDER BY s.start_time DESC
      LIMIT 120
      `,
      [userId, userName || '']
    );

    const totals = totalsRows[0] || {};
    const totalRecords = Number(totals.total_records || 0);
    const totalAssistances = Number(totals.total_assistances || 0);

    return {
      total_assistances: totalAssistances,
      total_absences: Number(totals.total_absences || 0),
      total_excuses: Number(totals.total_excuses || 0),
      attendance_frequency: totalRecords > 0 ? Number(((totalAssistances / totalRecords) * 100).toFixed(2)) : 0,
      session_history: historyRows
    };
  }

  async getPersonalMealStats(userId) {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_meals,
        MAX(l.created_at) AS last_meal_at,
        MIN(l.created_at) AS first_meal_at,
        COUNT(DISTINCT DATE(l.created_at)) AS active_days
      FROM lunch_usage l
      WHERE l.user_id = ?
      `,
      [userId]
    );

    const [historyRows] = await pool.query(
      `
      SELECT
        l.id,
        l.date,
        l.created_at,
        l.scanner_user_id,
        su.nombre AS scanner_name
      FROM lunch_usage l
      LEFT JOIN users su ON su.id = l.scanner_user_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT 120
      `,
      [userId]
    );

    const row = totalsRows[0] || {};
    const totalMeals = Number(row.total_meals || 0);
    const activeDays = Number(row.active_days || 0);
    const firstMealAt = row.first_meal_at ? new Date(row.first_meal_at) : null;
    let frequency = 0;
    if (totalMeals > 0 && firstMealAt) {
      const elapsedDays = Math.max(1, Math.floor((Date.now() - firstMealAt.getTime()) / (1000 * 60 * 60 * 24)));
      frequency = Number(((totalMeals / elapsedDays) * 7).toFixed(2)); // comidas por semana
    }

    return {
      total_meals: totalMeals,
      last_meal_at: row.last_meal_at || null,
      usage_frequency: frequency,
      active_days: activeDays,
      consumption_history: historyRows
    };
  }

  async getMonitorAcademicActivity(userId) {
    const [rows] = await pool.query(
      `
      SELECT
        COUNT(DISTINCT s.id) AS sessions_count,
        COUNT(DISTINCT CASE WHEN a.status = 'PRESENTE' THEN COALESCE(CAST(a.student_id AS CHAR), a.student_name) END) AS students_attended,
        COALESCE(ROUND(AVG(CASE WHEN s.rating_average BETWEEN 1 AND 5 THEN s.rating_average END), 2), 0) AS average_rating_received
      FROM academic_sessions s
      LEFT JOIN academic_session_attendance a ON a.session_id = s.id
      WHERE s.monitor_id = ?
      `,
      [userId]
    );
    const row = rows[0] || {};
    return {
      type: 'MONITOR_ACADEMICO',
      sessions_count: Number(row.sessions_count || 0),
      students_attended: Number(row.students_attended || 0),
      average_rating_received: Number(row.average_rating_received || 0)
    };
  }

  async getMonitorAdministrativeActivity(userId) {
    const [servedRows] = await pool.query(
      `
      SELECT COUNT(*) AS total_served
      FROM lunch_usage
      WHERE scanner_user_id = ?
      `,
      [userId]
    );
    const [scanRows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN result = 'accepted' THEN 1 ELSE 0 END) AS accepted_scans,
        SUM(CASE WHEN result <> 'accepted' THEN 1 ELSE 0 END) AS rejected_scans
      FROM qr_scan_logs
      WHERE scanner_user_id = ?
        AND module_id = 0
      `,
      [userId]
    );
    return {
      type: 'MONITOR_ADMINISTRATIVO',
      total_served: Number(servedRows[0]?.total_served || 0),
      accepted_scans: Number(scanRows[0]?.accepted_scans || 0),
      rejected_scans: Number(scanRows[0]?.rejected_scans || 0)
    };
  }
}

export default new UsersRepositoryMySQL();
