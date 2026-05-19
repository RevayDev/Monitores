import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'monitores_db',
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0
});

const tables = ['attendance', 'lunch_usage', 'qr_scan_logs', 'qr_codes'];

(async () => {
  try {
    for (const table of tables) {
      await pool.query(`DELETE FROM ${table}`);
      await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
    console.log('[db:reset] OK');
    process.exit(0);
  } catch (error) {
    console.error('[db:reset] ERROR:', error?.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
