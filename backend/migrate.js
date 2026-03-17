import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'db.json');

// Re-using the config but initially without database
const config = {
  host: 'localhost',
  user: 'root',
  password: '',
};

async function migrate() {
  console.log('--- Starting MySQL Migration ---');
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to MySQL server.');

    console.log('Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS monitores_db`);
    await connection.query(`USE monitores_db`);

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // Helper for pool query (since we already have the connection)
    const query = (sql, params) => connection.query(sql, params);

    // 1. Create Tables
    console.log('Creating tables...');

    await connection.query(`DROP TABLE IF EXISTS users`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        sede VARCHAR(100),
        cuatrimestre VARCHAR(100),
        foto TEXT,
        is_principal BOOLEAN DEFAULT FALSE
      )
    `);

    // Ensure is_principal column exists if table already existed
    const [cols] = await connection.query("SHOW COLUMNS FROM users LIKE 'is_principal'");
    if (cols.length === 0) {
      await connection.query("ALTER TABLE users ADD COLUMN is_principal BOOLEAN DEFAULT FALSE");
    }

    // ... (rest of tables)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        monitorId INT,
        monitor VARCHAR(255),
        monitorEmail VARCHAR(255),
        modulo VARCHAR(255) NOT NULL,
        cuatrimestre VARCHAR(100),
        modalidad VARCHAR(100),
        horario VARCHAR(255),
        salon VARCHAR(100),
        sede VARCHAR(100),
        descripcion TEXT,
        whatsapp VARCHAR(255),
        teams VARCHAR(255)
      )
    `);

    await connection.query(`DROP TABLE IF EXISTS registrations`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentName VARCHAR(255),
        studentEmail VARCHAR(255),
        modulo VARCHAR(255),
        monitorId INT,
        registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        monitorId INT,
        studentName VARCHAR(255),
        date VARCHAR(100),
        rating INT,
        comment TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        monitorId INT,
        studentName VARCHAR(255),
        studentEmail VARCHAR(255),
        reason VARCHAR(255),
        details TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`DROP TABLE IF EXISTS settings`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        config_key VARCHAR(255) PRIMARY KEY,
        config_value TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS static_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_key VARCHAR(100),
        item_value VARCHAR(255)
      )
    `);

    // 2. Insert Data
    console.log('Migrating users...');
    if (data.users) {
      for (const user of data.users) {
        // Generate a simple username from email if not present in legacy data
        const generatedUsername = user.username || user.email.split('@')[0];
        await connection.query(
          'INSERT INTO users (id, nombre, username, email, password, role, sede, cuatrimestre, foto, is_principal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username)',
          [user.id, user.nombre, generatedUsername, user.email, user.password, user.role, user.sede, user.cuatrimestre, user.foto || null, user.is_principal || false]
        );
      }
    }

    // Create Principal Admin if not exists
    await connection.query(
      'INSERT INTO users (nombre, username, email, password, role, is_principal) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = "admin" AND is_principal = TRUE)',
      ['Admin Principal', 'admin_principal', 'admin@monitores.com', 'admin123', 'admin', true]
    );

    // Create Principal Dev if not exists
    await connection.query(
      'INSERT INTO users (nombre, username, email, password, role, is_principal) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = "dev" AND is_principal = TRUE)',
      ['Developer Principal', 'dev_principal', 'dev@monitores.com', 'dev123', 'dev', true]
    );

    console.log('Migrating modules...');
    if (data.modules) {
      for (const mod of data.modules) {
        await connection.query(
          'INSERT INTO modules (id, monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, salon, sede, descripcion, whatsapp, teams) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE modulo=VALUES(modulo)',
          [mod.id, mod.monitorId, mod.monitor, mod.monitorEmail, mod.modulo, mod.cuatrimestre, mod.modalidad, mod.horario, mod.salon || null, mod.sede, mod.descripcion, mod.whatsapp || null, mod.teams || null]
        );
      }
    }

    console.log('Updating static data...');
    // Clear old static data to populate with new ones
    await connection.query('DELETE FROM static_data');
    
    const sedes = ["Sede Posgrado", "Sede Centro Historico", "Sede plaza la paz", "sede Soledad"];
    const cuatrimestres = Array.from({length: 15}, (_, i) => `${i + 1}° Cuatrimestre`);
    const modalidades = ["Presencial", "Virtual", "Híbrido"];
    const programas = ["Ingeniería de Sistemas", "Derecho", "Psicología", "Administración"];

    for (const val of sedes) await connection.query('INSERT INTO static_data (data_key, item_value) VALUES (?, ?)', ['sedes', val]);
    for (const val of cuatrimestres) await connection.query('INSERT INTO static_data (data_key, item_value) VALUES (?, ?)', ['cuatrimestres', val]);
    for (const val of modalidades) await connection.query('INSERT INTO static_data (data_key, item_value) VALUES (?, ?)', ['modalidades', val]);
    for (const val of programas) await connection.query('INSERT INTO static_data (data_key, item_value) VALUES (?, ?)', ['programas', val]);

    console.log('Migrating settings...');
    if (data.maintenance) {
      await connection.query(
        'INSERT INTO settings (config_key, config_value) VALUES ("maintenance", ?)',
        [JSON.stringify(data.maintenance)]
      );
    }

    console.log('--- Migration Finished Successfully ---');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
