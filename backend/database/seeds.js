// ─────────────────────────────────────────────────────────────────────────────
// DATABASE SEEDS - Datos iniciales requeridos por la plataforma
// Ejecutado en cada inicio. Todas las inserciones usan INSERT IGNORE o
// WHERE NOT EXISTS para evitar duplicados.
// ─────────────────────────────────────────────────────────────────────────────
import pool from '../utils/mysql.helper.js';

const seedStatements = [
  // ─── Sedes ─────────────────────────────────────────────────────────────────
  `INSERT IGNORE INTO static_data (data_key, item_value) VALUES
    ('sedes', 'Sede Centro'),
    ('sedes', 'Sede Norte'),
    ('sedes', 'Sede Sur'),
    ('sedes', 'Sede Virtual')`,

  // ─── Cuatrimestres ─────────────────────────────────────────────────────────
  `INSERT IGNORE INTO static_data (data_key, item_value) VALUES
    ('cuatrimestres', '1° Cuatrimestre'),
    ('cuatrimestres', '2° Cuatrimestre'),
    ('cuatrimestres', '3° Cuatrimestre'),
    ('cuatrimestres', '4° Cuatrimestre')`,

  // ─── Modalidades ───────────────────────────────────────────────────────────
  `INSERT IGNORE INTO static_data (data_key, item_value) VALUES
    ('modalidades', 'Presencial'),
    ('modalidades', 'Virtual'),
    ('modalidades', 'Híbrido')`,

  // ─── Programas ─────────────────────────────────────────────────────────────
  `INSERT IGNORE INTO static_data (data_key, item_value) VALUES
    ('programas', 'Programación'),
    ('programas', 'Matemáticas'),
    ('programas', 'Bases de Datos'),
    ('programas', 'Redes')`
];

const seeds = async () => {
  for (const sql of seedStatements) {
    try {
      await pool.query(sql);
    } catch (error) {
      // 1062 = Duplicate entry (safe for seeds)
      if (error?.errno !== 1062) {
        console.warn('[seeds] ⚠ Seed warning:', error.message);
      }
    }
  }

  // ─── Default admin user (comedor) ──────────────────────────────────────────
  try {
    await pool.query(`
      INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, is_principal, createdAt)
      SELECT 'Admin Administrativo Demo', 'admin_comedor', 'admin_comedor@demo.local', '123456', 'monitor_administrativo', 'Sede Centro', 'N/A', 0, NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE username = 'admin_comedor'
      )
    `);
  } catch (error) {
    console.warn('[seeds] ⚠ Admin seed warning:', error.message);
  }

  console.log('[seeds] ✅ Seed data verified.');
};

export const runSeeds = seeds;
export default seeds;
