import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKED_FILE = path.resolve(__dirname, '../data/blocked.json');
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const VIOLATION_THRESHOLD = 3;
const WINDOW_MS = 60_000;

const blocked = new Map();

// Load persisted blocks on startup
try {
  if (fs.existsSync(BLOCKED_FILE)) {
    const raw = fs.readFileSync(BLOCKED_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    const now = Date.now();
    for (const entry of arr) {
      if (entry.blockedUntil > now) {
        blocked.set(entry.key, { count: entry.count, blockedUntil: entry.blockedUntil, expiresAt: entry.expiresAt });
      }
    }
  }
} catch { /* ignore */ }

const persist = () => {
  try {
    const now = Date.now();
    const entries = [];
    for (const [key, val] of blocked) {
      if (val.blockedUntil > now || val.expiresAt > now) {
        entries.push({ key, count: val.count, blockedUntil: val.blockedUntil, expiresAt: val.expiresAt });
      }
    }
    const dir = path.dirname(BLOCKED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BLOCKED_FILE, JSON.stringify(entries));
  } catch { /* ignore */ }
};

const isBlocked = (key) => {
  const entry = blocked.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.blockedUntil > now) return true;
  if (entry.expiresAt < now) { blocked.delete(key); return false; }
  return false;
};

const recordViolation = (key) => {
  const now = Date.now();
  let entry = blocked.get(key);
  if (!entry || entry.expiresAt < now) {
    entry = { count: 0, expiresAt: now + 300_000, blockedUntil: 0 };
  }
  entry.count += 1;
  entry.expiresAt = now + 300_000;
  if (entry.count >= VIOLATION_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    entry.count = 0;
  }
  blocked.set(key, entry);
  persist();
};

const createHandler = (max, label) => (req, res) => {
  const key = String(req.userId || req.ip || 'unknown');
  recordViolation(key);
  const messages = {
    user: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    ip: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en un minuto.',
    ai: 'Demasiadas solicitudes a la IA. Intenta de nuevo en un minuto.'
  };
  res.status(429).json({ error: messages[label] || messages.user, retryAfter: 60 });
};

// ── Pre-check middleware: runs BEFORE rate limiter ─────────────────────
export const blockCheck = (req, res, next) => {
  const key = String(req.userId || req.ip || 'unknown');
  if (isBlocked(key)) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes. Acceso bloqueado temporalmente.',
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000)
    });
  }
  next();
};

export const userLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 200,
  keyGenerator: (req) => String(req.userId || req.ip || 'unknown'),
  standardHeaders: true, legacyHeaders: false,
  handler: createHandler(200, 'user')
});

export const ipLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true, legacyHeaders: false,
  handler: createHandler(100, 'ip')
});

export const aiLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 30,
  keyGenerator: (req) => String(req.userId || req.ip || 'unknown'),
  standardHeaders: true, legacyHeaders: false,
  handler: createHandler(30, 'ai')
});
