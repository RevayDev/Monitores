import pool from './utils/mysql.helper.js';

async function debug() {
  try {
    const [users] = await pool.query('SELECT id, nombre, email, role FROM users');
    console.log('--- USERS ---');
    console.table(users);

    const [regs] = await pool.query('SELECT id, studentName, studentEmail, monitorId FROM registrations');
    console.log('--- REGISTRATIONS ---');
    console.table(regs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
