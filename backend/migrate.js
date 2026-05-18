import pool from './utils/mysql.helper.js';

async function migrate() {
  try {
    // Add resolution_note to forum_reports
    await pool.query("ALTER TABLE forum_reports ADD COLUMN resolution_note TEXT NULL AFTER resolved_by").catch(e => { if(e.errno !== 1060) throw e; });
    console.log("✅ resolution_note column added to forum_reports");

    // Add root_attempts and root_lockout_until to users
    await pool.query("ALTER TABLE users ADD COLUMN root_attempts INT DEFAULT 0").catch(e => { if(e.errno !== 1060) throw e; });
    await pool.query("ALTER TABLE users ADD COLUMN root_lockout_until DATETIME NULL").catch(e => { if(e.errno !== 1060) throw e; });
    await pool.query("ALTER TABLE users ADD COLUMN root_lockout_phase INT DEFAULT 0").catch(e => { if(e.errno !== 1060) throw e; });
    console.log("✅ root lockout columns added to users");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    process.exit();
  }
}
migrate();
