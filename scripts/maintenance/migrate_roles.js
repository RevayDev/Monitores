import pool from '../../backend/utils/mysql.helper.js';

async function migrateRoles() {
  try {
    console.log("Migrando esquema de usuarios...");
    
    console.log("Agregando columna tipo_monitor a users...");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_monitor VARCHAR(50);");
    
    console.log("Agregando columna tipo_soporte a users...");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_soporte VARCHAR(50);");
    
    console.log("Migración completada exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error en migración:", error);
    process.exit(1);
  }
}

migrateRoles();
