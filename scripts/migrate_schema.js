import pool from '../backend/utils/mysql.helper.js';

async function migrate() {
  try {
    console.log("Adding createdAt to users...");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    
    console.log("Adding createdAt to modules...");
    await pool.query("ALTER TABLE modules ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    
    console.log("Migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
