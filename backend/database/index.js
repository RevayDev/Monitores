// ─────────────────────────────────────────────────────────────────────────────
// DATABASE INITIALIZER - Punto de entrada único para la inicialización de BD
// Orquesta: 1) Schema → 2) Migrations → 3) Seeds
// ─────────────────────────────────────────────────────────────────────────────
import { createTables } from './schema.js';
import { runMigrations } from './migrations.js';
import { runSeeds } from './seeds.js';
import { ensureDatabaseExists } from '../utils/mysql.helper.js';

export const initializeDatabase = async () => {
  console.log('[db] Initializing database...');

  // Step 1: Ensure the database itself exists
  await ensureDatabaseExists();

  // Step 2: Create all tables (idempotent - CREATE TABLE IF NOT EXISTS)
  await createTables();

  // Step 3: Run data migrations (role normalization, backfills)
  await runMigrations();

  // Step 4: Insert seed data (static_data, default users)
  await runSeeds();

  console.log('[db] ✅ Database initialization complete.');
};

export default initializeDatabase;
