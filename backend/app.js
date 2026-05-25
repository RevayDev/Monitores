import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import usersRoutes from './routes/users.routes.js';
import monitoriasRoutes from './routes/monitorias.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import statsRoutes from './routes/stats.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';
import devRoutes from './routes/dev.routes.js';
import supportRoutes from './routes/support.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { blockCheck, ipLimiter } from './middlewares/rateLimiter.middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from './utils/mysql.helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const wrapAsyncHandler = (fn) => {
  if (typeof fn !== 'function' || fn.__isAsyncWrapped) return fn;
  const wrapped = (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
  wrapped.__isAsyncWrapped = true;
  return wrapped;
};

const wrapRouterLayer = (layer) => {
  if (layer?.route?.stack) {
    layer.route.stack.forEach((routeLayer) => {
      routeLayer.handle = wrapAsyncHandler(routeLayer.handle);
    });
  }

  if (layer?.name === 'router' && Array.isArray(layer?.handle?.stack)) {
    layer.handle.stack.forEach(wrapRouterLayer);
  }
};

const wrapAllAsyncRoutes = (expressApp) => {
  if (!Array.isArray(expressApp?._router?.stack)) return;
  expressApp._router.stack.forEach(wrapRouterLayer);
};

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));


const redactBody = (body = {}) => {
  const clone = { ...body };
  ['password', 'confirmPassword', 'token', 'content'].forEach((key) => {
    if (key in clone) clone[key] = '[redacted]';
  });
  return clone;
};

app.use((req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();
  if (!String(req.path || '').startsWith('/api/')) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const userId = Number(req.headers['x-user-id']) || req.user?.id || req.userContext?.userId || null;
    const actionPath = String(req.path || '').replace(/^\/api\//, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
    pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, metadata, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [
        userId,
        'HTTP_' + method + '_' + actionPath,
        'http',
        JSON.stringify({ method, path: req.path, status: res.statusCode, body: redactBody(req.body) }),
        req.ip || null,
        req.headers['user-agent'] || null
      ]
    ).catch((error) => console.error('audit log error:', error.message));
  });
  next();
});

// Static files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Support uploads subfolder (created by support-upload.helper.js on first use)
const supportUploadsDir = path.join(__dirname, 'uploads/support');
if (!fs.existsSync(supportUploadsDir)) {
  fs.mkdirSync(supportUploadsDir, { recursive: true });
}

// Simple logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rate limiting
app.use('/api', blockCheck);
app.use('/api', ipLimiter);

// Routes
app.use('/api', usersRoutes);
app.use('/api', monitoriasRoutes);
app.use('/api', engagementRoutes);
app.use('/api', statsRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', adminRoutes);
app.use('/api', devRoutes);
app.use('/api', supportRoutes);
app.use('/api', aiRoutes);
wrapAllAsyncRoutes(app);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err?.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Database service is unavailable. Please check MySQL and try again.' });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Something went wrong!' });
});

export default app;
