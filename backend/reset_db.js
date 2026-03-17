import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
};

async function reset() {
  try {
    const connection = await mysql.createConnection(config);
    await connection.query('DROP DATABASE IF EXISTS monitores_db');
    console.log('Database monitores_db dropped successfully.');
    await connection.end();
  } catch (error) {
    console.error('Failed to drop DB:', error);
  }
}

reset();
