import pool from '../backend/utils/mysql.helper.js';

async function disableMaintenance() {
  try {
    const config = {
      global: false,
      registro: false,
      login: false,
      panelAdmin: false,
      panelMonitor: false,
      monitorias: false
    };
    await pool.query(
      'INSERT INTO settings (config_key, config_value) VALUES ("maintenance", ?) ON DUPLICATE KEY UPDATE config_value = ?',
      [JSON.stringify(config), JSON.stringify(config)]
    );
    console.log('Maintenance disabled successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to disable maintenance:', err);
    process.exit(1);
  }
}

disableMaintenance();
