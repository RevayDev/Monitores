import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'monitores_db'
};

async function migrateV2() {
  console.log('--- Starting MySQL Migration V2 ---');
  
  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to database.');

    console.log('Adding columns to users table...');
    try {
      await connection.query("ALTER TABLE users ADD COLUMN tipo_monitor ENUM('academico', 'administrativo', 'ambos') DEFAULT 'academico'");
      await connection.query("ALTER TABLE users ADD COLUMN tipo_soporte ENUM('dev', 'chef') DEFAULT 'dev'");
      console.log('Users columns added.');
    } catch (e) {
      console.log('Users columns already exist or error:', e.message);
    }

    console.log('Adding columns to attendance table...');
    try {
      await connection.query("ALTER TABLE attendance ADD COLUMN modalidad ENUM('Virtual', 'Presencial', 'Híbrido') DEFAULT 'Presencial'");
      await connection.query("ALTER TABLE attendance ADD COLUMN estado ENUM('Asistió', 'No asistió') DEFAULT 'Asistió'");
      console.log('Attendance columns added.');
    } catch (e) {
      console.log('Attendance columns already exist or error:', e.message);
    }

    console.log('Creating questions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        module_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Creating answers table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        is_accepted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Creating meal_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'reclamado',
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('--- Migration V2 Finished Successfully ---');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration V2 failed:', err);
    process.exit(1);
  }
}

migrateV2();
