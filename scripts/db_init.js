import { initializeDatabase } from '../backend/database/index.js';

initializeDatabase()
  .then(() => {
    console.log('[db:init] OK');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[db:init] ERROR:', error?.message || error);
    process.exit(1);
  });
