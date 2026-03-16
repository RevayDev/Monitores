const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const readDB = async () => {
  return await fs.readJson(DB_PATH);
};

const writeDB = async (data) => {
  await fs.writeJson(DB_PATH, data, { spaces: 2 });
};

module.exports = {
  readDB,
  writeDB
};
