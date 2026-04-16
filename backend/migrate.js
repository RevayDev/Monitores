import pool from './utils/mysql.helper.js';

async function migrate() {
  try {
    // Add resolution_note to forum_reports
    await pool.query("ALTER TABLE forum_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT NULL AFTER resolved_by");
    console.log("✅ resolution_note column added to forum_reports");

    // Add root_attempts and root_lockout_until to users
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS root_attempts INT DEFAULT 0");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS root_lockout_until DATETIME NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS root_lockout_phase INT DEFAULT 0");
    console.log("✅ root lockout columns added to users");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    process.exit();
  }
}
migrate();
