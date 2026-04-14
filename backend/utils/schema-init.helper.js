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
    modulo_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_forums_subject (subject_id),
    INDEX idx_forums_modulo (modulo_id),
    INDEX idx_forums_user (user_id),
    INDEX idx_forums_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS replies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forum_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_replies_forum (forum_id, created_at),
    INDEX idx_replies_user (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forum_id BIGINT NULL,
    reply_id BIGINT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_type ENUM('image','file','link') NOT NULL DEFAULT 'file',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attach_forum (forum_id),
    INDEX idx_attach_reply (reply_id)
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
  `CREATE TABLE IF NOT EXISTS academic_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    monitor_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    rating_average DECIMAL(4,2) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_academic_sessions_module (module_id, start_time),
    INDEX idx_academic_sessions_monitor (monitor_id, start_time)
  )`,
  `CREATE TABLE IF NOT EXISTS academic_session_attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    student_id INT NULL,
    student_name VARCHAR(180) NULL,
    status ENUM('PRESENTE','AUSENTE','EXCUSA') NOT NULL,
    excuse_reason VARCHAR(180) NULL,
    excuse_description TEXT NULL,
    rating INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_academic_attendance_session (session_id),
    INDEX idx_academic_attendance_student (student_id)
  )`,
  `CREATE TABLE IF NOT EXISTS forum_dedup_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type ENUM('create_post','create_reply') NOT NULL,
    content_hash CHAR(64) NOT NULL,
    resource_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_forum_dedup (user_id, action_type, content_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    module_id INT,
    title VARCHAR(255),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT,
    user_id INT,
    content TEXT,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS meal_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    date DATE,
    status VARCHAR(50),
    scanned_at DATETIME
  )`,
  `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS module_id INT NULL`,
  `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS student_id INT NULL`,
  `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active'`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_id INT NULL`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS module_id INT NULL`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS qr_code_id BIGINT NULL`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS scan_time DATETIME NULL`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_status ENUM('present','rejected_duplicate','rejected_expired','rejected_out_window') NOT NULL DEFAULT 'present'`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS modalidad VARCHAR(100)`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS estado VARCHAR(100)`,
  `ALTER TABLE forums ADD COLUMN IF NOT EXISTS modulo_id INT NULL`,
  `ALTER TABLE users MODIFY COLUMN role ENUM('student','estudiante','monitor','monitor_academico','monitor_administrativo','admin','dev') NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_monitor VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_soporte VARCHAR(50)`,
  `ALTER TABLE forum_messages MODIFY COLUMN role_snapshot VARCHAR(40) NOT NULL`,
  `ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uq_users_email (email)`,
  `ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uq_users_username (username)`,
  `ALTER TABLE replies ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS tipo VARCHAR(100)`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reported_id INT`
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
    await pool.query('UPDATE forums SET modulo_id = subject_id WHERE modulo_id IS NULL');
  } catch (error) {
    console.warn('Forum sync warning:', error.message);
  }

  try {
    await pool.query(
      `
      INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, is_principal, createdAt)
      SELECT 'Admin Administrativo Demo', 'admin_comedor', 'admin_comedor@demo.local', '123456', 'monitor_administrativo', 'Sede Centro', 'N/A', 0, NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE username = 'admin_comedor'
      )
      `
    );
  } catch (error) {
    console.warn('Administrative seed warning:', error.message);
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
