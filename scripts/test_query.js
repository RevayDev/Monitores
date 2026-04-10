import pool from '../backend/utils/mysql.helper.js';

async function testQuery() {
  console.log('Starting query...');
  try {
    const query = `
      SELECT m.*, u.role AS monitorRole, u.foto AS monitorFoto, u.createdAt AS monitorCreatedAt
      FROM modules m
      LEFT JOIN users u ON m.monitorId = u.id
    `;
    const [rows] = await pool.query(query);
    console.log('Query finished!');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

testQuery();
