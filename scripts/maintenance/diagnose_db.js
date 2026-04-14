import pool from '../../backend/utils/mysql.helper.js';

async function diagnose() {
  console.log('--- Database Diagnosis ---');
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables found:', tables.map(t => Object.values(t)[0]));

    const counts = {};
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      const [rows] = await pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      counts[tableName] = rows[0].count;
    }
    console.log('Record counts:', counts);

    if (counts['modules'] === 0) {
      console.log('WARNING: The modules table is EMPTY. This is why "No se encontraron monitorías" is displayed.');
    }
    
    // Check for some sample data
    if (counts['modules'] > 0) {
      const [modules] = await pool.query('SELECT * FROM modules LIMIT 1');
      console.log('Sample module:', modules[0]);
    }

  } catch (err) {
    console.error('DATABASE ERROR:', err.message);
  } finally {
    process.exit();
  }
}

diagnose();
