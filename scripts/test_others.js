import pool from '../backend/utils/mysql.helper.js';

async function testOtherQueries() {
  try {
    console.log('Testing Maintenance...');
    const [rows1] = await pool.query('SELECT config_value FROM settings WHERE config_key = "maintenance"');
    console.log('Maintenance:', rows1);

    console.log('Testing Registrations...');
    const query = `
      SELECT r.*, 
             r.monitorId AS moduleId,
             m.monitorId AS monitorUserId,
      m.monitor, m.monitorEmail, m.sede, m.horario, m.cuatrimestre, m.modalidad, m.whatsapp, m.teams, m.descripcion,
             u.role AS monitorRole, u.foto AS monitorFoto
      FROM registrations r
      LEFT JOIN modules m ON r.monitorId = m.id
      LEFT JOIN users u ON m.monitorId = u.id
    `;
    const [rows2] = await pool.query(query);
    console.log('Registrations count:', rows2.length);
    console.table(rows2);

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testOtherQueries();
