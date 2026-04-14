import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'monitores_db',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

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
