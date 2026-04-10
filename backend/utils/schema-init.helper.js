import pool from './mysql.helper.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS qr_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_value VARCHAR(255) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    code_date DATE NOT NULL,
    valid_from DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    status ENUM('active','used','expired','revoked') NOT NULL DEFAULT 'active',
    use_count INT NOT NULL DEFAULT 0,
    last_used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_user_date (user_id, code_date)
  )`,
  `CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    qr_code_id BIGINT NULL,
    token_hash CHAR(64) NULL,
    scanner_user_id INT NOT NULL,
    student_user_id INT NULL,
    module_id INT NOT NULL,
    module_session_id BIGINT NOT NULL DEFAULT 0,
    scan_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result ENUM('accepted','invalid','expired','out_window','duplicate','rate_limited') NOT NULL,
    reason VARCHAR(120) NULL,
    client_ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL
  )`,
  `CREATE TABLE IF NOT EXISTS forum_threads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    last_message_at DATETIME NULL
  )`,
  `CREATE TABLE IF NOT EXISTS forum_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    module_id INT NOT NULL,
    user_id INT NOT NULL,
    role_snapshot VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('normal','system') NOT NULL DEFAULT 'normal',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lunch_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 1,
    qr_code_id BIGINT NULL,
    scanner_user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lunch_user_date (user_id, date),
    INDEX idx_lunch_date (date),
    INDEX idx_lunch_scanner (scanner_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(60) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS forums (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    content LONGTEXT NOT NULL,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_forums_subject (subject_id),
    INDEX idx_forums_user (user_id),
    INDEX idx_forums_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS forum_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forum_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    media_url VARCHAR(255) NULL,
    type ENUM('text','image','video','file','link') NOT NULL DEFAULT 'text',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forum_comments_forum (forum_id),
    INDEX idx_forum_comments_user (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS forum_favorites (
    user_id INT NOT NULL,
    forum_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, forum_id),
    INDEX idx_forum_favorites_forum (forum_id)
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT NULL,
    metadata JSON NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS forum_saved_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    thread_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_saved (user_id, thread_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(60) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NULL,
    metadata JSON NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE registrations ADD COLUMN module_id INT NULL`,
  `ALTER TABLE registrations ADD COLUMN student_id INT NULL`,
  `ALTER TABLE registrations ADD COLUMN status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active'`,
  `ALTER TABLE attendance ADD COLUMN student_id INT NULL`,
  `ALTER TABLE attendance ADD COLUMN module_id INT NULL`,
  `ALTER TABLE attendance ADD COLUMN qr_code_id BIGINT NULL`,
  `ALTER TABLE attendance ADD COLUMN scan_time DATETIME NULL`,
  `ALTER TABLE attendance ADD COLUMN attendance_status ENUM('present','rejected_duplicate','rejected_expired','rejected_out_window') NOT NULL DEFAULT 'present'`,
  `ALTER TABLE forum_messages MODIFY COLUMN role_snapshot VARCHAR(40) NOT NULL`
];

export const ensureSchema = async () => {
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (error) {
      // Ignore duplicate column / already exists errors to keep startup idempotent
      if (![1060, 1061, 1068, 1091].includes(error?.errno)) {
        // 1050 table exists can also happen depending on engine
        if (error?.errno !== 1050) {
          console.warn('Schema init warning:', error.message);
        }
      }
    }
  }

  try {
    await pool.query('UPDATE registrations SET module_id = monitorId WHERE module_id IS NULL');
  } catch (error) {
    console.warn('Schema sync warning:', error.message);
  }

  try {
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
      SELECT user_id, type, COALESCE(title, body, ''), NULL, is_read, created_at
      FROM user_notifications
      WHERE user_id IS NOT NULL
      `
    );
  } catch (error) {
    if (![1062, 1146].includes(error?.errno)) {
      console.warn('Notification migration warning:', error.message);
    }
  }
};

export default ensureSchema;
