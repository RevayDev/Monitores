import pool from './utils/mysql.helper.js';

async function checkSchema() {
  try {
    const [cols] = await pool.query("DESCRIBE users");
    console.log("USERS COLUMNS:", JSON.stringify(cols, null, 2));
    const [logs] = await pool.query("DESCRIBE activity_logs");
    console.log("ACTIVITY_LOGS COLUMNS:", JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkSchema();
