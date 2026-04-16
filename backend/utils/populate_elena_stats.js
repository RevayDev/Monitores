import pool from 'file:///C:/Users/RevayDev/Desktop/Monitores/backend/utils/mysql.helper.js';

async function populateElenaStats() {
  try {
    const elenaId = 1006;
    const module8 = 8;
    const module10 = 10;
    
    // Add some attendance records to 'attendance' table
    // These should belong to module 8 or 10, which Elena monitors
    const attendanceRecords = [
      [module8, 'Roberto Jimenez', '2026-04-10', 5, 'Excelente sesión', 'present'],
      [module8, 'Estudiante Prueba 1', '2026-04-10', 4, 'Buena sesión', 'present'],
      [module10, 'Ana García', '2026-04-11', 5, 'Muy claro todo', 'present'],
      [module10, 'Juan Pérez', '2026-04-11', 3, 'Regular', 'present']
    ];

    for (const [modId, name, date, rating, comment, status] of attendanceRecords) {
      await pool.query(
        'INSERT INTO attendance (module_id, studentName, date, rating, comment, attendance_status) VALUES (?, ?, ?, ?, ?, ?)',
        [modId, name, date, rating, comment, status]
      );
    }

    console.log('Successfully populated Elena stats demo data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

populateElenaStats();
