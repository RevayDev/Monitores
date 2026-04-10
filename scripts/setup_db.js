import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB Config - Adjust if your MySQL has a password
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: ''
};

const DB_NAME = 'monitores_db';

async function setup() {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);

    console.log(`Checking if database "${DB_NAME}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    console.log(`Database "${DB_NAME}" is ready.`);

    await connection.query(`USE ${DB_NAME}`);

    const sqlScript = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    sede VARCHAR(100),
    cuatrimestre VARCHAR(100),
    foto TEXT,
    restrictions TEXT,
    is_principal BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    teams VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentName VARCHAR(255),
    studentEmail VARCHAR(255),
    modulo VARCHAR(255),
    monitorId INT,
    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT,
    studentName VARCHAR(255),
    date VARCHAR(100),
    rating INT,
    comment TEXT
);

CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT,
    studentName VARCHAR(255),
    studentEmail VARCHAR(255),
    reason VARCHAR(255),
    details TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT
);

CREATE TABLE IF NOT EXISTS static_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_key VARCHAR(100),
    item_value VARCHAR(255)
);
`;

    console.log('Creating tables...');
    const commands = sqlScript.split(';').filter(cmd => cmd.trim());
    for (const cmd of commands) {
      await connection.query(cmd);
    }
    console.log('Tables created successfully.');

    console.log('Populating static data...');
    const sedes = ["Sede plaza la paz", "sede soledad", "sede centro historico", "sede posgrado"];
    const modalidades = ["Presencial", "Virtual", "Híbrido"];
    const cuatrimestres = Array.from({length: 15}, (_, i) => `${i + 1}° Cuatrimestre`);

    await connection.query("DELETE FROM static_data");

    for (const sede of sedes) {
      await connection.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['sedes', sede]);
    }
    for (const mod of modalidades) {
      await connection.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['modalidades', mod]);
    }
    for (const cuat of cuatrimestres) {
      await connection.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['cuatrimestres', cuat]);
    }
    console.log('Static data populated.');

    // Add default principal admin and dev
    console.log('Adding default accounts...');
    const defaultUsers = [
      {
        nombre: 'Admin Principal',
        username: 'admin',
        email: 'admin@monitores.com',
        password: 'admin',
        role: 'admin',
        is_principal: true
      },
      {
        nombre: 'Dev Principal',
        username: 'dev',
        email: 'dev@monitores.com',
        password: 'dev',
        role: 'dev',
        is_principal: true
      }
    ];

    for (const user of defaultUsers) {
      await connection.query(
        "INSERT IGNORE INTO users (nombre, username, email, password, role, is_principal) VALUES (?, ?, ?, ?, ?, ?)",
        [user.nombre, user.username, user.email, user.password, user.role, user.is_principal]
      );
    }
    console.log('Default accounts added.');

    console.log('Setup completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setup();
