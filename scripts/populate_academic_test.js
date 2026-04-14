import pool from '../backend/utils/mysql.helper.js';

async function populateTest() {
  console.log('--- Populating Academic Test Data ---');
  try {
    // 1. Create More Monitors
    const monitors = [
      { nombre: 'Elena Monitora', username: 'elena_m', email: 'elena@monitores.com', password: '123', role: 'monitor' },
      { nombre: 'Marcos Monitor', username: 'marcos_m', email: 'marcos@monitores.com', password: '123', role: 'monitor' }
    ];

    for (const m of monitors) {
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [m.nombre, m.username, m.email, m.password, m.role, true]
      );
    }
    console.log('Monitors added.');

    // Get monitor IDs
    const [monitorRows] = await pool.query('SELECT id, nombre, email FROM users WHERE role = "monitor"');
    
    // 2. Create Modules for them
    const modules = [
      { 
        monitorRow: monitorRows.find(r => r.nombre === 'Elena Monitora'), 
        modulo: 'Matemáticas II', 
        cuatrimestre: '2° Cuatrimestre', 
        modalidad: 'Presencial', 
        horario: 'Lunes, Miércoles 14:00 - 16:00',
        sede: 'Sede plaza la paz',
        descripcion: 'Refuerzo de cálculo integral y álgebra lineal.'
      },
      { 
        monitorRow: monitorRows.find(r => r.nombre === 'Marcos Monitor'), 
        modulo: 'Programación Web', 
        cuatrimestre: '3° Cuatrimestre', 
        modalidad: 'Virtual', 
        horario: 'Viernes 18:00 - 20:00',
        sede: 'sede soledad',
        descripcion: 'Aprende React y Node.js desde cero.'
      }
    ];

    for (const mod of modules) {
      if (!mod.monitorRow) continue;
      await pool.query(
        'INSERT INTO modules (monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, sede, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [mod.monitorRow.id, mod.monitorRow.nombre, mod.monitorRow.email, mod.modulo, mod.cuatrimestre, mod.modalidad, mod.horario, mod.sede, mod.descripcion]
      );
    }
    console.log('Modules added.');

    // 3. Create Students and Register them
    const students = [
      { nombre: 'Carlos Estudiante', username: 'carlos_e', email: 'carlos@demo.com', password: '123', role: 'student' },
      { nombre: 'Maria Estudiante', username: 'maria_e', email: 'maria@demo.com', password: '123', role: 'student' }
    ];

    for (const s of students) {
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [s.nombre, s.username, s.email, s.password, s.role, true]
      );
    }

    // Get module IDs
    const [moduleRows] = await pool.query('SELECT id, modulo, monitorId FROM modules');
    const [studentRows] = await pool.query('SELECT id, nombre, email FROM users WHERE role = "student"');

    for (const stud of studentRows) {
        // Register each student in a random module
        const mod = moduleRows[Math.floor(Math.random() * moduleRows.length)];
        await pool.query(
            'INSERT INTO registrations (studentName, studentEmail, modulo, monitorId, student_id, module_id) VALUES (?, ?, ?, ?, ?, ?)',
            [stud.nombre, stud.email, mod.modulo, mod.monitorId, stud.id, mod.id]
        );
    }
    console.log('Registrations added.');

    console.log('--- Test Data Population Finished Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Population failed:', error);
    process.exit(1);
  }
}

populateTest();
