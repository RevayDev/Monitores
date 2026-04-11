import pool from './utils/mysql.helper.js';

async function migrateAdvanced() {
  try {
    console.log("Iniciando migración avanzada de esquema...");

    console.log("1. Creando tabla questions...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        module_id INT,
        title VARCHAR(255),
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("2. Creando tabla answers...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT,
        user_id INT,
        content TEXT,
        is_accepted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("3. Creando tabla meal_logs (QR Dinámico)...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        date DATE,
        status VARCHAR(50),
        scanned_at DATETIME
      )
    `);

    console.log("4. Actualizando tabla complaints...");
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS tipo VARCHAR(100)`);
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reported_id INT`);

    console.log("5. Actualizando tabla attendance...");
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS modalidad VARCHAR(100)`);
    await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS estado VARCHAR(100)`);

    console.log(" Migración Avanzada Completada Exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error en migración avanzada:", error);
    process.exit(1);
  }
}

migrateAdvanced();
