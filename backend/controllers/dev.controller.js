import pool from '../utils/mysql.helper.js';
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

  // Script: fix_username.js
  fixUsernames: async (req, res) => {
    try {
      const [users] = await pool.query("SELECT id, email FROM users WHERE username IS NULL OR username = ''");
      let count = 0;
      
      for (const user of users) {
        const generatedUsername = user.email.split('@')[0] + '_' + user.id;
        await pool.query("UPDATE users SET username = ? WHERE id = ?", [generatedUsername, user.id]);
        count++;
      }
      
      res.json({ message: `Se corrigieron ${count} nombres de usuario` });
    } catch (error) {
      console.error('Error in fixUsernames:', error);
      res.status(500).json({ error: 'Fallo al corregir nombres de usuario' });
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
        return res.json({ result: files.join('\n') });
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
  }
};

export default devController;
