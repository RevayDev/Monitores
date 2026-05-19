// ─────────────────────────────────────────────────────────────────────────────
// DATABASE SEEDS - Datos iniciales requeridos por la plataforma
// Ejecutado en cada inicio. Todas las inserciones usan INSERT IGNORE o
// WHERE NOT EXISTS para evitar duplicados.
// ─────────────────────────────────────────────────────────────────────────────
import pool from '../utils/mysql.helper.js';
import bcrypt from 'bcryptjs';

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

  // ─── Default users (predefined in the request) ──────────────────────────────
  try {
    const hashed123 = await bcrypt.hash('123', 10);
    const hashedDev = await bcrypt.hash('dev123', 10);

    const defaultUsers = [
      // Dev
      {
        nombre: 'Dev Principal',
        username: 'root_dev',
        email: 'dev@monitores.com',
        password: hashedDev,
        role: 'dev',
        sede: 'Sede Virtual',
        cuatrimestre: 'N/A',
        is_principal: 1
      },
      // Estudiantes
      {
        nombre: 'Estudiante 1',
        username: 'student_1',
        email: 'student_1@demo.local',
        password: hashed123,
        role: 'student',
        sede: 'Sede Centro',
        cuatrimestre: '1° Cuatrimestre',
        is_principal: 0
      },
      {
        nombre: 'Estudiante 2',
        username: 'student_2',
        email: 'student_2@demo.local',
        password: hashed123,
        role: 'student',
        sede: 'Sede Centro',
        cuatrimestre: '1° Cuatrimestre',
        is_principal: 0
      },
      {
        nombre: 'Estudiante 3',
        username: 'student_3',
        email: 'student_3@demo.local',
        password: hashed123,
        role: 'student',
        sede: 'Sede Centro',
        cuatrimestre: '1° Cuatrimestre',
        is_principal: 0
      },
      // Monitores
      {
        nombre: 'Monitor Academico',
        username: 'monitor_ac',
        email: 'monitor_ac@demo.local',
        password: hashed123,
        role: 'monitor_academico',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 0
      },
      {
        nombre: 'Monitor Administra',
        username: 'monitor_ad',
        email: 'monitor_ad@demo.local',
        password: hashed123,
        role: 'monitor_administrativo',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 0
      },
      {
        nombre: 'Juan Perez',
        username: 'juanperez',
        email: 'juanperez@demo.local',
        password: hashed123,
        role: 'monitor_academico',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 0
      },
      // Administradores
      {
        nombre: 'Admin Principal',
        username: 'root_admin',
        email: 'root_admin@demo.local',
        password: hashed123,
        role: 'admin',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 1
      },
      {
        nombre: 'Andrea Gonzalez',
        username: 'andreagon',
        email: 'andreagon@demo.local',
        password: hashed123,
        role: 'admin',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 0
      },
      {
        nombre: 'Andres Antonio',
        username: 'andresanto',
        email: 'andresanto@demo.local',
        password: hashed123,
        role: 'admin',
        sede: 'Sede Centro',
        cuatrimestre: 'N/A',
        is_principal: 0
      }
    ];

    for (const u of defaultUsers) {
      await pool.query(`
        INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, is_principal, createdAt)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = ? OR email = ?
        )
      `, [u.nombre, u.username, u.email, u.password, u.role, u.sede, u.cuatrimestre, u.is_principal, u.username, u.email]);
    }
  } catch (error) {
    console.warn('[seeds] ⚠ Default users seed warning:', error.message);
  }

  console.log('[seeds] ✅ Seed data verified.');
};

export const runSeeds = seeds;
export default seeds;
