import pool from '../backend/utils/mysql.helper.js';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';

const seedRoots = async () => {
  const hashedAdmin = await bcrypt.hash(process.env.ROOT_ADMIN_PASSWORD || 'Admin123*', 10);
  const hashedDev = await bcrypt.hash(process.env.ROOT_DEV_PASSWORD || 'Dev123*', 10);

  await pool.query(`
    INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, is_principal, is_active, createdAt)
    SELECT ?, ?, ?, ?, 'admin', 'Sede Virtual', 'N/A', 1, 1, NOW()
    FROM DUAL
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin' AND is_principal=1)
  `, ['Admin Principal', 'root_admin', process.env.ROOT_ADMIN_EMAIL || 'root_admin@demo.local', hashedAdmin]);

  await pool.query(`
    INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, is_principal, is_active, createdAt)
    SELECT ?, ?, ?, ?, 'dev', 'Sede Virtual', 'N/A', 1, 1, NOW()
    FROM DUAL
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='dev' AND is_principal=1)
  `, ['Dev Principal', 'root_dev', process.env.ROOT_DEV_EMAIL || 'root_dev@demo.local', hashedDev]);
};

(async () => {
  try {
    await seedRoots();
    console.log('[db:seed:roots] OK');
    process.exit(0);
  } catch (error) {
    console.error('[db:seed:roots] ERROR:', error?.message || error);
    process.exit(1);
  }
})();
