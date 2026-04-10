import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import usersRoutes from './routes/users.routes.js';
import monitoriasRoutes from './routes/monitorias.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Static files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Simple logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', usersRoutes);
app.use('/api', monitoriasRoutes);
app.use('/api', engagementRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Something went wrong!' });
});

export default app;
