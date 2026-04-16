import pool from '../../utils/mysql.helper.js';

const PRESENT_FILTER = "(a.attendance_status IS NULL OR a.attendance_status = 'present')";
const ATTENDANCE_DATE_EXPR = "DATE(COALESCE(a.scan_time, a.date))";

const buildModuleFilter = (moduleIds = null, alias = 'a') => {
  if (!Array.isArray(moduleIds)) return { where: '', params: [] };
  if (!moduleIds.length) return { where: ' AND 1 = 0 ', params: [] };
  const placeholders = moduleIds.map(() => '?').join(',');
  return { where: ` AND ${alias}.module_id IN (${placeholders}) `, params: moduleIds };
};

class StatsRepositoryMySQL {
  async getUserById(userId) {
    const [rows] = await pool.query('SELECT id, nombre, email, role FROM users WHERE id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  }

  async getModuleIdsByMonitorUser(monitorUserId) {
    const [rows] = await pool.query('SELECT id FROM modules WHERE monitorId = ?', [monitorUserId]);
    return rows.map((row) => Number(row.id));
  }

  async getGlobalStats(moduleIds = null) {
    const filter = buildModuleFilter(moduleIds);

    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_assistances,
        COUNT(DISTINCT COALESCE(CAST(a.student_id AS CHAR), a.studentName)) AS unique_students,
        COALESCE(ROUND(AVG(CASE WHEN a.rating BETWEEN 1 AND 5 THEN a.rating END), 2), 0) AS average_rating
      FROM attendance a
      WHERE ${PRESENT_FILTER}
      ${filter.where}
      `,
      filter.params
    );

    const [assistancesByDate] = await pool.query(
      `
      SELECT
        ${ATTENDANCE_DATE_EXPR} AS date,
        COUNT(*) AS total
      FROM attendance a
      WHERE ${PRESENT_FILTER}
      ${filter.where}
      GROUP BY ${ATTENDANCE_DATE_EXPR}
      ORDER BY date DESC
      LIMIT 90
      `,
      filter.params
    );

    const [ratingDistribution] = await pool.query(
      `
      SELECT
        CAST(a.rating AS UNSIGNED) AS rating,
        COUNT(*) AS total
      FROM attendance a
      WHERE ${PRESENT_FILTER}
        AND a.rating BETWEEN 1 AND 5
        ${filter.where}
      GROUP BY CAST(a.rating AS UNSIGNED)
      ORDER BY rating ASC
      `,
      filter.params
    );

    return {
      totals: {
        total_assistances: Number(totalsRows[0]?.total_assistances || 0),
        average_rating: Number(totalsRows[0]?.average_rating || 0),
        unique_students: Number(totalsRows[0]?.unique_students || 0)
      },
      assistances_by_date: assistancesByDate,
      rating_distribution: ratingDistribution
    };
  }

  async getStudentPersonalStats(user) {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_attendances,
        COUNT(DISTINCT a.module_id) AS attended_modules_count,
        COALESCE(ROUND(AVG(CASE WHEN a.rating BETWEEN 1 AND 5 THEN a.rating END), 2), 0) AS average_rating_given
      FROM attendance a
      WHERE ${PRESENT_FILTER}
        AND (a.student_id = ? OR a.studentName = ?)
      `,
      [user.id, user.nombre || '']
    );

    const [historyRows] = await pool.query(
      `
      SELECT
        a.id,
        ${ATTENDANCE_DATE_EXPR} AS date,
        a.rating,
        a.comment,
        m.id AS module_id,
        m.modulo AS module_name
      FROM attendance a
      LEFT JOIN modules m ON m.id = a.module_id
      WHERE ${PRESENT_FILTER}
        AND (a.student_id = ? OR a.studentName = ?)
      ORDER BY date DESC, a.id DESC
      LIMIT 120
      `,
      [user.id, user.nombre || '']
    );

    return {
      role: 'student',
      totals: {
        monitorias_attended: Number(totalsRows[0]?.attended_modules_count || 0),
        total_attendances: Number(totalsRows[0]?.total_attendances || 0),
        average_rating_given: Number(totalsRows[0]?.average_rating_given || 0)
      },
      attendance_history: historyRows
    };
  }

  async getMonitorPersonalStats(userId) {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(DISTINCT COALESCE(CAST(a.student_id AS CHAR), a.studentName)) AS total_students_attended,
        COALESCE(ROUND(AVG(CASE WHEN a.rating BETWEEN 1 AND 5 THEN a.rating END), 2), 0) AS average_rating_received,
        COUNT(DISTINCT CONCAT(COALESCE(CAST(a.module_id AS CHAR), '0'), ':', ${ATTENDANCE_DATE_EXPR})) AS sessions_count
      FROM attendance a
      JOIN modules m ON m.id = a.module_id
      WHERE ${PRESENT_FILTER}
        AND m.monitorId = ?
      `,
      [userId]
    );

    return {
      role: 'monitor_academico',
      totals: {
        total_students_attended: Number(totalsRows[0]?.total_students_attended || 0),
        average_rating_received: Number(totalsRows[0]?.average_rating_received || 0),
        sessions_count: Number(totalsRows[0]?.sessions_count || 0)
      }
    };
  }
}

export default new StatsRepositoryMySQL();
