USE monitores_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'America/Bogota';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS module_id INT NULL;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS student_id INT NULL;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active';

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS dropped_at DATETIME NULL;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP;

UPDATE registrations
SET module_id = monitorId
WHERE module_id IS NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS student_id INT NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS module_id INT NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS qr_code_id BIGINT NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS scan_time DATETIME NULL;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS attendance_status ENUM('present','rejected_duplicate','rejected_expired','rejected_out_window') NOT NULL DEFAULT 'present';

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS qr_codes (
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
  INDEX idx_user_date (user_id, code_date),
  INDEX idx_validity (valid_from, expires_at),
  INDEX idx_user_status (user_id, status)
);

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS token_value VARCHAR(255) NOT NULL;

CREATE TABLE IF NOT EXISTS qr_scan_logs (
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
  user_agent VARCHAR(255) NULL,
  INDEX idx_scan_session (module_session_id, scan_time),
  INDEX idx_scan_student (student_user_id, scan_time),
  INDEX idx_scan_result (result, scan_time)
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  last_message_at DATETIME NULL,
  INDEX idx_forum_module (module_id, is_pinned, last_message_at)
);

CREATE TABLE IF NOT EXISTS forum_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  thread_id BIGINT NOT NULL,
  module_id INT NOT NULL,
  user_id INT NOT NULL,
  role_snapshot ENUM('student','monitor','admin','dev') NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('normal','system') NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME NULL,
  INDEX idx_thread_time (thread_id, created_at),
  INDEX idx_module_time (module_id, created_at)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT NULL,
  metadata JSON NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_time (action, created_at),
  INDEX idx_user_time (user_id, created_at)
);
