import pool from '../utils/mysql.helper.js';
import testingService from '../services/testing.service.js';
import bcrypt from 'bcryptjs';
import os from 'os';

/**
 * DevController - Centraliza las operaciones técnicas solicitadas por el usuario.
 * Estas funciones reemplazan la ejecución manual de archivos en la carpeta /scripts.
 */
const devController = {
  
  // Script: reset_db.js
  resetDatabase: async (req, res) => {
    try {
      const tables = ['attendance', 'lunch_usage', 'qr_scan_logs', 'qr_codes', 'registrations', 'questions', 'answers'];
      
      for (const table of tables) {
        // Borrar datos y resetear auto_increment
        await pool.query(`DELETE FROM ${table}`);
        await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      }
      
      res.json({ message: 'Base de datos limpiada con éxito (tablas dinámicas)' });
    } catch (error) {
      console.error('Error in resetDatabase:', error);
      res.status(500).json({ error: 'Fallo al resetear la base de datos' });
    }
  },

  nukeDatabase: async (req, res) => {
    try {
      const result = await testingService.nukeAndRebuild();
      res.json(result);
    } catch (error) {
      console.error('Error in nukeDatabase:', error);
      res.status(500).json({ error: 'Fallo crítico al reconstruir la base de datos' });
    }
  },

  populateVolume: async (req, res) => {
    try {
      const result = await testingService.populateVolumeData();
      res.json(result);
    } catch (error) {
      console.error('Error in populateVolume:', error);
      res.status(500).json({ error: 'Fallo al generar volumen de datos' });
    }
  },

  // Script: populate_academic_test.js
  populateTestData: async (req, res) => {
    try {
      // 1. Monitores
      const monitors = [
        ['Elena Monitora', 'elena_m', 'elena@monitores.com', '123', 'monitor', 1],
        ['Marcos Monitor', 'marcos_m', 'marcos@monitores.com', '123', 'monitor', 1]
      ];

      for (const m of monitors) {
        await pool.query(
          'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          m
        );
      }

      // Obtener IDs de monitores creados
      const [monitorRows] = await pool.query('SELECT id, nombre, email FROM users WHERE role = "monitor"');

      // 2. Módulos
      const modules = [
        { 
          monitor: monitorRows.find(r => r.nombre === 'Elena Monitora'), 
          modulo: 'Matemáticas II', 
          cuatrimestre: '2° Cuatrimestre', 
          modalidad: 'Presencial', 
          horario: 'Lunes, Miércoles 14:00 - 16:00',
          sede: 'Sede plaza la paz',
          descripcion: 'Refuerzo de cálculo integral y álgebra lineal.'
        },
        { 
          monitor: monitorRows.find(r => r.nombre === 'Marcos Monitor'), 
          modulo: 'Programación Web', 
          cuatrimestre: '3° Cuatrimestre', 
          modalidad: 'Virtual', 
          horario: 'Viernes 18:00 - 20:00',
          sede: 'sede soledad',
          descripcion: 'Aprende React y Node.js desde cero.'
        }
      ];

      for (const mod of modules) {
        if (!mod.monitor) continue;
        await pool.query(
          'INSERT INTO modules (monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, sede, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [mod.monitor.id, mod.monitor.nombre, mod.monitor.email, mod.modulo, mod.cuatrimestre, mod.modalidad, mod.horario, mod.sede, mod.descripcion]
        );
      }

      // 3. Estudiantes
      const students = [
        ['Carlos Estudiante', 'carlos_e', 'carlos@demo.com', '123', 'student', 1],
        ['Maria Estudiante', 'maria_e', 'maria@demo.com', '123', 'student', 1]
      ];

      for (const s of students) {
        await pool.query(
          'INSERT IGNORE INTO users (nombre, username, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          s
        );
      }

      // 4. Inscripciones
      const [moduleRows] = await pool.query('SELECT id, modulo, monitorId FROM modules');
      const [studentRows] = await pool.query('SELECT id, nombre, email FROM users WHERE role = "student"');

      for (const stud of studentRows) {
          const mod = moduleRows[Math.floor(Math.random() * moduleRows.length)];
          await pool.query(
              'INSERT INTO registrations (studentName, studentEmail, modulo, monitorId, student_id, module_id) VALUES (?, ?, ?, ?, ?, ?)',
              [stud.nombre, stud.email, mod.modulo, mod.monitorId, stud.id, mod.id]
          );
      }

      res.json({ message: 'Datos académicos de prueba generados correctamente' });
    } catch (error) {
      console.error('Error in populateTestData:', error);
      res.status(500).json({ error: 'Fallo al generar datos de prueba' });
    }
  },

  // Script: fix_username.js & Bulk Encryption
  fixUsernames: async (req, res) => {
    try {
      // 1. Fix null/empty usernames
      const [noUsernames] = await pool.query("SELECT id, email FROM users WHERE username IS NULL OR username = ''");
      for (const user of noUsernames) {
        const generatedUsername = user.email.split('@')[0] + '_' + user.id;
        await pool.query("UPDATE users SET username = ? WHERE id = ?", [generatedUsername, user.id]);
      }

      // 2. Normalise: Bulk Encrypt plain-text passwords
      const [usersToEncrypt] = await pool.query("SELECT id, password FROM users");
      let encryptedCount = 0;
      
      for (const user of usersToEncrypt) {
        // Simple check: Bcrypt hashes start with $2
        if (!user.password?.startsWith('$2')) {
          const hashed = await bcrypt.hash(user.password || '123', 10);
          await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
          encryptedCount++;
        }
      }
      
      res.json({ 
        message: `Normalización completada.`,
        details: {
          usernamesFixed: noUsernames.length,
          passwordsEncrypted: encryptedCount
        }
      });
    } catch (error) {
      console.error('Error in fixUsernames (normalize):', error);
      res.status(500).json({ error: 'Fallo al normalizar y encriptar la base de datos' });
    }
  },

  // Script: system diagnostics (General Tester)
  runDiagnostics: async (req, res) => {
    try {
      // Test DB connection
      const startDb = Date.now();
      const [versionResult] = await pool.query('SELECT VERSION() as version');
      const dbLatency = Date.now() - startDb;

      // Count core entities
      const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
      const [modCount] = await pool.query('SELECT COUNT(*) as total FROM modules');
      const [attCount] = await pool.query('SELECT COUNT(*) as total FROM attendance');
      const [qrCount] = await pool.query('SELECT COUNT(*) as total FROM qr_scan_logs');

      res.json({
        status: 'healthy',
        latency: `${dbLatency}ms`,
        dbVersion: versionResult[0].version,
        osUptime: os.uptime(),
        memFree: os.freemem(),
        memTotal: os.totalmem(),
        stats: {
          users: userCount[0].total,
          modules: modCount[0].total,
          attendance: attCount[0].total,
          scans: qrCount[0].total
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({ status: 'error', message: error.message });
    }
  },

  // Script: remote terminal backend executor
  runTerminalCommand: async (req, res) => {
    try {
      const { command, cwd } = req.body;
      const cmdParts = (command || '').trim().split(' ').filter(p => p);
      if (cmdParts.length === 0) return res.status(400).json({ error: 'Comando vacío' });
      const mainCmd = cmdParts[0].toLowerCase();
      
      const fs = await import('fs');
      const path = await import('path');

      // Base CWD resolver
      let activeCwd = process.cwd();
      if (cwd) {
        // Resolve provided virtual cwd. Ensure it's absolute.
        activeCwd = path.isAbsolute(cwd) ? cwd : path.resolve(process.cwd(), cwd);
      }
      
      if (mainCmd === 'cd') {
        if (!cmdParts[1]) return res.json({ result: activeCwd, newCwd: activeCwd });
        
        let targetCmdDir = cmdParts[1];
        if (targetCmdDir === '...') targetCmdDir = '../../';
        else if (targetCmdDir === '....') targetCmdDir = '../../../';
        
        const targetDir = path.resolve(activeCwd, targetCmdDir);
        if (!fs.existsSync(targetDir)) return res.json({ result: `cd: ${cmdParts[1]}: No existe el archivo o directorio`, newCwd: activeCwd });
        if (!fs.statSync(targetDir).isDirectory()) return res.json({ result: `cd: ${cmdParts[1]}: No es un directorio`, newCwd: activeCwd });
        // Return blank result normally, but newCwd signals to update frontend state
        return res.json({ result: `Directorio cambiado a: ${targetDir}`, newCwd: targetDir });
      }

      if (mainCmd === 'ls') {
        const targetPath = cmdParts[1] ? path.resolve(activeCwd, cmdParts[1]) : activeCwd;
        if (!fs.existsSync(targetPath)) return res.json({ result: `ls: ${cmdParts[1] || ''}: No existe el directorio` });
        
        const files = fs.readdirSync(targetPath);
        const mapped = files.map(f => {
          const stats = fs.statSync(path.join(targetPath, f));
          return {
            name: f,
            isDirectory: stats.isDirectory(),
            isSymbolicLink: stats.isSymbolicLink(),
            size: stats.size,
            mtime: stats.mtime
          };
        });
        
        return res.json({ result: mapped, type: 'ls_output' });
      }
      
      if (mainCmd === 'tree') {
        const targetPath = cmdParts[1] ? path.resolve(activeCwd, cmdParts[1]) : activeCwd;
        if (!fs.existsSync(targetPath)) return res.json({ result: `tree: ${cmdParts[1] || ''}: No existe el directorio` });
        const buildTree = (dir, prefix = '') => {
            let result = '';
            try {
                const files = fs.readdirSync(dir).filter(f => !['node_modules', '.git', '.env'].includes(f));
                files.forEach((file, index) => {
                    const isLast = index === files.length - 1;
                    const filePath = path.join(dir, file);
                    result += `${prefix}${isLast ? '└── ' : '├── '}${file}\n`;
                    if (fs.statSync(filePath).isDirectory()) {
                        result += buildTree(filePath, prefix + (isLast ? '    ' : '│   '));
                    }
                });
            } catch (e) {
                result += `${prefix}└── [Permiso denegado]\n`;
            }
            return result;
        };
        const treeStr = `${path.basename(targetPath)}\n${buildTree(targetPath)}`;
        return res.json({ result: treeStr });
      }

      if (mainCmd === 'pwd' || mainCmd === 'cwd') {
        return res.json({ result: activeCwd });
      }
      
      if (mainCmd === 'sysinfo') {
        const os = await import('os');
        const sys = `Plataforma: ${os.platform()} - ${os.arch()}\nCPU Cores: ${os.cpus().length}\nMemoria Libre: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB\nMemoria Total: ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB\nUptime Host: ${os.uptime()}s`;
        return res.json({ result: sys });
      }
      return res.status(400).json({ error: 'Comando inválido o no autorizado por el sistema restrictivo P2P' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getTerminalSuggestions: async (req, res) => {
    try {
      const { query, cwd } = req.body;
      const fs = await import('fs');
      const path = await import('path');

      let activeCwd = process.cwd();
      if (cwd) {
        activeCwd = path.isAbsolute(cwd) ? cwd : path.resolve(process.cwd(), cwd);
      }

      const parts = (query || '').split(' ');
      const lastPart = parts.pop() || '';
      
      // If we are at the beginning, suggest commands
      if (parts.length === 0) {
        const commands = ['help', 'clear', 'ping', 'diagnostics', 'populate', 'fix_users', 'wipe_db', 'ls', 'tree', 'pwd', 'sysinfo', 'cd'];
        return res.json(commands.filter(c => c.startsWith(lastPart.toLowerCase())));
      }

      // Suggest files/directories
      const searchDir = path.dirname(path.resolve(activeCwd, lastPart));
      const searchBase = path.basename(lastPart);
      
      if (!fs.existsSync(searchDir)) return res.json([]);
      
      const files = fs.readdirSync(searchDir);
      const suggestions = files
        .filter(f => f.toLowerCase().startsWith(searchBase.toLowerCase()))
        .map(f => {
          const fullPath = path.join(searchDir, f);
          const isDir = fs.statSync(fullPath).isDirectory();
          return isDir ? f + '/' : f;
        });
        
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ─── ROOT TERMINAL SYSTEM ───────────────────────────────────────────────────

  rootEnable: async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'No autenticado.' });

      const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
      if (!user.is_principal) return res.status(403).json({ error: 'Solo el usuario principal puede activar el modo ROOT.' });
      if (!user.is_active) return res.status(403).json({ error: 'Cuenta suspendida. No puede activar ROOT.' });

      // Check lockout
      if (user.root_lockout_until && new Date(user.root_lockout_until) > new Date()) {
        const remaining = Math.ceil((new Date(user.root_lockout_until) - new Date()) / 1000);
        // Log the attempt as alert
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_ENABLE_BLOCKED', 'terminal', JSON.stringify({ reason: 'lockout_active', remaining_seconds: remaining, user_nombre: user.nombre })]
        );
        return res.status(429).json({ error: `Terminal bloqueada. Intenta en ${remaining} segundos.`, locked: true, remaining });
      }

      const bcrypt = await import('bcryptjs');
      const valid = user.password.startsWith('$2') 
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (!valid) {
        const newAttempts = (user.root_attempts || 0) + 1;
        const MAX_ATTEMPTS = 3;
        const LOCKOUT_MINUTES = 3;
        let lockoutUntil = null;
        let newPhase = user.root_lockout_phase || 0;
        let disableUser = false;

        if (newAttempts >= MAX_ATTEMPTS) {
          newPhase += 1;
          if (newPhase >= 3) {
            // Phase 3: permanently suspend
            disableUser = true;
            await pool.query('UPDATE users SET is_active = 0, root_attempts = 0, root_lockout_phase = 3, root_lockout_until = NULL WHERE id = ?', [userId]);
            // Log CRITICAL alert
            await pool.query(
              'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
              [userId, 'ROOT_ACCOUNT_SUSPENDED', 'terminal', JSON.stringify({ 
                reason: 'max_phases_reached', user_nombre: user.nombre, user_id: userId, severity: 'CRITICAL' 
              })]
            );
            return res.status(403).json({ error: 'Cuenta suspendida automáticamente por múltiples intentos fallidos de ROOT. Contacta al equipo principal.', suspended: true });
          }
          // Apply lockout
          lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await pool.query(
            'UPDATE users SET root_attempts = 0, root_lockout_until = ?, root_lockout_phase = ? WHERE id = ?',
            [lockoutUntil, newPhase, userId]
          );
          // Log alert
          await pool.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, 'ROOT_ENABLE_LOCKOUT', 'terminal', JSON.stringify({ 
              phase: newPhase, lockout_minutes: LOCKOUT_MINUTES, user_nombre: user.nombre, severity: 'HIGH'
            })]
          );
          return res.status(429).json({ error: `Contraseña incorrecta. Terminal bloqueada ${LOCKOUT_MINUTES} minutos (Fase ${newPhase}/3).`, locked: true, phase: newPhase });
        } else {
          // Increment attempts and log alert
          await pool.query('UPDATE users SET root_attempts = ? WHERE id = ?', [newAttempts, userId]);
          await pool.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, 'ROOT_ENABLE_FAILED', 'terminal', JSON.stringify({ 
              attempt: newAttempts, max: MAX_ATTEMPTS, user_nombre: user.nombre, severity: 'MEDIUM'
            })]
          );
          return res.status(401).json({ error: `Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}.`, attempts: newAttempts });
        }
      }

      // SUCCESS: reset attempts and grant ROOT
      await pool.query('UPDATE users SET root_attempts = 0, root_lockout_until = NULL WHERE id = ?', [userId]);
      await pool.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, 'ROOT_ENABLE_SUCCESS', 'terminal', JSON.stringify({ user_nombre: user.nombre })]
      );

      return res.json({ success: true, message: '🔓 Un gran poder conlleva una gran responsabilidad.', rootGranted: true });
    } catch (error) {
      console.error('rootEnable error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  rootMemberAction: async (req, res) => {
    try {
      const { action, args } = req.body; // action: list|add|rm|up|down|role
      const userId = req.user?.id;
      const [[caller]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!caller?.is_principal) return res.status(403).json({ error: 'Solo el usuario principal puede usar comandos ROOT.' });

      const fs_path = await import('path');

      if (action === 'list') {
        const [users] = await pool.query('SELECT id, nombre, username, email, role, is_active, is_principal, createdAt FROM users ORDER BY id');
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_MEMBER_LIST', 'users', JSON.stringify({ caller: caller.nombre })]
        );
        return res.json({ success: true, users });
      }

      if (action === 'rm') {
        const targetId = Number(args[0]);
        if (!targetId) return res.status(400).json({ error: 'ID requerido.' });
        const [[target]] = await pool.query('SELECT nombre, role FROM users WHERE id = ?', [targetId]);
        await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, 'ROOT_MEMBER_DELETE', 'users', targetId, JSON.stringify({ deleted: target?.nombre, role: target?.role, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Usuario ${target?.nombre} eliminado.` });
      }

      if (action === 'up' || action === 'down') {
        const targetId = Number(args[0]);
        if (!targetId) return res.status(400).json({ error: 'ID requerido.' });
        const newActive = action === 'up' ? 1 : 0;
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newActive, targetId]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, `ROOT_MEMBER_${action.toUpperCase()}`, 'users', targetId, JSON.stringify({ new_active: newActive, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Usuario ${action === 'up' ? 'activado' : 'desactivado'}.` });
      }

      if (action === 'role') {
        const [targetId, newRole] = args;
        if (!targetId || !newRole) return res.status(400).json({ error: 'ID y rol requeridos.' });
        const validRoles = ['student', 'monitor', 'monitor_academico', 'monitor_administrativo', 'admin', 'dev'];
        if (!validRoles.includes(newRole)) return res.status(400).json({ error: `Rol inválido. Válidos: ${validRoles.join(', ')}` });
        await pool.query('UPDATE users SET role = ? WHERE id = ?', [newRole, Number(targetId)]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, 'ROOT_MEMBER_ROLE', 'users', Number(targetId), JSON.stringify({ new_role: newRole, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Rol cambiado a ${newRole}.` });
      }

      if (action === 'add') {
        const [nombre, email, role, password] = args;
        if (!nombre || !email || !role || !password) return res.status(400).json({ error: 'nombre, email, rol y contraseña requeridos.' });
        const bcrypt = await import('bcryptjs');
        const hashed = await bcrypt.hash(password, 10);
        const username = email.split('@')[0] + '_' + Date.now();
        const [result] = await pool.query(
          'INSERT INTO users (nombre, username, email, password, role, is_active, createdAt) VALUES (?, ?, ?, ?, ?, 1, NOW())',
          [nombre, username, email, hashed, role]
        );
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, 'ROOT_MEMBER_ADD', 'users', result.insertId, JSON.stringify({ nombre, email, role, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Usuario ${nombre} creado con ID ${result.insertId}.` });
      }

      return res.status(400).json({ error: 'Acción no reconocida.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  rootFileAction: async (req, res) => {
    try {
      const { action, filePath, cwd, content } = req.body;
      const userId = req.user?.id;
      const [[caller]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!caller?.is_principal) return res.status(403).json({ error: 'Solo el usuario principal puede operar archivos en modo ROOT.' });

      const fs = await import('fs');
      const path = await import('path');
      
      const targetCwd = cwd || process.cwd();
      const resolvedPath = path.resolve(targetCwd, filePath);

      if (action === 'read' || action === 'nano') {
        if (!fs.existsSync(resolvedPath)) return res.status(404).json({ error: 'Archivo no encontrado.' });
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_FILE_READ', 'file', JSON.stringify({ path: resolvedPath, by: caller.nombre })]
        );
        return res.json({ success: true, content: fileContent, path: resolvedPath });
      }

      if (action === 'write') {
        fs.writeFileSync(resolvedPath, content || '', 'utf-8');
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_FILE_WRITE', 'file', JSON.stringify({ path: resolvedPath, bytes: (content || '').length, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Archivo guardado: ${resolvedPath}` });
      }

      if (action === 'touch') {
        fs.writeFileSync(resolvedPath, '', { flag: 'a' });
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_FILE_TOUCH', 'file', JSON.stringify({ path: resolvedPath, by: caller.nombre })]
        );
        return res.json({ success: true, message: `Archivo creado: ${resolvedPath}` });
      }

      if (action === 'rm') {
        if (!fs.existsSync(resolvedPath)) return res.status(404).json({ error: 'Archivo o directorio no encontrado.' });
        const stat = fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(resolvedPath);
        }
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
          [userId, 'ROOT_FILE_DELETE', 'file', JSON.stringify({ path: resolvedPath, was_directory: stat.isDirectory(), by: caller.nombre })]
        );
        return res.json({ success: true, message: `Eliminado: ${resolvedPath}` });
      }

      return res.status(400).json({ error: 'Acción no reconocida.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getRootLogs: async (req, res) => {
    try {
      const userId = req.user?.id;
      const [[caller]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!caller?.is_principal) return res.status(403).json({ error: 'Acceso denegado.' });

      const { page = 0, limit = 100 } = req.query;
      const offset = Number(page) * Number(limit);
      const [rows] = await pool.query(
        `SELECT al.*, u.nombre as user_name, u.role as user_role, u.foto as user_photo
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.action LIKE 'ROOT_%'
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [Number(limit), offset]
      );
      return res.json(rows.map(r => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {})
      })));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  rootSystemBackup: async (req, res) => {
    try {
      const userId = req.user?.id;
      const [[caller]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!caller?.is_principal) return res.status(403).json({ error: 'Operación denegada.' });

      // Build JSON Backup
      const [tables] = await pool.query("SHOW TABLES");
      const dbDump = {};
      for (const row of tables) {
        const tableName = Object.values(row)[0];
        const [tableData] = await pool.query(`SELECT * FROM \`${tableName}\``);
        dbDump[tableName] = tableData;
      }
      const dumpStr = JSON.stringify(dbDump, null, 2);

      const AdmZip = (await import('adm-zip')).default;
      const fs = await import('fs');
      const path = await import('path');
      
      const zip = new AdmZip();
      zip.addFile('db_backup.json', Buffer.from(dumpStr, 'utf-8'));
      
      const staticDirs = ['uploads'];
      for (const dir of staticDirs) {
        const fullPath = path.resolve(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
          zip.addLocalFolder(fullPath, dir);
        }
      }

      await pool.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, 'ROOT_BACKUP_GENERATE', 'system', JSON.stringify({ caller: caller.nombre })]
      );

      const zipBuffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=root_backup_${Date.now()}.zip`);
      res.setHeader('Content-Length', zipBuffer.length);
      return res.send(zipBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },

  rootSystemRestore: async (req, res) => {
    try {
      const userId = req.user?.id;
      const [[caller]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!caller?.is_principal) return res.status(403).json({ error: 'Operación denegada.' });

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Falta el archivo ZIP.' });
      }

      const AdmZip = (await import('adm-zip')).default;
      const fs = await import('fs-extra');
      const path = await import('path');

      const zip = new AdmZip(req.file.buffer);
      const dbEntry = zip.getEntry('db_backup.json');
      if (!dbEntry) return res.status(400).json({ error: 'ZIP inválido. No se encontró db_backup.json.' });

      const rawJson = dbEntry.getData().toString('utf-8');
      const dbDump = JSON.parse(rawJson);

      const connection = await pool.getConnection();
      try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const [tableName, rows] of Object.entries(dbDump)) {
          await connection.query(`TRUNCATE TABLE \`${tableName}\``);
          if (rows && rows.length > 0) {
            // Bulk insert handling
            const chunkSize = 500;
            for (let i = 0; i < rows.length; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              const fields = Object.keys(chunk[0]).map(k => `\`${k}\``).join(', ');
              const values = chunk.map(r => 
                `(${Object.values(r).map(v => v === null ? 'NULL' : connection.escape(v)).join(', ')})`
              ).join(', ');
              await connection.query(`INSERT INTO \`${tableName}\` (${fields}) VALUES ${values}`);
            }
          }
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (err) {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
        throw err;
      }
      connection.release();

      // Extracción estática de archivos al sistema
      zip.extractAllTo(process.cwd(), true);

      await pool.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, 'ROOT_RESTORE_EXE', 'system', JSON.stringify({ caller: caller.nombre })]
      );

      return res.json({ success: true, message: 'Restore destructivo completado con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default devController;
