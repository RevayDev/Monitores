import pool from '../utils/mysql.helper.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ensureSchema } from '../utils/schema-init.helper.js';

class TestingService {
  async nukeAndRebuild() {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tableRows] = await pool.query('SHOW TABLES');
    const tableNames = tableRows.map((row) => String(Object.values(row)[0]));

    for (const table of tableNames) {
      try {
        await pool.query(`DELETE FROM \`${table}\``);
        await pool.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      } catch {
        // no-op
      }
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    await ensureSchema();

    const hashedCommon = await bcrypt.hash('123', 10);
    const hashedDev = await bcrypt.hash('dev123', 10);
    const hashedAdmin = await bcrypt.hash('admin123', 10);

    const roots = [
      ['Dev Principal', 'root_dev', 'dev@monitores.com', hashedDev, 'dev', 1, 1],
      ['Admin Principal', 'root_admin', 'admin@monitores.com', hashedAdmin, 'admin', 1, 1],
      ['Monitor Academico Root', 'root_monitor_ac', 'monitor_ac@monitores.com', hashedCommon, 'monitor_academico', 1, 1],
      ['Monitor Administrativo Root', 'root_monitor_ad', 'monitor_ad@monitores.com', hashedCommon, 'monitor_administrativo', 1, 1],
      ['Estudiante Root', 'root_student', 'student_root@monitores.com', hashedCommon, 'student', 1, 1]
    ];

    for (const r of roots) {
      await pool.query(
        'INSERT INTO users (nombre, username, email, password, role, is_active, is_principal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        r
      );
    }

    const rootUsernames = ['root_dev', 'root_admin', 'root_monitor_ac', 'root_monitor_ad', 'root_student'];
    await pool.query(
      `DELETE FROM users WHERE username NOT IN (${rootUsernames.map(() => '?').join(',')})`,
      rootUsernames
    );

    return {
      message: 'Core eliminado. Toda la informacion operativa fue borrada y solo quedaron cuentas root por defecto.',
      credentials: {
        dev: { user: 'root_dev', pass: 'dev123' },
        admin: { user: 'root_admin', pass: 'admin123' },
        monitor_academico: { user: 'root_monitor_ac', pass: '123' },
        monitor_administrativo: { user: 'root_monitor_ad', pass: '123' },
        student: { user: 'root_student', pass: '123' }
      }
    };
  }

  async populateVolumeData() {
    const academicNames = ['Juan Matematicas', 'Lucia Fisica', 'Andres Quimica', 'Sofia Biologia', 'Pedro Calculo'];
    const adminNames = ['Admin Comedor 1', 'Admin Sede Norte', 'Admin Central', 'Admin Deportes', 'Admin Cultura'];
    const subjects = ['Calculo Vectorial', 'Termodinamica', 'Quimica Organica', 'Genetica Humana', 'Algebra Lineal'];
    const sedes = ['Sede plaza la paz', 'sede soledad', 'Sede norte', 'Sede centro'];
    const hashedPass = await bcrypt.hash('123', 10);

    const academicMonitors = [];
    for (const name of academicNames) {
      const username = name.toLowerCase().replace(/ /g, '_');
      const email = `${username}@demo.com`;
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "monitor_academico", 1)',
        [name, username, email, hashedPass]
      );
      const [[row]] = await pool.query('SELECT id, nombre, email FROM users WHERE username = ?', [username]);
      academicMonitors.push(row);
    }

    const adminMonitors = [];
    for (const name of adminNames) {
      const username = name.toLowerCase().replace(/ /g, '_');
      const email = `${username}@demo.com`;
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "monitor_administrativo", 1)',
        [name, username, email, hashedPass]
      );
      const [[row]] = await pool.query('SELECT id, nombre, email FROM users WHERE username = ?', [username]);
      adminMonitors.push(row);
    }

    const modules = [];
    for (let i = 0; i < subjects.length; i++) {
      const mon = academicMonitors[i % academicMonitors.length];
      await pool.query(
        `INSERT IGNORE INTO modules
          (monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, sede, descripcion, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [mon.id, mon.nombre, mon.email, subjects[i], '3 Cuatrimestre', 'Presencial', 'Lunes, Miercoles 08:00 - 10:00', sedes[i % sedes.length], `Modulo de refuerzo para ${subjects[i]}`]
      );
      const [[mod]] = await pool.query('SELECT id, monitorId, monitor, modulo FROM modules WHERE monitorId = ? AND modulo = ? LIMIT 1', [mon.id, subjects[i]]);
      modules.push(mod);
    }

    const students = [];
    for (let i = 1; i <= 64; i++) {
      const username = `student_${i}`;
      const email = `student${i}@test.com`;
      await pool.query(
        'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, "student", 1)',
        [`Estudiante ${i}`, username, email, hashedPass]
      );
      const [[row]] = await pool.query('SELECT id, nombre, email FROM users WHERE username = ?', [username]);
      students.push(row);
    }

    let regCount = 0;
    let attendanceCount = 0;
    let legacyQuestions = 0;
    let threadCount = 0;
    let messageCount = 0;
    let forumPostCount = 0;
    let forumReplyCount = 0;
    let qrCodesCount = 0;
    let qrScansCount = 0;
    let lunchUsageCount = 0;
    let complaintsCount = 0;
    let forumReportsCount = 0;
    const moduleOccupancy = [];
    const createdForumIds = [];
    const createdReplyIds = [];
    const targetSeatsByModule = [32, 29, 21, 13, 6];

    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
      const mod = modules[moduleIndex];
      const poolStart = moduleIndex * 12;
      const targetSeats = targetSeatsByModule[moduleIndex % targetSeatsByModule.length];
      const selected = [];
      for (let j = 0; j < targetSeats; j++) {
        selected.push(students[(poolStart + j) % students.length]);
      }
      moduleOccupancy.push({
        module_id: mod.id,
        modulo: mod.modulo,
        registrations: targetSeats,
        limit: 32,
        status: targetSeats >= 32 ? 'full' : 'available'
      });

      for (const stud of selected) {
        await pool.query(
          `INSERT INTO registrations
            (studentName, studentEmail, modulo, monitorId, student_id, module_id, registeredAt, status)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), 'active')`,
          [stud.nombre, stud.email, mod.modulo, mod.id, stud.id, mod.id]
        );
        regCount++;
      }

      for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
        const daySlice = selected.slice(dayOffset * 3, dayOffset * 3 + Math.min(14, targetSeats));
        for (const stud of daySlice) {
          await pool.query(
            `INSERT INTO attendance
              (monitorId, studentName, student_id, module_id, date, scan_time, rating, comment, attendance_status)
             VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, 'present')`,
            [mod.monitorId, stud.nombre, stud.id, mod.id, dayOffset, dayOffset, (dayOffset % 5) + 1, `Asistencia simulada en ${mod.modulo}`]
          );
          attendanceCount++;
        }
      }

      const qrScanner = adminMonitors[moduleIndex % Math.max(1, adminMonitors.length)];
      const qrStudents = selected.slice(0, Math.min(10, targetSeats));
      for (const stud of qrStudents) {
        const tokenValue = crypto.randomBytes(24).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
        const validFrom = new Date();
        const expiresAt = new Date(validFrom.getTime() + 2 * 60 * 60 * 1000);
        const [qrRes] = await pool.query(
          `INSERT INTO qr_codes
            (user_id, token_value, token_hash, code_date, valid_from, expires_at, status, use_count, created_at)
           VALUES (?, ?, ?, CURDATE(), ?, ?, 'active', 0, NOW())`,
          [stud.id, tokenValue, tokenHash, validFrom, expiresAt]
        );
        qrCodesCount++;

        await pool.query(
          `INSERT INTO qr_scan_logs
            (qr_code_id, token_hash, scanner_user_id, student_user_id, module_id, module_session_id, scan_time, result, reason)
           VALUES (?, ?, ?, ?, ?, 0, NOW(), 'accepted', NULL)`,
          [qrRes.insertId, tokenHash, qrScanner?.id || mod.monitorId, stud.id, mod.id]
        );
        qrScansCount++;

        await pool.query(
          `INSERT INTO attendance
            (monitorId, studentName, student_id, module_id, date, scan_time, rating, comment, attendance_status, qr_code_id)
           VALUES (?, ?, ?, ?, CURDATE(), NOW(), 5, ?, 'present', ?)`,
          [mod.monitorId, stud.nombre, stud.id, mod.id, `Asistencia por QR en ${mod.modulo}`, qrRes.insertId]
        );
        attendanceCount++;

        if (qrScanner?.id) {
          try {
            await pool.query(
              `INSERT INTO lunch_usage (user_id, date, used, qr_code_id, scanner_user_id, created_at)
               VALUES (?, DATE_SUB(CURDATE(), INTERVAL ? DAY), 1, ?, ?, NOW())`,
              [stud.id, moduleIndex % 5, qrRes.insertId, qrScanner.id]
            );
            lunchUsageCount++;
          } catch {
            // unique by day can collide in repeated seeds; ignore
          }
        }
      }

      for (let q = 1; q <= 3; q++) {
        const author = selected[(q * 3) % selected.length];
        const [qRes] = await pool.query(
          'INSERT INTO questions (user_id, module_id, title, content, created_at) VALUES (?, ?, ?, ?, NOW())',
          [author.id, mod.id, `Pregunta ${q} - ${mod.modulo}`, `Contenido de prueba para ${mod.modulo}, hilo ${q}.`]
        );
        legacyQuestions++;
        await pool.query(
          'INSERT INTO answers (question_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
          [qRes.insertId, mod.monitorId, `Respuesta del monitor para ${mod.modulo}, pregunta ${q}.`]
        );
      }

      for (let t = 1; t <= 4; t++) {
        const creator = selected[(t * 5) % selected.length];
        const [tRes] = await pool.query(
          'INSERT INTO forum_threads (module_id, created_by, title, status, is_pinned, created_at) VALUES (?, ?, ?, "open", 0, NOW())',
          [mod.id, creator.id, `Thread ${t} - ${mod.modulo}`]
        );
        threadCount++;

        await pool.query(
          'INSERT INTO forum_messages (thread_id, module_id, user_id, role_snapshot, message, message_type, created_at) VALUES (?, ?, ?, ?, ?, "normal", NOW())',
          [tRes.insertId, mod.id, creator.id, 'student', `Hola grupo, inicio conversacion ${t} en ${mod.modulo}.`]
        );
        messageCount++;

        await pool.query(
          'INSERT INTO forum_messages (thread_id, module_id, user_id, role_snapshot, message, message_type, created_at) VALUES (?, ?, ?, ?, ?, "normal", NOW())',
          [tRes.insertId, mod.id, mod.monitorId, 'monitor_academico', `Perfecto, aqui tienen orientacion para el tema ${t}.`]
        );
        messageCount++;

        const extra = selected.slice(t, t + 3);
        for (const student of extra) {
          await pool.query(
            'INSERT INTO forum_messages (thread_id, module_id, user_id, role_snapshot, message, message_type, created_at) VALUES (?, ?, ?, ?, ?, "normal", NOW())',
            [tRes.insertId, mod.id, student.id, 'student', `Aporte de ${student.nombre} en thread ${t}.`]
          );
          messageCount++;
        }
      }

      for (let f = 1; f <= 5; f++) {
        const forumAuthor = selected[(f * 7) % selected.length];
        const [fRes] = await pool.query(
          `INSERT INTO forums (title, content, user_id, subject_id, modulo_id, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [`Foro ${f} - ${mod.modulo}`, `Publicacion de prueba para ${mod.modulo}. Tema ${f}.`, forumAuthor.id, mod.id, mod.id]
        );
        forumPostCount++;
        createdForumIds.push({ id: fRes.insertId, authorId: forumAuthor.id, moduleId: mod.id, monitorId: mod.monitorId });

        const [firstReplyRes] = await pool.query(
          'INSERT INTO replies (forum_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
          [fRes.insertId, mod.monitorId, `Respuesta monitor al foro ${f} de ${mod.modulo}.`]
        );
        forumReplyCount++;
        createdReplyIds.push({ id: firstReplyRes.insertId, authorId: mod.monitorId, forumId: fRes.insertId });

        const forumParticipants = selected.slice(f, f + 2);
        for (const participant of forumParticipants) {
          const [replyRes] = await pool.query(
            'INSERT INTO replies (forum_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
            [fRes.insertId, participant.id, `Comentario de ${participant.nombre} en foro ${f}.`]
          );
          forumReplyCount++;
          createdReplyIds.push({ id: replyRes.insertId, authorId: participant.id, forumId: fRes.insertId });
        }
      }

      for (const stud of selected.slice(0, 4)) {
        await pool.query(
          `INSERT INTO complaints
            (monitorId, studentName, studentEmail, reason, details, date, tipo, reported_id)
           VALUES (?, ?, ?, ?, ?, NOW(), 'academico', ?)`,
          [mod.monitorId, stud.nombre, stud.email, 'Demora en respuesta', `Reporte de prueba en modulo ${mod.modulo}.`, mod.monitorId]
        );
        complaintsCount++;
      }
    }

    for (const forum of createdForumIds.slice(0, 12)) {
      const reporter = students[(forum.id + 7) % students.length];
      if (!reporter || Number(reporter.id) === Number(forum.authorId)) continue;
      await pool.query(
        `INSERT INTO forum_reports (type, target_id, reporter_id, reported_id, reason, status, created_at)
         VALUES ('thread', ?, ?, ?, ?, 'pending', NOW())`,
        [forum.id, reporter.id, forum.authorId, `Reporte de prueba sobre foro ${forum.id}`]
      );
      forumReportsCount++;
    }

    for (const reply of createdReplyIds.slice(0, 10)) {
      const reporter = students[(reply.id + 3) % students.length];
      if (!reporter || Number(reporter.id) === Number(reply.authorId)) continue;
      await pool.query(
        `INSERT INTO forum_reports (type, target_id, reporter_id, reported_id, reason, status, created_at)
         VALUES ('reply', ?, ?, ?, ?, 'pending', NOW())`,
        [reply.id, reporter.id, reply.authorId, `Reporte de prueba sobre respuesta ${reply.id}`]
      );
      forumReportsCount++;
    }

    return {
      success: true,
      message: 'Datos de prueba cargados: estudiantes, asistencias, QR, foros, conversaciones y reportes.',
      counts: {
        modules: modules.length,
        students: students.length,
        registrations: regCount,
        attendances: attendanceCount,
        legacy_questions: legacyQuestions,
        forum_threads: threadCount,
        forum_messages: messageCount,
        forum_posts: forumPostCount,
        forum_replies: forumReplyCount,
        qr_codes: qrCodesCount,
        qr_scans: qrScansCount,
        lunch_usage: lunchUsageCount,
        complaints: complaintsCount,
        forum_reports: forumReportsCount,
        reports_total: complaintsCount + forumReportsCount
      },
      module_occupancy: moduleOccupancy
    };
  }

  async interactiveSetup() {
    await this.nukeAndRebuild();
    return await this.populateVolumeData();
  }
}

export default new TestingService();
