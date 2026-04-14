import pool from '../../backend/utils/mysql.helper.js';

async function test(studentId) {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [studentId]);
    if (users.length === 0) {
      console.log('User not found');
      return;
    }
    const student = users[0];
    const email = student.email.trim().toLowerCase();
    console.log(`Checking registrations for ID ${studentId} with email '${email}'`);

    const [regs] = await pool.query(
      'SELECT r.* FROM registrations r WHERE LOWER(TRIM(r.studentEmail)) = LOWER(TRIM(?))',
      [email]
    );
    console.log(`Found ${regs.length} registrations:`);
    console.table(regs);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test(1); // Try with ID 1
