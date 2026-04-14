import mysql from 'mysql2/promise';

/**
 * Script de mantenimiento para limpieza profunda de base de datos.
 * Uso: node scripts/reset_db.js
 * 
 * Este script elimina todos los registros de:
 * - attendance (asistencia)
 * - lunch_usage (consumo de comedor)
 * - qr_scan_logs (historial de escaneos)
 * - qr_codes (códigos generados)
 */

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '', // Cambiar si tu MySQL tiene contraseña
  database: 'monitores_db',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

async function runReset() {
  console.log('\x1b[33m%s\x1b[0m', '--- INICIANDO LIMPIEZA PROFUNDA (WIPE) ---');
  
  try {
    const tables = ['attendance', 'lunch_usage', 'qr_scan_logs', 'qr_codes'];
    
    for (const table of tables) {
      console.log(`[OK] Limpiando tabla: ${table}...`);
      await pool.query(`DELETE FROM ${table}`);
      // Opcional: Reiniciar auto-increment
      await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
    
    console.log('\x1b[32m%s\x1b[0m', '--- TODO LIMPIO: LA BASE DE DATOS ESTA DESDE CERO ---');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error durante la limpieza:', error.message);
  } finally {
    await pool.end();
  }
}

runReset();
