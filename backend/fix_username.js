import pool from './utils/mysql.helper.js';

async function fix() {
  try {
    console.log("Checking for username column in users table...");
    const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'username'");
    
    if (cols.length === 0) {
      console.log("Adding username column...");
      await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE AFTER nombre");
      
      console.log("Populating usernames for existing users based on email...");
      const [users] = await pool.query("SELECT id, email FROM users WHERE username IS NULL");
      
      for (const user of users) {
        let generatedUsername = user.email.split('@')[0];
        // Ensure no duplicates just in case
        if (users.filter(u => u.email.split('@')[0] === generatedUsername).length > 1) {
             generatedUsername += '_' + user.id;
        }
        await pool.query("UPDATE users SET username = ? WHERE id = ?", [generatedUsername, user.id]);
        console.log(`Set username ${generatedUsername} for user ${user.id}`);
      }
      
      console.log("Migration complete.");
    } else {
      console.log("username column already exists.");
      
      // Also try to populate existing blank ones if any
      const [users] = await pool.query("SELECT id, email FROM users WHERE username IS NULL OR username = ''");
      for (const user of users) {
        const generatedUsername = user.email.split('@')[0] + '_' + user.id;
        await pool.query("UPDATE users SET username = ? WHERE id = ?", [generatedUsername, user.id]);
        console.log(`Set username ${generatedUsername} for user ${user.id} (fixing empty)`);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

fix();
