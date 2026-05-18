// ─────────────────────────────────────────────────────────────────────────────
// DATABASE MIGRATIONS - Cambios estructurales post-schema
// Cada migración es idempotente: se puede ejecutar N veces sin romper nada.
// Los errores de "columna ya existe" (errno 1060) y "key duplicada" (1061)
// se silencian deliberadamente.
// ─────────────────────────────────────────────────────────────────────────────
import pool from '../utils/mysql.helper.js';

// Códigos de error MySQL que indican "ya existe" (seguros de ignorar)
const SAFE_ERRORS = [1060, 1061, 1068, 1050, 1091];

const safeQuery = async (sql, label) => {
  try {
    await pool.query(sql);
  } catch (error) {
    if (!SAFE_ERRORS.includes(error?.errno)) {
      console.warn(`[migrate] ⚠ ${label}:`, error.message);
    }
  }
};

const migrations = async () => {
  // ─── Role normalization ────────────────────────────────────────────────────
  // Normalize old role names to current enum values
  await safeQuery(
    `UPDATE users SET role = 'student' WHERE role IN ('estudiante', 'STUDENT')`,
    'Normalize student role'
  );
  await safeQuery(
    `UPDATE users SET role = 'monitor_academico' WHERE role IN ('monitor', 'MONITOR', 'MONITOR_ACADEMICO')`,
    'Normalize monitor_academico role'
  );
  await safeQuery(
    `UPDATE users SET role = 'monitor_administrativo' WHERE role IN ('administrativo', 'ADMINISTRATIVO', 'MONITOR_ADMINISTRATIVO')`,
    'Normalize monitor_administrativo role'
  );

  // ─── Data sync (legacy compatibility) ──────────────────────────────────────
  // Backfill module_id from monitorId for old registration records
  await safeQuery(
    `UPDATE registrations SET module_id = monitorId WHERE module_id IS NULL AND monitorId IS NOT NULL`,
    'Backfill registrations.module_id'
  );
  // Backfill modulo_id from subject_id for old forum records
  await safeQuery(
    `UPDATE forums SET modulo_id = subject_id WHERE modulo_id IS NULL AND subject_id IS NOT NULL`,
    'Backfill forums.modulo_id'
  );

  console.log('[migrate] ✅ Migrations completed.');
};

export const runMigrations = migrations;
export default migrations;
