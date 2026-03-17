import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

export const deleteFile = (fileUrl) => {
  if (!fileUrl) return;
  try {
    // Only delete if it's a local upload
    if (fileUrl.includes('/uploads/')) {
      const filename = fileUrl.split('/uploads/').pop();
      const filePath = path.join(UPLOADS_DIR, filename);
      console.log(`Attempting to delete file: ${filePath}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
      } else {
        console.warn(`File not found for deletion: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error deleting file: ${fileUrl}`, error);
  }
};

export default upload;
