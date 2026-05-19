import pool from '../backend/utils/mysql.helper.js';

const requiredTables = [
  'users',
  'modules',
  'registrations',
  'attendance',
  'settings',
  'static_data',
  'activity_logs'
];

const verifyTables = async () => {
  for (const table of requiredTables) {
    const [rows] = await pool.query('SHOW TABLES LIKE ?', [table]);
    if (!rows.length) throw new Error(`Missing table: ${table}`);
  }
};

const verifyWriteRead = async () => {
  const [result] = await pool.query(
    'INSERT INTO activity_logs (user_id, action, entity_type, metadata, created_at) VALUES (?, ?, ?, ?, NOW())',
    [null, 'DB_SMOKE_TEST', 'system', JSON.stringify({ ok: true })]
  );
  const insertedId = result.insertId;
  const [rows] = await pool.query('SELECT id, action FROM activity_logs WHERE id = ?', [insertedId]);
  if (!rows.length || rows[0].action !== 'DB_SMOKE_TEST') {
    throw new Error('Read-after-write verification failed');
  }
  await pool.query('DELETE FROM activity_logs WHERE id = ?', [insertedId]);
};

(async () => {
  try {
    await verifyTables();
    await verifyWriteRead();
    console.log('[db:check] OK - schema + write/read verified');
    process.exit(0);
  } catch (error) {
    console.error('[db:check] ERROR:', error?.message || error);
    process.exit(1);
  }
})();
