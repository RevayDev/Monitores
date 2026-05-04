import pool from '../../utils/mysql.helper.js';

class FeedbackRepositoryMySQL {
  async upsertFeedback({ moduleId, studentId, rating, comment, isPublic, isAnonymous }) {
    const [result] = await pool.query(
      `
      INSERT INTO module_feedback (module_id, student_id, rating, comment, is_public, is_anonymous, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        is_public = VALUES(is_public),
        is_anonymous = VALUES(is_anonymous),
        updated_at = NOW()
      `,
      [moduleId, studentId, rating ?? null, comment ?? '', isPublic ? 1 : 0, isAnonymous ? 1 : 0]
    );
    return { success: true, id: result.insertId || null };
  }

  async getMyFeedback(moduleId, studentId) {
    const [rows] = await pool.query(
      `SELECT module_id, student_id, rating, comment, is_public, is_anonymous, updated_at
       FROM module_feedback
       WHERE module_id = ? AND student_id = ?
       LIMIT 1`,
      [moduleId, studentId]
    );
    return rows[0] || null;
  }

  async getModuleFeedbackForMonitor(moduleId) {
    const [rows] = await pool.query(
      `
      SELECT mf.module_id, mf.student_id, mf.rating, mf.comment, mf.is_public, mf.is_anonymous, mf.updated_at,
             u.nombre AS student_name, u.email AS student_email
      FROM module_feedback mf
      LEFT JOIN users u ON u.id = mf.student_id
      WHERE mf.module_id = ?
      ORDER BY mf.updated_at DESC
      LIMIT 200
      `,
      [moduleId]
    );
    return rows;
  }

  async getModuleById(moduleId) {
    const [rows] = await pool.query('SELECT id, monitorId, modulo FROM modules WHERE id = ? LIMIT 1', [moduleId]);
    return rows[0] || null;
  }
}

export default new FeedbackRepositoryMySQL();
