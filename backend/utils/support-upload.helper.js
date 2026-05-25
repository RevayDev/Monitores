import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPPORT_UPLOADS_DIR = path.join(__dirname, '../uploads/support');

if (!fs.existsSync(SUPPORT_UPLOADS_DIR)) {
  fs.mkdirSync(SUPPORT_UPLOADS_DIR, { recursive: true });
}

const sanitizeBaseName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'file';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SUPPORT_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = sanitizeBaseName(path.basename(file.originalname || 'file', ext));
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${base}${ext}`);
  }
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const supportUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || '';
    if (mime.startsWith('image/') || allowedMimeTypes.has(mime)) {
      return cb(null, true);
    }
    cb(new Error('Tipo de archivo no permitido para soporte.'));
  }
});

export default supportUpload;
