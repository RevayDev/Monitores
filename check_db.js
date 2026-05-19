import pool from './backend/utils/mysql.helper.js';

async function check() {
  try {
    const [rows] = await pool.query('SELECT id, modulo, monitor, monitorId FROM modules');
    console.log('--- Modules in DB ---');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
