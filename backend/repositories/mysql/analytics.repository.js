import pool from '../../utils/mysql.helper.js';

class AnalyticsRepositoryMySQL {
  async getUserById(userId) {
    const [rows] = await pool.query('SELECT id, nombre, email, role, username FROM users WHERE id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  }

  async getModulesByMonitor(monitorUserId) {
    const [rows] = await pool.query(
      `
      SELECT id, modulo, monitorId, horario, sede, modalidad
      FROM modules
      WHERE monitorId = ?
      ORDER BY modulo ASC
      `,
      [monitorUserId]
    );
    return rows;
  }

  async createAcademicSession({ moduleId, monitorId, startTime, endTime, ratingAverage = null }) {
    const [result] = await pool.query(
      `
      INSERT INTO academic_sessions (module_id, monitor_id, start_time, end_time, rating_average, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [moduleId, monitorId, startTime, endTime, ratingAverage]
    );
    return result.insertId;
  }

  async createAcademicAttendanceRows(sessionId, rows = []) {
    if (!rows?.length) return;
    const values = rows.map((item) => [
      sessionId,
      item.student_id || null,
      item.student_name || null,
      item.status,
      item.excuse_reason || null,
      item.excuse_description || null,
      item.rating || null,
      item.comment || null
    ]);
    await pool.query(
      `
      INSERT INTO academic_session_attendance
      (session_id, student_id, student_name, status, excuse_reason, excuse_description, rating, comment, created_at)
      VALUES ?
      `,
      [values]
    );
  }

  async getAcademicSessionById(sessionId) {
    const [rows] = await pool.query(
      `
      SELECT s.*, m.modulo, m.monitorId
      FROM academic_sessions s
      JOIN modules m ON m.id = s.module_id
      WHERE s.id = ?
      LIMIT 1
      `,
      [sessionId]
    );
    return rows[0] || null;
  }

  async getAcademicSessionHistory(moduleId, monitorId = null) {
    const params = [moduleId];
    let where = 'WHERE s.module_id = ?';
    if (monitorId) {
      where += ' AND s.monitor_id = ?';
      params.push(monitorId);
    }
    const [rows] = await pool.query(
      `
      SELECT
        s.id,
        s.module_id,
        m.modulo AS module_name,
        s.start_time,
        s.end_time,
        s.rating_average,
        COUNT(a.id) AS total_records,
        SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) AS total_attendees
      FROM academic_sessions s
      JOIN modules m ON m.id = s.module_id
      LEFT JOIN academic_session_attendance a ON a.session_id = s.id
      ${where}
      GROUP BY s.id, s.module_id, m.modulo, s.start_time, s.end_time, s.rating_average
      ORDER BY s.start_time DESC
      `,
      params
    );
    return rows;
  }

  async getAcademicSessionAttendance(sessionId) {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        session_id,
        student_id,
        student_name,
        status,
        excuse_reason,
        excuse_description,
        rating,
        comment,
        created_at
      FROM academic_session_attendance
      WHERE session_id = ?
      ORDER BY student_name ASC, id ASC
      `,
      [sessionId]
    );
    return rows;
  }

  async updateAcademicAttendanceExcuse(attendanceId, { status, reason, description }) {
    const [result] = await pool.query(
      `
      UPDATE academic_session_attendance
      SET status = ?,
          excuse_reason = ?,
          excuse_description = ?
      WHERE id = ?
      `,
      [status, reason || null, description || null, attendanceId]
    );
    return result.affectedRows > 0;
  }

  async getAcademicModuleStats(moduleId, monitorId = null) {
    const baseParams = [moduleId];
    let monitorFilter = '';
    if (monitorId) {
      monitorFilter = ' AND s.monitor_id = ? ';
      baseParams.push(monitorId);
    }

    const [statusRows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'AUSENTE' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.status = 'EXCUSA' THEN 1 ELSE 0 END) AS excuse_count,
        COALESCE(ROUND(AVG(CASE WHEN a.rating BETWEEN 1 AND 5 THEN a.rating END), 2), 0) AS avg_rating
      FROM academic_sessions s
      LEFT JOIN academic_session_attendance a ON a.session_id = s.id
      WHERE s.module_id = ?
      ${monitorFilter}
      `,
      baseParams
    );

    const [hoursRows] = await pool.query(
      `
      SELECT
        COALESCE(ROUND(SUM(TIMESTAMPDIFF(MINUTE, s.start_time, s.end_time)) / 60, 2), 0) AS total_monitor_hours,
        COUNT(*) AS total_sessions
      FROM academic_sessions s
      WHERE s.module_id = ?
      ${monitorFilter}
      `,
      baseParams
    );

    const [studentsRows] = await pool.query(
      `
      SELECT
        COALESCE(CAST(a.student_id AS CHAR), a.student_name) AS student_key,
        COALESCE(u.nombre, a.student_name) AS student_name,
        SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'AUSENTE' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.status = 'EXCUSA' THEN 1 ELSE 0 END) AS excuse_count,
        COUNT(*) AS total_records,
        COALESCE(ROUND((SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2), 0) AS attendance_percent
      FROM academic_sessions s
      JOIN academic_session_attendance a ON a.session_id = s.id
      LEFT JOIN users u ON u.id = a.student_id
      WHERE s.module_id = ?
      ${monitorFilter}
      GROUP BY COALESCE(CAST(a.student_id AS CHAR), a.student_name), COALESCE(u.nombre, a.student_name)
      ORDER BY attendance_percent DESC, student_name ASC
      `,
      baseParams
    );

    return {
      totals: {
        present_count: Number(statusRows[0]?.present_count || 0),
        absent_count: Number(statusRows[0]?.absent_count || 0),
        excuse_count: Number(statusRows[0]?.excuse_count || 0),
        avg_rating: Number(statusRows[0]?.avg_rating || 0),
        total_monitor_hours: Number(hoursRows[0]?.total_monitor_hours || 0),
        total_sessions: Number(hoursRows[0]?.total_sessions || 0)
      },
      students: studentsRows
    };
  }

  async getAcademicStudentSummary(studentId) {
    const [statusRows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN status = 'PRESENTE' THEN 1 ELSE 0 END) AS total_assistances,
        SUM(CASE WHEN status = 'AUSENTE' THEN 1 ELSE 0 END) AS total_absences,
        SUM(CASE WHEN status = 'EXCUSA' THEN 1 ELSE 0 END) AS total_excuses,
        COUNT(*) AS total_records
      FROM academic_session_attendance
      WHERE student_id = ?
      `,
      [studentId]
    );

    const [historyRows] = await pool.query(
      `
      SELECT
        a.id,
        a.status,
        a.excuse_reason,
        a.excuse_description,
        a.rating,
        a.comment,
        s.start_time,
        m.modulo AS module_name,
        m.id AS module_id
      FROM academic_session_attendance a
      JOIN academic_sessions s ON s.id = a.session_id
      JOIN modules m ON m.id = s.module_id
      WHERE a.student_id = ?
      ORDER BY s.start_time DESC
      LIMIT 100
      `,
      [studentId]
    );

    const totals = statusRows[0] || {};
    const totalRecords = Number(totals.total_records || 0);
    const present = Number(totals.total_assistances || 0);

    return {
      total_assistances: present,
      total_absences: Number(totals.total_absences || 0),
      total_excuses: Number(totals.total_excuses || 0),
      attendance_frequency: totalRecords > 0 ? Number(((present / totalRecords) * 100).toFixed(2)) : 0,
      session_history: historyRows
    };
  }

  async getDiningStats(scannerUserId = null) {
    const params = [];
    let filter = '';
    if (scannerUserId) {
      filter = ' WHERE l.scanner_user_id = ? ';
      params.push(scannerUserId);
    }

    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_served,
        COUNT(DISTINCT l.user_id) AS total_students_served
      FROM lunch_usage l
      ${filter}
      `,
      params
    );

    const [byStudentRows] = await pool.query(
      `
      SELECT
        l.user_id AS student_id,
        u.nombre AS student_name,
        COUNT(*) AS meals_count,
        MAX(l.created_at) AS last_meal_at
      FROM lunch_usage l
      JOIN users u ON u.id = l.user_id
      ${filter}
      GROUP BY l.user_id, u.nombre
      ORDER BY meals_count DESC, student_name ASC
      `,
      params
    );

    const [scheduleRows] = await pool.query(
      `
      SELECT
        HOUR(l.created_at) AS hour_of_day,
        COUNT(*) AS total
      FROM lunch_usage l
      ${filter}
      GROUP BY HOUR(l.created_at)
      ORDER BY hour_of_day ASC
      `,
      params
    );

    const [rejectRows] = await pool.query(
      `
      SELECT
        q.result,
        COUNT(*) AS total
      FROM qr_scan_logs q
      WHERE q.result <> 'accepted'
      ${scannerUserId ? ' AND q.scanner_user_id = ? ' : ''}
      GROUP BY q.result
      ORDER BY total DESC
      `,
      scannerUserId ? [scannerUserId] : []
    );

    const [inactiveRows] = await pool.query(
      `
      SELECT
        u.id AS student_id,
        u.nombre AS student_name,
        MAX(l.created_at) AS last_meal_at
      FROM users u
      LEFT JOIN lunch_usage l ON l.user_id = u.id ${scannerUserId ? ' AND l.scanner_user_id = ? ' : ''}
      WHERE u.role IN ('student', 'estudiante')
      GROUP BY u.id, u.nombre
      HAVING last_meal_at IS NULL OR last_meal_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY student_name ASC
      LIMIT 120
      `,
      scannerUserId ? [scannerUserId] : []
    );

    const [recentLogsRows] = await pool.query(
      `
      SELECT
        q.id,
        q.scan_time AS created_at,
        q.result,
        q.reason,
        COALESCE(u.nombre, 'Desconocido') AS student_name
      FROM qr_scan_logs q
      LEFT JOIN users u ON u.id = q.student_user_id
      WHERE q.module_id = 0
      ${scannerUserId ? ' AND q.scanner_user_id = ? ' : ''}
      ORDER BY q.scan_time DESC
      LIMIT 250
      `,
      scannerUserId ? [scannerUserId] : []
    );

    return {
      totals: {
        total_served: Number(totalsRows[0]?.total_served || 0),
        total_students_served: Number(totalsRows[0]?.total_students_served || 0)
      },
      history_by_student: byStudentRows,
      consumption_schedule: scheduleRows,
      rejected_attempts: rejectRows,
      inactive_students: inactiveRows,
      recent_logs: recentLogsRows
    };
  }

  async getDiningStudentHistory(studentId, scannerUserId = null) {
    const params = [studentId];
    let filter = ' WHERE l.user_id = ? ';
    if (scannerUserId) {
      filter += ' AND l.scanner_user_id = ? ';
      params.push(scannerUserId);
    }
    const [rows] = await pool.query(
      `
      SELECT
        l.id,
        l.user_id,
        u.nombre AS student_name,
        l.scanner_user_id,
        su.nombre AS scanner_name,
        l.date,
        l.created_at
      FROM lunch_usage l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users su ON su.id = l.scanner_user_id
      ${filter}
      ORDER BY l.created_at DESC
      `,
      params
    );
    return rows;
  }

  async getAdminOverview() {
    const [academicRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN a.status = 'PRESENTE' THEN 1 ELSE 0 END) AS total_present,
        SUM(CASE WHEN a.status = 'AUSENTE' THEN 1 ELSE 0 END) AS total_absent,
        SUM(CASE WHEN a.status = 'EXCUSA' THEN 1 ELSE 0 END) AS total_excuse
      FROM academic_sessions s
      LEFT JOIN academic_session_attendance a ON a.session_id = s.id
      `
    );
    const [diningRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_meals,
        COUNT(DISTINCT user_id) AS unique_students
      FROM lunch_usage
      `
    );
    const [monitorActivityRows] = await pool.query(
      `
      SELECT
        u.id AS monitor_id,
        u.nombre AS monitor_name,
        u.role,
        COUNT(al.id) AS activity_count
      FROM users u
      LEFT JOIN activity_logs al ON al.user_id = u.id
      WHERE u.role IN ('monitor', 'monitor_academico', 'monitor_administrativo')
      GROUP BY u.id, u.nombre, u.role
      ORDER BY activity_count DESC, monitor_name ASC
      `
    );
    return {
      academic: {
        total_sessions: Number(academicRows[0]?.total_sessions || 0),
        total_present: Number(academicRows[0]?.total_present || 0),
        total_absent: Number(academicRows[0]?.total_absent || 0),
        total_excuse: Number(academicRows[0]?.total_excuse || 0)
      },
      dining: {
        total_meals: Number(diningRows[0]?.total_meals || 0),
        unique_students: Number(diningRows[0]?.unique_students || 0)
      },
      monitor_activity: monitorActivityRows
    };
  }
}

export default new AnalyticsRepositoryMySQL();
