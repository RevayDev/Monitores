// ─────────────────────────────────────────────────────────────────────────────
// DATABASE SCHEMA - Definición completa de tablas
// Este archivo contiene EXCLUSIVAMENTE sentencias CREATE TABLE IF NOT EXISTS.
// NO contiene ALTER TABLE, INSERT, UPDATE ni migraciones de ningún tipo.
// Ejecutado en cada inicio del servidor. Idempotente por diseño.
// ─────────────────────────────────────────────────────────────────────────────
import pool from '../utils/mysql.helper.js';

const tables = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Usuarios y Módulos
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(180) NOT NULL,
    username VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','monitor_academico','monitor_administrativo','admin','dev') NOT NULL DEFAULT 'student',
    sede VARCHAR(120) NULL,
    cuatrimestre VARCHAR(120) NULL,
    foto VARCHAR(255) NULL,
    restrictions JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_principal TINYINT(1) NOT NULL DEFAULT 0,
    root_attempts INT NOT NULL DEFAULT 0,
    root_lockout_phase INT NOT NULL DEFAULT 0,
    root_lockout_until DATETIME NULL,
    tipo_monitor VARCHAR(50) NULL,
    tipo_soporte VARCHAR(50) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username)
  )`,

  `CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT NULL,
    monitor VARCHAR(180) NULL,
    monitorEmail VARCHAR(180) NULL,
    modulo VARCHAR(180) NOT NULL,
    cuatrimestre VARCHAR(120) NULL,
    modalidad VARCHAR(120) NULL,
    horario VARCHAR(180) NULL,
    salon VARCHAR(120) NULL,
    sede VARCHAR(120) NULL,
    descripcion TEXT NULL,
    whatsapp VARCHAR(120) NULL,
    teams VARCHAR(255) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRO Y ASISTENCIA
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentName VARCHAR(180) NOT NULL,
    studentEmail VARCHAR(180) NOT NULL,
    modulo VARCHAR(180) NULL,
    monitorId INT NOT NULL,
    module_id INT NULL,
    student_id INT NULL,
    status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active',
    registeredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT NULL,
    studentName VARCHAR(180) NULL,
    date DATE NULL,
    rating TINYINT NULL,
    comment TEXT NULL,
    student_id INT NULL,
    module_id INT NULL,
    qr_code_id BIGINT NULL,
    scan_time DATETIME NULL,
    attendance_status ENUM('present','rejected_duplicate','rejected_expired','rejected_out_window') NOT NULL DEFAULT 'present',
    modalidad VARCHAR(100) NULL,
    estado VARCHAR(100) NULL
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
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_academic_attendance_session (session_id),
    INDEX idx_academic_attendance_student (student_id)
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // QR SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // FORUM SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

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
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
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

  `CREATE TABLE IF NOT EXISTS forum_saved_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    thread_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_saved (user_id, thread_id)
  )`,

  `CREATE TABLE IF NOT EXISTS forum_presence (
    forum_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    is_typing TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (forum_id, user_id),
    INDEX idx_forum_presence_expires (expires_at)
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

  `CREATE TABLE IF NOT EXISTS forum_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('thread','reply') NOT NULL,
    target_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reported_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
    resolution_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolved_by INT NULL
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK & COMPLAINTS
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS module_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    student_id INT NOT NULL,
    rating TINYINT NULL,
    comment TEXT NOT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_module_feedback (module_id, student_id),
    INDEX idx_feedback_module (module_id),
    INDEX idx_feedback_student (student_id)
  )`,

  `CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT NULL,
    studentName VARCHAR(180) NULL,
    studentEmail VARCHAR(180) NULL,
    reason VARCHAR(255) NULL,
    details TEXT NULL,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(100) NULL,
    reported_id INT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requester_user_id INT NULL,
    requester_name VARCHAR(180) NOT NULL,
    requester_email VARCHAR(180) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'tecnico',
    subject VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('open','in_progress','answered','closed') NOT NULL DEFAULT 'open',
    assigned_to INT NULL,
    response_message TEXT NULL,
    responded_by INT NULL,
    responded_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_support_status (status, created_at),
    INDEX idx_support_email (requester_email),
    INDEX idx_support_requester (requester_user_id)
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(60) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LUNCH / COMEDOR
  // ═══════════════════════════════════════════════════════════════════════════

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

  `CREATE TABLE IF NOT EXISTS meal_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    date DATE NULL,
    status VARCHAR(50) NULL,
    scanned_at DATETIME NULL
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // Q&A LEGACY
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    module_id INT NULL,
    title VARCHAR(255) NULL,
    content TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NULL,
    user_id INT NULL,
    content TEXT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION & LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(120) NOT NULL,
    config_value LONGTEXT NULL,
    UNIQUE KEY uq_settings_key (config_key)
  )`,

  `CREATE TABLE IF NOT EXISTS static_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_key VARCHAR(80) NOT NULL,
    item_value VARCHAR(180) NOT NULL,
    UNIQUE KEY uq_static_data (data_key, item_value)
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
  )`
];

export const createTables = async () => {
  for (const sql of tables) {
    try {
      await pool.query(sql);
    } catch (error) {
      // 1050 = Table already exists (safe to ignore)
      if (error?.errno !== 1050) {
        console.warn('[schema] Table creation warning:', error.message);
      }
    }
  }
  console.log('[schema] ✅ All tables verified.');
};

export default createTables;
