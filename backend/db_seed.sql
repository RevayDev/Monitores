-- MONITORES - DATABASE SEED SCRIPT
-- Limpia y restablece la estructura y datos esenciales

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Limpieza de tablas existentes (si existen)
DROP TABLE IF EXISTS `user_notifications`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `forum_reports`;
DROP TABLE IF EXISTS `forum_comments`;
DROP TABLE IF EXISTS `forum_saved_items`;
DROP TABLE IF EXISTS `forum_dedup_requests`;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `replies`;
DROP TABLE IF EXISTS `forums`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `academic_session_attendance`;
DROP TABLE IF EXISTS `academic_sessions`;
DROP TABLE IF EXISTS `qr_scan_logs`;
DROP TABLE IF EXISTS `qr_codes`;
DROP TABLE IF EXISTS `lunch_usage`;
DROP TABLE IF EXISTS `meal_logs`;
DROP TABLE IF EXISTS `answers`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `registrations`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. Creación de tabla USERS (Estructura base)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(180) NOT NULL,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `email` VARCHAR(180) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student','estudiante','monitor','monitor_academico','monitor_administrativo','admin','dev') NOT NULL DEFAULT 'estudiante',
  `sede` VARCHAR(100),
  `cuatrimestre` VARCHAR(50),
  `foto` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1,
  `is_principal` TINYINT(1) DEFAULT 0,
  `restrictions` JSON DEFAULT NULL,
  `tipo_monitor` VARCHAR(50) DEFAULT NULL,
  `tipo_soporte` VARCHAR(50) DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Otras tablas críticas (Simplificadas para el seed)
CREATE TABLE `qr_codes` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_value` VARCHAR(255) NOT NULL,
  `token_hash` CHAR(64) NOT NULL UNIQUE,
  `code_date` DATE NOT NULL,
  `valid_from` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `status` ENUM('active','used','expired','revoked') NOT NULL DEFAULT 'active',
  `use_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `modulo` VARCHAR(180) NOT NULL,
  `monitorId` INT NULL,
  `cuatrimestre` VARCHAR(50),
  `modalidad` VARCHAR(100),
  `sede` VARCHAR(100),
  `dias` JSON,
  `horaInicio` TIME,
  `horaFin` TIME,
  `is_active` TINYINT(1) DEFAULT 1
);

CREATE TABLE `forums` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(180) NOT NULL,
  `content LONGTEXT`,
  `user_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `modulo_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `replies` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `forum_id` BIGINT NOT NULL,
  `user_id` INT NOT NULL,
  `content LONGTEXT`,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inserción de Usuarios Principales
-- Passwords: '123' (Nota: El sistema migrará a bcrypt en el primer login si se insertan en texto plano)
-- Pero recomendados insertar el hash de '123' para consistencia: $2a$10$8C7oUfK0mQG8uM2Q1.4z.O37qYwYn8Z.K5u8s.hGzG8s.hGzG8s.
-- Por simplicidad para el usuario, usamos texto plano '123' y que el sistema lo encripte al entrar.

INSERT INTO `users` (`nombre`, `username`, `email`, `password`, `role`, `sede`, `is_active`, `is_principal`) VALUES
('Developer Principal', 'dev', 'dev@monitores.local', '123', 'dev', 'Global', 1, 1),
('Admin Principal', 'admin', 'admin@monitores.local', '123', 'admin', 'Sede Centro', 1, 1);

-- 5. Datos de prueba mínimos
INSERT INTO `users` (`nombre`, `username`, `email`, `password`, `role`, `sede`, `cuatrimestre`) VALUES
('Estudiante de Prueba', 'estudiante', 'estudiante@test.local', '123', 'estudiante', 'Sede Norte', '1er Cuatrimestre'),
('Monitor de Prueba', 'monitor_test', 'monitor@test.local', '123', 'monitor_academico', 'Sede Centro', '3er Cuatrimestre');

INSERT INTO `modules` (`modulo`, `monitorId`, `cuatrimestre`, `modalidad`, `sede`, `dias`, `horaInicio`, `horaFin`) VALUES
('Calculo Diferencial', 4, '1er Cuatrimestre', 'Presencial', 'Sede Centro', '["Lunes", "Miercoles"]', '08:00:00', '10:00:00'),
('Programacion Web', 4, '2do Cuatrimestre', 'Virtual', 'Sede Centro', '["Viernes"]', '18:00:00', '20:00:00');

-- 6. Foros de prueba
INSERT INTO `forums` (`title`, `content`, `user_id`, `subject_id`, `modulo_id`) VALUES
('Bienvenida al Foro', 'Este es el espacio para resolver dudas.', 1, 1, 1);

-- Finalizado
COMMIT;
