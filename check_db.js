import pool from './backend/utils/mysql.helper.js';

async function checkDB() {
  try {
    const [users] = await pool.query('SELECT id, username, role, is_principal FROM users');
    console.log('--- USERS ---');
    console.table(users);

    const [modules] = await pool.query('SELECT id, modulo, monitor FROM modules');
    console.log('--- MODULES ---');
    console.table(modules);

    const [staticData] = await pool.query('SELECT data_key, count(*) as count FROM static_data GROUP BY data_key');
    console.log('--- STATIC DATA ---');
    console.table(staticData);

    process.exit(0);
  } catch (err) {
    console.error('DB Check failed:', err);
    process.exit(1);
  }
}

checkDB();
