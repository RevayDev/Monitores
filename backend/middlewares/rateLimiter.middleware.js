import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKED_FILE = path.resolve(__dirname, '../data/blocked.json');
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const VIOLATION_THRESHOLD = 3;
const TRACKING_WINDOW_MS = 300_000; // 5 min
const WINDOW_MS = 60_000;

const blocked = new Map();
let persistTimer = null;

// Load persisted blocks on startup
try {
  if (fs.existsSync(BLOCKED_FILE)) {
    const raw = fs.readFileSync(BLOCKED_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    const now = Date.now();
    for (const entry of arr) {
      if (entry.blockedUntil && entry.blockedUntil > now) {
        blocked.set(entry.key, { count: entry.count || 0, blockedUntil: entry.blockedUntil, trackingExpiresAt: entry.trackingExpiresAt || 0 });
      }
    }
  }
} catch (err) {
  console.error('[RateLimiter] Error loading blocked.json:', err.message);
}

const persist = () => {
  try {
    const now = Date.now();
    const entries = [];
    for (const [key, val] of blocked) {
      if ((val.blockedUntil && val.blockedUntil > now) || (val.trackingExpiresAt && val.trackingExpiresAt > now)) {
        entries.push({ key, count: val.count, blockedUntil: val.blockedUntil, trackingExpiresAt: val.trackingExpiresAt });
      }
    }
    const dir = path.dirname(BLOCKED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BLOCKED_FILE, JSON.stringify(entries));
  } catch (err) {
    console.error('[RateLimiter] Error persisting blocks:', err.message);
  }
};

const debouncedPersist = () => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 2000);
};

export const isBlocked = (key) => {
  const entry = blocked.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.blockedUntil > now) return true;
  if (entry.trackingExpiresAt < now) { blocked.delete(key); return false; }
  return false;
};

export const recordViolation = (key) => {
  const now = Date.now();
  let entry = blocked.get(key);
  if (!entry || entry.trackingExpiresAt < now) {
    entry = { count: 0, trackingExpiresAt: now + TRACKING_WINDOW_MS, blockedUntil: 0 };
  }
  entry.count += 1;
  entry.trackingExpiresAt = now + TRACKING_WINDOW_MS;
  if (entry.count >= VIOLATION_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    entry.count = 0;
  }
  blocked.set(key, entry);
  debouncedPersist();
};

export const _resetForTest = () => {
  blocked.clear();
  if (persistTimer) clearTimeout(persistTimer);
};

const ERR_MESSAGES = {
  user: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
  ip: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en un minuto.',
  ai: 'Demasiadas solicitudes a la IA. Intenta de nuevo en un minuto.'
};

const createHandler = (label) => (req, res) => {
  const key = String(req.userId || req.ip || 'unknown');
  recordViolation(key);
  res.status(429).json({ error: ERR_MESSAGES[label] || ERR_MESSAGES.user, retryAfter: 60 });
};

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
  handler: createHandler('user')
});

export const ipLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true, legacyHeaders: false,
  handler: createHandler('ip')
});

export const aiLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 30,
  keyGenerator: (req) => String(req.userId || req.ip || 'unknown'),
  standardHeaders: true, legacyHeaders: false,
  handler: createHandler('ai')
});
