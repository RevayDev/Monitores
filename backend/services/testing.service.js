import pool from '../utils/mysql.helper.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

class TestingService {
  async nukeAndRebuild() {
    const tables = [
      'attendance', 'lunch_usage', 'qr_scan_logs', 'qr_codes', 
      'registrations', 'forum_messages', 'forum_threads', 
      'forums', 'replies', 'attachments', 'forum_favorites', 
      'forum_reports', 'notifications', 'activity_logs', 
      'modules', 'users'
    ];

    // Disable FK checks if they exist, to ensure a clean wipe
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
        await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (err) {
        console.error(`Error clearing table ${table}:`, err.message);
      }
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Create Principal Dev
    const devPass = 'dev123'; 
    const hashedDev = await bcrypt.hash(devPass, 10);
    await pool.query(
      'INSERT INTO users (nombre, username, email, password, role, is_active, is_principal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Dev Principal', 'root_dev', 'dev@monitores.com', hashedDev, 'dev', 1, 1]
    );

    // Create Principal Admin
    const adminPass = 'admin123';
    const hashedAdmin = await bcrypt.hash(adminPass, 10);
    await pool.query(
      'INSERT INTO users (nombre, username, email, password, role, is_active, is_principal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Admin Principal', 'root_admin', 'admin@monitores.com', hashedAdmin, 'admin', 1, 1]
    );

    return {
      message: 'Base de datos reseteada completamente a estado de fábrica.',
      credentials: {
        dev: { user: 'root_dev', pass: devPass },
        admin: { user: 'root_admin', pass: adminPass }
      }
    };
  }

  async populateVolumeData() {
    // 1. Create Monitores
    const academicNames = ['Juan Matemáticas', 'Lucía Física', 'Andrés Química', 'Sofía Biología', 'Pedro Cálculo'];
    const adminNames = ['Admin Comedor 1', 'Admin Sede Norte', 'Admin Central', 'Admin Deportes', 'Admin Cultura'];
    
    const monitorIds = [];
    
    // Academic (Role: monitor)
    const hashedPass = await bcrypt.hash('123', 10);
    for (const name of academicNames) {
      const user = name.toLowerCase().replace(' ', '_');
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "monitor", 1)',
        [name, user, `${user}@demo.com`, hashedPass]
      );
      const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [user]);
      monitorIds.push({ id: rows[0].id, type: 'academic', name });
    }

    // Admin (Role: admin)
    for (const name of adminNames) {
      const user = name.toLowerCase().replace(/ /g, '_');
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "admin", 1)',
        [name, user, `${user}@demo.com`, hashedPass]
      );
      const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [user]);
      monitorIds.push({ id: rows[0].id, type: 'admin', name });
    }

    // 2. Create Modules for Academic Monitors
    const moduleIds = [];
    const subjects = ['Cálculo Vectorial', 'Termodinámica', 'Química Orgánica', 'Genética Humana', 'Álgebra Lineal'];
    const sedes = ['Sede plaza la paz', 'sede soledad', 'Sede norte', 'Sede centro'];
    
    for (let i = 0; i < academicNames.length; i++) {
        const mon = monitorIds.find(m => m.name === academicNames[i]);
        await pool.query(
            'INSERT IGNORE INTO modules (monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, sede, descripcion, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [mon.id, mon.name, `${mon.name.toLowerCase().replace(' ', '_')}@demo.com`, subjects[i], '3° Cuatrimestre', 'Presencial', 'Lunes, Miercoles 08:00 - 10:00', sedes[i%sedes.length], `Módulo de refuerzo para ${subjects[i]}`]
        );
        const [rows] = await pool.query('SELECT id FROM modules WHERE monitorId = ? AND modulo = ?', [mon.id, subjects[i]]);
        moduleIds.push(rows[0].id);
    }

    // 3. Create 20 Students
    const studentIds = [];
    for (let i = 1; i <= 20; i++) {
        const username = `student_${i}`;
        await pool.query(
            'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "student", 1)',
            [`Estudiante ${i}`, username, `student${i}@test.com`, hashedPass]
        );
        const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        studentIds.push({ id: rows[0].id, name: `Estudiante ${i}`, email: `student${i}@test.com` });
    }

    // 4. Enroll Students & Create Attendance/Forums
    for (const moduleId of moduleIds) {
        // Random subset of 8 students per module
        const subset = studentIds.sort(() => 0.5 - Math.random()).slice(0, 8);
        const [modData] = await pool.query('SELECT * FROM modules WHERE id = ?', [moduleId]);
        
        for (const stud of subset) {
            await pool.query(
                'INSERT INTO registrations (studentName, studentEmail, modulo, monitorId, student_id, module_id, registeredAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [stud.name, stud.email, modData[0].modulo, modData[0].monitorId, stud.id, moduleId]
            );
            
            // Add some attendance records
            await pool.query(
                'INSERT INTO attendance (monitorId, studentName, date, rating, comment) VALUES (?, ?, CURDATE(), 1, ?)',
                [modData[0].monitorId, stud.name, `MODULE_ID=${moduleId};EMAIL=${stud.email};STATUS=present`]
            );
        }

        // Add 3 Forum Threads per module
        const threadTitles = ['Duda sobre el primer parcial', 'Comparto mis apuntes', '¿Cuándo es el próximo taller?'];
        for (const title of threadTitles) {
            const creator = subset[Math.floor(Math.random() * subset.length)];
            const [resThread] = await pool.query(
                'INSERT INTO forum_threads (module_id, created_by, title, status, created_at) VALUES (?, ?, ?, "open", NOW())',
                [moduleId, creator.id, title]
            );
            
            // Add a couple of messages to each thread
            await pool.query(
                'INSERT INTO forum_messages (thread_id, module_id, user_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
                [resThread.insertId, moduleId, modData[0].monitorId, '¡Hola! Claro, con gusto les ayudo con esa duda.']
            );
            await pool.query(
                'INSERT INTO forum_messages (thread_id, module_id, user_id, message, created_at) VALUES (?, ?, ?, ?, NOW())',
                [resThread.insertId, moduleId, subset[0].id, 'Gracias monitor, me queda mucho más claro ahora.']
            );
        }
    }

    return { 
        success: true, 
        message: 'Carga de volumen completada: 20 estudiantes, 10 monitores, 5 módulos y actividad de foros/asistencia generada.' 
    };
  }
}

export default new TestingService();
