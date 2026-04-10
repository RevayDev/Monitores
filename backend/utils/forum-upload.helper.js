import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FORUM_UPLOADS_DIR = path.join(__dirname, '../uploads/forum');

if (!fs.existsSync(FORUM_UPLOADS_DIR)) {
  fs.mkdirSync(FORUM_UPLOADS_DIR, { recursive: true });
}

const sanitizeBaseName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'file';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FORUM_UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = sanitizeBaseName(path.basename(file.originalname || 'file', ext));
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${base}${ext}`);
  }
});

const allowedMimeTypes = [
  'application/octet-stream',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed'
];

const forumUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || '';
    if (mime.startsWith('image/') || mime.startsWith('video/') || allowedMimeTypes.includes(mime)) {
      return cb(null, true);
    }
    cb(new Error('Tipo de archivo no permitido para foro.'));
  }
});

export default forumUpload;
