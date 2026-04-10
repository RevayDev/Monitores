import crypto from 'crypto';
import pool from '../../utils/mysql.helper.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

class EngagementRepositoryMySQL {
  async getUserById(userId) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0] || null;
  }

  async canAccessModule(userId, moduleId, userEmail = null) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM modules m
      LEFT JOIN registrations r
        ON r.monitorId = m.id
       AND r.studentEmail = ?
      WHERE m.id = ? AND (m.monitorId = ? OR r.id IS NOT NULL)
      LIMIT 1
      `,
      [userEmail || '', moduleId, userId]
    );
    return rows.length > 0;
  }

  async getCurrentQrByUser(userId) {
    const [rows] = await pool.query(
      `
      SELECT id, user_id, token_value AS token, code_date, valid_from, expires_at, status, use_count, last_used_at
      FROM qr_codes
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId]
    );
    return rows[0] || null;
  }

  async getActiveQrByUser(userId) {
    const [rows] = await pool.query(
      `
      SELECT id, user_id, token_value AS token, code_date, valid_from, expires_at, status, use_count, last_used_at
      FROM qr_codes
      WHERE user_id = ?
        AND status = 'active'
        AND NOW() BETWEEN valid_from AND expires_at
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId]
    );
    return rows[0] || null;
  }

  async revokeExpiredQrs(userId) {
    await pool.query(
      `
      UPDATE qr_codes
      SET status = 'expired'
      WHERE user_id = ?
        AND status = 'active'
        AND expires_at < NOW()
      `,
      [userId]
    );
  }

  async createQrCode({ userId, token, tokenHash, validFrom, expiresAt }) {
    const [result] = await pool.query(
      `
      INSERT INTO qr_codes (user_id, token_value, token_hash, code_date, valid_from, expires_at, status, use_count, created_at)
      VALUES (?, ?, ?, DATE(?), ?, ?, 'active', 0, NOW())
      `,
      [userId, token, tokenHash, validFrom, validFrom, expiresAt]
    );
    return result.insertId;
  }

  async findQrByToken(token) {
    const tokenHash = hashToken(token);
    const [rows] = await pool.query(
      `
      SELECT id, user_id, token_hash, valid_from, expires_at, status, use_count, last_used_at
      FROM qr_codes
      WHERE token_hash = ?
      LIMIT 1
      `,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async findRecentAcceptedScan({ studentUserId, moduleId, minutes }) {
    const [rows] = await pool.query(
      `
      SELECT id, scan_time
      FROM qr_scan_logs
      WHERE student_user_id = ?
        AND module_id = ?
        AND result = 'accepted'
        AND scan_time >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY scan_time DESC
      LIMIT 1
      `,
      [studentUserId, moduleId, minutes]
    );
    return rows[0] || null;
  }

  async findAttendanceDuplicate({ studentId, moduleId }) {
    const [rows] = await pool.query(
      `
      SELECT id
      FROM attendance
      WHERE student_id = ?
        AND module_id = ?
        AND DATE(scan_time) = CURDATE()
      LIMIT 1
      `,
      [studentId, moduleId]
    );
    return rows[0] || null;
  }

  async createAttendance({ monitorId, studentId, studentName, moduleId, qrCodeId }) {
    const [result] = await pool.query(
      `
      INSERT INTO attendance (monitorId, student_id, studentName, module_id, date, scan_time, attendance_status, qr_code_id, created_at)
      VALUES (?, ?, ?, ?, DATE_FORMAT(NOW(), '%Y-%m-%d'), NOW(), 'present', ?, NOW())
      `,
      [monitorId, studentId, studentName, moduleId, qrCodeId]
    );
    return result.insertId;
  }

  async increaseQrUsage(qrCodeId) {
    await pool.query(
      `
      UPDATE qr_codes
      SET use_count = use_count + 1, last_used_at = NOW(), status = CASE WHEN status = 'active' THEN 'used' ELSE status END
      WHERE id = ?
      `,
      [qrCodeId]
    );
  }

  async createQrScanLog({
    qrCodeId,
    tokenHash,
    scannerUserId,
    studentUserId,
    moduleId,
    result,
    reason,
    clientIp,
    userAgent
  }) {
    await pool.query(
      `
      INSERT INTO qr_scan_logs
      (qr_code_id, token_hash, scanner_user_id, student_user_id, module_id, module_session_id, scan_time, result, reason, client_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, 0, NOW(), ?, ?, ?, ?)
      `,
      [qrCodeId || null, tokenHash || null, scannerUserId, studentUserId || null, moduleId, result, reason || null, clientIp || null, userAgent || null]
    );
  }

  async createActivityLog({ userId, action, entityType, entityId, metadata, ip, userAgent }) {
    await pool.query(
      `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, ip, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [userId || null, action, entityType, entityId || null, metadata ? JSON.stringify(metadata) : null, ip || null, userAgent || null]
    );
  }

  async getForumThreadsByModule(moduleId) {
    const [rows] = await pool.query(
      `
      SELECT t.*,
             u.nombre AS created_by_name
      FROM forum_threads t
      JOIN users u ON u.id = t.created_by
      WHERE t.module_id = ?
      ORDER BY t.is_pinned DESC, COALESCE(t.last_message_at, t.created_at) DESC
      `,
      [moduleId]
    );
    return rows;
  }

  async getForumThreadById(threadId) {
    const [rows] = await pool.query('SELECT * FROM forum_threads WHERE id = ? LIMIT 1', [threadId]);
    return rows[0] || null;
  }

  async getForumMessagesByThread(threadId) {
    const [rows] = await pool.query(
      `
      SELECT m.*,
             u.nombre AS author_name,
             u.foto AS author_photo
      FROM forum_messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.thread_id = ?
      ORDER BY m.created_at ASC
      `,
      [threadId]
    );
    return rows;
  }

  async createForumThread({ moduleId, userId, title }) {
    const [result] = await pool.query(
      `
      INSERT INTO forum_threads (module_id, created_by, title, status, is_pinned, created_at)
      VALUES (?, ?, ?, 'open', 0, NOW())
      `,
      [moduleId, userId, title]
    );
    return result.insertId;
  }

  async getThreadById(threadId) {
    const [rows] = await pool.query('SELECT * FROM forum_threads WHERE id = ? LIMIT 1', [threadId]);
    return rows[0] || null;
  }

  async getForumMessageById(messageId) {
    const [rows] = await pool.query('SELECT * FROM forum_messages WHERE id = ? LIMIT 1', [messageId]);
    return rows[0] || null;
  }

  async createForumMessage({ threadId, moduleId, userId, roleSnapshot, message }) {
    const [result] = await pool.query(
      `
      INSERT INTO forum_messages (thread_id, module_id, user_id, role_snapshot, message, message_type, created_at)
      VALUES (?, ?, ?, ?, ?, 'normal', NOW())
      `,
      [threadId, moduleId, userId, roleSnapshot, message]
    );
    await pool.query('UPDATE forum_threads SET last_message_at = NOW() WHERE id = ?', [threadId]);
    return result.insertId;
  }

  async updateThreadState(threadId, data) {
    const fields = [];
    const values = [];
    if (typeof data.status === 'string') {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (typeof data.isPinned === 'boolean') {
      fields.push('is_pinned = ?');
      values.push(data.isPinned ? 1 : 0);
    }
    if (!fields.length) return;
    values.push(threadId);
    await pool.query(`UPDATE forum_threads SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async deleteThread(threadId) {
    await pool.query('DELETE FROM forum_messages WHERE thread_id = ?', [threadId]);
    await pool.query('DELETE FROM forum_saved_items WHERE thread_id = ?', [threadId]);
    const [result] = await pool.query('DELETE FROM forum_threads WHERE id = ?', [threadId]);
    return result.affectedRows > 0;
  }

  async deleteMessage(messageId) {
    const [result] = await pool.query('DELETE FROM forum_messages WHERE id = ?', [messageId]);
    return result.affectedRows > 0;
  }

  async saveForumThread(userId, threadId) {
    await pool.query(
      'INSERT INTO forum_saved_items (user_id, thread_id, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE created_at = NOW()',
      [userId, threadId]
    );
    return true;
  }

  async unsaveForumThread(userId, threadId) {
    await pool.query('DELETE FROM forum_saved_items WHERE user_id = ? AND thread_id = ?', [userId, threadId]);
    return true;
  }

  async getSavedForumThreads(userId) {
    const [rows] = await pool.query(
      `
      SELECT s.id AS saved_id, s.created_at AS saved_at,
             t.id AS thread_id, t.title, t.module_id, t.created_by, t.status,
             m.modulo
      FROM forum_saved_items s
      JOIN forum_threads t ON t.id = s.thread_id
      JOIN modules m ON m.id = t.module_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      `,
      [userId]
    );
    return rows;
  }

  async getMyModules(userId, role, email) {
    if (role === 'monitor') {
      const [rows] = await pool.query(
        `
        SELECT m.*
        FROM modules m
        WHERE m.monitorId = ?
        ORDER BY m.modulo
        `,
        [userId]
      );
      return rows;
    }

    const [rows] = await pool.query(
      `
      SELECT m.*, r.id AS registration_id, r.registeredAt, 'active' AS registration_status
      FROM registrations r
      JOIN modules m ON m.id = r.monitorId
      WHERE r.studentEmail = ?
      ORDER BY r.registeredAt DESC
      `,
      [email || '']
    );
    return rows;
  }

  async getMyAttendance(userId, userName = null) {
    const [rows] = await pool.query(
      `
      SELECT a.*, m.modulo, m.monitor
      FROM attendance a
      LEFT JOIN modules m ON m.id = a.module_id
      WHERE a.studentName = ?
      ORDER BY a.scan_time DESC, a.id DESC
      `,
      [userName || '']
    );
    return rows;
  }

  async getMyForumHistory(userId) {
    const [rows] = await pool.query(
      `
      SELECT fm.id, fm.message, fm.created_at, fm.role_snapshot,
             ft.id AS thread_id, ft.title AS thread_title,
             m.id AS module_id, m.modulo
      FROM forum_messages fm
      JOIN forum_threads ft ON ft.id = fm.thread_id
      JOIN modules m ON m.id = fm.module_id
      WHERE fm.user_id = ?
      ORDER BY fm.created_at DESC
      LIMIT 100
      `,
      [userId]
    );
    return rows;
  }

  async getMyForumThreads(userId) {
    const [rows] = await pool.query(
      `
      SELECT t.id, t.title, t.module_id, t.status, t.created_at, t.last_message_at, m.modulo
      FROM forum_threads t
      JOIN modules m ON m.id = t.module_id
      WHERE t.created_by = ?
      ORDER BY t.created_at DESC
      `,
      [userId]
    );
    return rows;
  }

  async createNotification({ userId, type, title, body, metadata }) {
    const message = [title, body].filter(Boolean).join(' - ');
    let link = null;
    if (metadata?.forumId) link = `/forums/${metadata.forumId}`;
    if (metadata?.threadId) link = `/mis-monitorias`;
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, NOW())
      `,
      [userId, type, message || title || body || 'Notificacion', link]
    );
  }

  async getUserNotifications(userId) {
    const [rows] = await pool.query(
      `
      SELECT id, user_id, type, message, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId]
    );
    return rows;
  }

  async markNotificationsAsRead(userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    return true;
  }

  async deleteNotification(notificationId, userId) {
    const [result] = await pool.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    return result.affectedRows > 0;
  }

  async markOneNotificationAsRead(notificationId, userId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
    return true;
  }

  async createLunchUsage({ userId, qrCodeId, scannerUserId }) {
    const [result] = await pool.query(
      `
      INSERT INTO lunch_usage (user_id, date, used, qr_code_id, scanner_user_id, created_at)
      VALUES (?, CURDATE(), 1, ?, ?, NOW())
      `,
      [userId, qrCodeId || null, scannerUserId || null]
    );
    return result.insertId;
  }

  async getLunchUsageToday(userId) {
    const [rows] = await pool.query(
      'SELECT id, user_id, date, used, qr_code_id, scanner_user_id, created_at FROM lunch_usage WHERE user_id = ? AND date = CURDATE() LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  async getForumCards(subjectId = null) {
    const params = [];
    let where = '';
    if (subjectId) {
      where = 'WHERE f.subject_id = ?';
      params.push(subjectId);
    }
    const [rows] = await pool.query(
      `
      SELECT
        f.id,
        f.title,
        f.content,
        f.user_id,
        f.subject_id,
        f.created_at,
        u.nombre AS author_name,
        u.foto AS author_photo,
        COUNT(fc.id) AS responses_count
      FROM forums f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN forum_comments fc ON fc.forum_id = f.id
      ${where}
      GROUP BY f.id, f.title, f.content, f.user_id, f.subject_id, f.created_at, u.nombre, u.foto
      ORDER BY f.created_at DESC
      `,
      params
    );
    return rows;
  }

  async createForum({ title, content, userId, subjectId }) {
    const [result] = await pool.query(
      `
      INSERT INTO forums (title, content, user_id, subject_id, created_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [title, content, userId, subjectId]
    );
    return result.insertId;
  }

  async getForumById(forumId) {
    const [rows] = await pool.query(
      `
      SELECT
        f.*,
        u.nombre AS author_name,
        u.foto AS author_photo,
        m.modulo AS subject_name
      FROM forums f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN modules m ON m.id = f.subject_id
      WHERE f.id = ?
      LIMIT 1
      `,
      [forumId]
    );
    return rows[0] || null;
  }

  async getForumComments(forumId) {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.forum_id,
        c.user_id,
        c.content,
        c.media_url,
        c.type,
        c.created_at,
        u.nombre AS author_name,
        u.foto AS author_photo
      FROM forum_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.forum_id = ?
      ORDER BY c.created_at ASC
      `,
      [forumId]
    );
    return rows;
  }

  async createForumComment({ forumId, userId, content, mediaUrl, type }) {
    const [result] = await pool.query(
      `
      INSERT INTO forum_comments (forum_id, user_id, content, media_url, type, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [forumId, userId, content, mediaUrl || null, type || 'text']
    );
    return result.insertId;
  }

  async setForumFavorite(userId, forumId) {
    await pool.query(
      'INSERT INTO forum_favorites (user_id, forum_id, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE created_at = NOW()',
      [userId, forumId]
    );
    return true;
  }

  async removeForumFavorite(userId, forumId) {
    await pool.query('DELETE FROM forum_favorites WHERE user_id = ? AND forum_id = ?', [userId, forumId]);
    return true;
  }

  async getStudentStats(user) {
    const [attendanceTotalsRows] = await pool.query(
      `
      SELECT COUNT(*) AS total_assistances
      FROM attendance a
      WHERE a.student_id = ? OR a.studentName = ?
      `,
      [user.id, user.nombre || '']
    );
    const [attendanceHistory] = await pool.query(
      `
      SELECT a.id, a.scan_time, a.date, a.attendance_status, a.studentName, m.id AS module_id, m.modulo
      FROM attendance a
      LEFT JOIN modules m ON m.id = a.module_id
      WHERE a.student_id = ? OR a.studentName = ?
      ORDER BY COALESCE(a.scan_time, a.created_at, a.date) DESC
      LIMIT 120
      `,
      [user.id, user.nombre || '']
    );
    const [lunchTotalsRows] = await pool.query(
      'SELECT COUNT(*) AS total_lunches FROM lunch_usage WHERE user_id = ? AND used = 1',
      [user.id]
    );
    const [lunchHistory] = await pool.query(
      `
      SELECT l.id, l.date, l.used, l.created_at, u.nombre AS delivered_by_name
      FROM lunch_usage l
      LEFT JOIN users u ON u.id = l.scanner_user_id
      WHERE l.user_id = ?
      ORDER BY l.date DESC, l.id DESC
      LIMIT 120
      `,
      [user.id]
    );
    return {
      role: 'estudiante',
      totals: {
        assistances: attendanceTotalsRows[0]?.total_assistances || 0,
        lunches: lunchTotalsRows[0]?.total_lunches || 0
      },
      attendance_history: attendanceHistory,
      lunch_history: lunchHistory
    };
  }

  async getMonitorAcademicStats(user) {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(DISTINCT r.studentEmail) AS total_students,
        COUNT(*) AS total_registrations
      FROM modules m
      LEFT JOIN registrations r ON r.monitorId = m.id
      WHERE m.monitorId = ?
      `,
      [user.id]
    );
    const [bySession] = await pool.query(
      `
      SELECT
        DATE(COALESCE(a.scan_time, a.created_at, a.date)) AS session_date,
        m.id AS module_id,
        m.modulo,
        COUNT(*) AS attendance_count
      FROM attendance a
      JOIN modules m ON m.id = a.module_id
      WHERE m.monitorId = ?
      GROUP BY DATE(COALESCE(a.scan_time, a.created_at, a.date)), m.id, m.modulo
      ORDER BY session_date DESC, m.modulo ASC
      `,
      [user.id]
    );
    const [avgRows] = await pool.query(
      `
      SELECT COALESCE(AVG(session_count), 0) AS average_attendance
      FROM (
        SELECT COUNT(*) AS session_count
        FROM attendance a
        JOIN modules m ON m.id = a.module_id
        WHERE m.monitorId = ?
        GROUP BY DATE(COALESCE(a.scan_time, a.created_at, a.date)), m.id
      ) x
      `,
      [user.id]
    );
    const [activeStudents] = await pool.query(
      `
      SELECT
        COALESCE(a.student_id, 0) AS student_id,
        a.studentName AS student_name,
        COUNT(*) AS attendance_count
      FROM attendance a
      JOIN modules m ON m.id = a.module_id
      WHERE m.monitorId = ?
      GROUP BY COALESCE(a.student_id, 0), a.studentName
      ORDER BY attendance_count DESC, student_name ASC
      LIMIT 10
      `,
      [user.id]
    );
    return {
      role: 'monitor_academico',
      totals: totalsRows[0] || { total_students: 0, total_registrations: 0 },
      assistances_by_session: bySession,
      average_attendance: Number(avgRows[0]?.average_attendance || 0),
      most_active_students: activeStudents
    };
  }

  async getMonitorAdminStats(user) {
    const [totalsRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_lunches_delivered,
        COUNT(DISTINCT user_id) AS total_students_served
      FROM lunch_usage
      WHERE scanner_user_id = ?
      `,
      [user.id]
    );
    const [byDay] = await pool.query(
      `
      SELECT date, COUNT(*) AS lunches_count
      FROM lunch_usage
      WHERE scanner_user_id = ?
      GROUP BY date
      ORDER BY date DESC
      `,
      [user.id]
    );
    const [students] = await pool.query(
      `
      SELECT
        u.id AS student_id,
        u.nombre AS student_name,
        COUNT(*) AS lunches_count
      FROM lunch_usage l
      JOIN users u ON u.id = l.user_id
      WHERE l.scanner_user_id = ?
      GROUP BY u.id, u.nombre
      ORDER BY lunches_count DESC, u.nombre ASC
      `,
      [user.id]
    );
    return {
      role: 'monitor_administrativo',
      totals: totalsRows[0] || { total_lunches_delivered: 0, total_students_served: 0 },
      lunches_by_day: byDay,
      students
    };
  }

  async getAdminStats() {
    const [totalRows] = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM users WHERE role IN ('student','estudiante')) AS total_students,
        (SELECT COUNT(*) FROM users WHERE role IN ('monitor','monitor_academico','monitor_administrativo')) AS total_monitors,
        (SELECT COUNT(*) FROM attendance) AS total_assistances,
        (SELECT COUNT(*) FROM lunch_usage WHERE used = 1) AS total_lunches
      `
    );
    const [attendanceAvgRows] = await pool.query(
      `
      SELECT COALESCE(AVG(day_count), 0) AS avg_assistances_per_day
      FROM (
        SELECT DATE(COALESCE(scan_time, created_at, date)) AS d, COUNT(*) AS day_count
        FROM attendance
        GROUP BY DATE(COALESCE(scan_time, created_at, date))
      ) t
      `
    );
    const [lunchAvgRows] = await pool.query(
      `
      SELECT COALESCE(AVG(day_count), 0) AS avg_lunches_per_day
      FROM (
        SELECT date AS d, COUNT(*) AS day_count
        FROM lunch_usage
        GROUP BY date
      ) t
      `
    );
    return {
      role: 'admin',
      totals: totalRows[0] || { total_students: 0, total_monitors: 0, total_assistances: 0, total_lunches: 0 },
      averages: {
        assistances_per_day: Number(attendanceAvgRows[0]?.avg_assistances_per_day || 0),
        lunches_per_day: Number(lunchAvgRows[0]?.avg_lunches_per_day || 0)
      }
    };
  }

  async getGlobalStatsByRole(user) {
    if (['student', 'estudiante'].includes(user.role)) {
      return this.getStudentStats(user);
    }
    if (['monitor', 'monitor_academico'].includes(user.role)) {
      return this.getMonitorAcademicStats(user);
    }
    if (user.role === 'monitor_administrativo') {
      return this.getMonitorAdminStats(user);
    }
    if (['admin', 'dev'].includes(user.role)) {
      return this.getAdminStats();
    }
    return true;
  }
}

export { hashToken };
export default new EngagementRepositoryMySQL();
