import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'monitores_db'
};

async function run() {
  const connection = await mysql.createConnection(config);
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS forum_presence (
        forum_id INT NOT NULL,
        user_id INT NOT NULL,
        is_typing TINYINT(1) DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        PRIMARY KEY (forum_id, user_id)
      );
    `);
    console.log('Table forum_presence created or already exists.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await connection.end();
  }
}

run();
