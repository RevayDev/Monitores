import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const readDB = async () => {
  return await fs.readJson(DB_PATH);
};

const writeDB = async (data) => {
  await fs.writeJson(DB_PATH, data, { spaces: 2 });
};

export {
  readDB,
  writeDB
};
