import pool from './utils/mysql.helper.js';

async function check() {
  try {
    const [users] = await pool.query("DESCRIBE users");
    const [modules] = await pool.query("DESCRIBE modules");
    console.log("Users Columns:", users.map(c => c.Field));
    console.log("Modules Columns:", modules.map(c => c.Field));
    process.exit(0);
  } catch (error) {
    console.error("Check failed:", error);
    process.exit(1);
  }
}

check();
