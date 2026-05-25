# Support Chat Redesign — Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow end-users to close their own chat, add rate limiting to protect the server, and redesign the admin SupportTicketPanel with better UI, icons, and responsive layout.

**Architecture:** Three parallel concerns: (1) a new backend close-ticket endpoint + frontend close flow in SupportChat, (2) a rate-limiting middleware with attack detection applied to API routes, (3) a full visual redesign of SupportTicketPanel with responsive breakpoints and icon enhancements.

**Tech Stack:** Node.js/Express backend (express-rate-limit), React frontend (socket.io, framer-motion, tailwindcss), MySQL (support_tickets table)

---

## File Structure

**Backend — new files:**
- `backend/middlewares/rateLimiter.middleware.js` — rate limiter factory + attack detector

**Backend — modified files:**
- `backend/services/support.service.js` — add `closeTicket()` method (lines ~345-405)
- `backend/controllers/support.controller.js` — add `closeSupportTicket` handler (after line ~77)
- `backend/routes/support.routes.js` — add `POST /support/tickets/:id/close` (after line ~14)
- `backend/app.js` — apply rate limiters (after line ~30)
- `backend/package.json` — add `express-rate-limit` dependency

**Frontend — modified files:**
- `frontend/src/services/api.js` — add `closeSupportTicket()` function (after line ~284)
- `frontend/src/components/SupportChat.jsx` — close button, bot close question, close flow
- `frontend/src/components/SupportTicketPanel.jsx` — full redesign

---

### Task 1: Add express-rate-limit dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install express-rate-limit**

Run:
```bash
cd backend
npm install express-rate-limit
```

- [ ] **Step 2: Verify in package.json**

Run:
```bash
npm ls express-rate-limit
```
Expected: shows `express-rate-limit@x.y.z`

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add express-rate-limit dependency"
```

---

### Task 2: Create rate limiter middleware with attack detection

**Files:**
- Create: `backend/middlewares/rateLimiter.middleware.js`

- [ ] **Step 1: Write the middleware**

Create `backend/middlewares/rateLimiter.middleware.js`:

```javascript
import rateLimit from 'express-rate-limit';

// ── Attack detection store ─────────────────────────────────────────────
const blockedEntries = new Map();

const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 min
const VIOLATION_THRESHOLD = 3; // 3x over limit triggers block

const loadBlockedFromDisk = () => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const file = path.resolve('data/blocked.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      const now = Date.now();
      data.forEach(entry => {
        const remaining = entry.expiresAt - now;
        if (remaining > 0) blockedEntries.set(entry.key, { count: entry.count, expiresAt: entry.expiresAt, blockedUntil: entry.blockedUntil });
      });
    }
  } catch { /* no-op */ }
};
loadBlockedFromDisk();

const saveBlockedToDisk = () => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.resolve('data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const entries = [];
    blockedEntries.forEach((val, key) => {
      if (val.expiresAt > Date.now()) entries.push({ key, count: val.count, expiresAt: val.expiresAt, blockedUntil: val.blockedUntil });
    });
    fs.writeFileSync(path.resolve('data/blocked.json'), JSON.stringify(entries));
  } catch { /* no-op */ }
};

const checkBlocked = (key) => {
  const entry = blockedEntries.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.blockedUntil && now < entry.blockedUntil) return true;
  if (entry.expiresAt < now) { blockedEntries.delete(key); return false; }
  return false;
};

const recordViolation = (key) => {
  const now = Date.now();
  const entry = blockedEntries.get(key) || { count: 0, expiresAt: now + 300_000, blockedUntil: null };
  entry.count += 1;
  if (entry.count >= VIOLATION_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    entry.count = 0;
  }
  entry.expiresAt = now + 300_000;
  blockedEntries.set(key, entry);
  saveBlockedToDisk();
};

// ── Custom handler to detect attacks ──────────────────────────────────
const createHandler = (limiterName) => (req, res, next) => {
  const key = req.userId || req.ip || 'unknown';
  if (checkBlocked(key)) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes. Acceso bloqueado temporalmente.',
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000)
    });
  }
  // Override the default handler to track violations
  rateLimit({
    windowMs: 60_000,
    max: 999999, // will be overridden per limiter
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      recordViolation(key);
      res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
        retryAfter: 60
      });
    }
  })(req, res, next);
};

// ── Limiters ──────────────────────────────────────────────────────────
export const userLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  keyGenerator: (req) => String(req.userId || req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const key = req.userId || req.ip || 'unknown';
    recordViolation(key);
    res.status(429).json({
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
      retryAfter: 60
    });
  }
});

export const ipLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const key = req.ip || 'unknown';
    recordViolation(key);
    res.status(429).json({
      error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en un minuto.',
      retryAfter: 60
    });
  }
});

export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyGenerator: (req) => String(req.userId || req.ip || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const key = req.userId || req.ip || 'unknown';
    recordViolation(key);
    res.status(429).json({
      error: 'Demasiadas solicitudes a la IA. Intenta de nuevo en un minuto.',
      retryAfter: 60
    });
  }
});
```

Wait — this has bugs (`await import` inside non-async function). Let me fix to use sync fs:

- [ ] **Step 1: Write the rate limiter middleware correctly**

Create `backend/middlewares/rateLimiter.middleware.js`:

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/middlewares/rateLimiter.middleware.js
git commit -m "feat: add rate limiter middleware with attack detection"
```

---

### Task 3: Apply rate limiters to backend routes

**Files:**
- Modify: `backend/app.js`

- [ ] **Step 1: Read app.js to find route mounting points**

Read `backend/app.js` to find where routes are mounted.

- [ ] **Step 2: Add imports and middleware**

Add at the top of `backend/app.js`:
```javascript
import { blockCheck, ipLimiter, userLimiter } from './middlewares/rateLimiter.middleware.js';
```

Add before route mounting (after body-parser middleware):
```javascript
app.use('/api/', blockCheck);       // Check blocks before any rate limiting
app.use('/api/', ipLimiter);        // Global IP-based rate limit
app.use('/api/support', userLimiter); // Stricter user-based limit for support
```

- [ ] **Step 3: Commit**

```bash
git add backend/app.js
git commit -m "feat: apply rate limiters to API routes"
```

---

### Task 4: Add closeTicket backend endpoint

**Files:**
- Modify: `backend/services/support.service.js` (add `closeTicket` method)
- Modify: `backend/controllers/support.controller.js` (add handler)
- Modify: `backend/routes/support.routes.js` (add route)

- [ ] **Step 1: Add closeTicket method to support.service.js**

Add after the `deleteTicket` method (around line ~340):

```javascript
async closeTicket(ticketId, actor) {
    const [existing] = await pool.query('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    const ticket = existing[0];
    if (!ticket) throw new Error('Ticket no encontrado.');
    if (ticket.status === 'closed') throw new Error('El ticket ya esta cerrado.');

    await pool.query(
      `UPDATE support_tickets SET status = 'closed', updated_at = NOW() WHERE id = ?`,
      [ticketId]
    );

    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [actor?.id || null, 'SUPPORT_TICKET_CLOSED_BY_USER', 'support_ticket', ticketId, JSON.stringify({ previousStatus: ticket.status })]
    );

    // Emit socket events
    try {
      const { getIo } = await import('../socket.js');
      const io = getIo();
      io.to(`ticket_chat_${ticketId}`).emit('ticket_status_changed', { status: 'closed' });
    } catch { /* ignore */ }
    notifyStaffTicketUpdate({ action: 'closed_by_user', ticketId });

    return { ok: true, message: 'Chat cerrado correctamente.' };
  }
```

- [ ] **Step 2: Add controller handler**

Add after the `assignTicketToAdvisor` export (around line ~77 in controller):

```javascript
const closeSupportTicket = async (req, res) => {
  try {
    const result = await supportService.closeTicket(req.params.id, req.user || null);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

And add to the default export object:
```javascript
closeSupportTicket,
```

- [ ] **Step 3: Add route**

Add to `support.routes.js` after the assign route:
```javascript
router.post('/tickets/:id/close', authMiddleware, requireUserContext, controller.closeSupportTicket);
```

- [ ] **Step 4: Commit**

```bash
git add backend/services/support.service.js backend/controllers/support.controller.js backend/routes/support.routes.js
git commit -m "feat: add closeTicket endpoint for users to close own chat"
```

---

### Task 5: Add closeSupportTicket to frontend API

**Files:**
- Modify: `frontend/src/services/api.js`

- [ ] **Step 1: Read current api.js around line 280-290**

Read `frontend/src/services/api.js` lines 276-290.

- [ ] **Step 2: Add the function**

After `updateSupportTicketStatus` (around line ~284), add:
```javascript
export const closeSupportTicket = (ticketId) => request(`/support/tickets/${ticketId}/close`, {
  method: 'POST'
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat: add closeSupportTicket API function"
```

---

### Task 6: Add close button and bot question to SupportChat

**Files:**
- Modify: `frontend/src/components/SupportChat.jsx`

- [ ] **Step 1: Read current SupportChat.jsx to understand the render flow**

Read `frontend/src/components/SupportChat.jsx` to find:
- Where `chatMode` is rendered
- Where the input area is
- Where bot messages are generated
- The farewell/intent detection

- [ ] **Step 2: Add "Finalizar chat" button**

In the `live` chat mode section (where the input is rendered), add:

```jsx
<button onClick={handleUserCloseChat}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black transition-all">
  <XCircle size={14} /> Finalizar chat
</button>
```

- [ ] **Step 3: Add the handleUserCloseChat function**

```javascript
const handleUserCloseChat = async () => {
  try {
    await closeSupportTicket(ticketId);
    setChatMode('closed');
    showToast('Chat cerrado correctamente.', 'success');
    localStorage.removeItem('support_chat_ticket_id');
  } catch (err) {
    showToast(err.message || 'Error al cerrar el chat.', 'error');
  }
};
```

- [ ] **Step 4: Add reconciliation logic**

When bot detects farewell keywords, show a UI prompt "¿Necesitas algo más?" with two buttons instead of immediately closing. Add a state `showClosePrompt` that gets set to true on farewell intent, then:

```jsx
{showClosePrompt && (
  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
    <span className="text-xs font-bold text-gray-600">¿Necesitas algo más?</span>
    <button onClick={() => { setShowClosePrompt(false); }}
      className="px-3 py-1.5 bg-brand-blue text-white text-[10px] font-black rounded-xl">Sí, necesito ayuda</button>
    <button onClick={handleUserCloseChat}
      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-[10px] font-black rounded-xl">No, gracias</button>
  </div>
)}
```

Replace the current auto-close-on-farewell with setting `showClosePrompt` instead of immediately changing `chatMode`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SupportChat.jsx
git commit -m "feat: add close chat button and bot reconciliation prompt to SupportChat"
```

---

### Task 7: Redesign SupportTicketPanel

**Files:**
- Modify: `frontend/src/components/SupportTicketPanel.jsx`

- [ ] **Step 1: Read current full file**

Re-read the complete SupportTicketPanel.jsx (560 lines) to understand current structure.

- [ ] **Step 2: Rewrite the component with new design**

Key changes:
- **Left panel cards**: more compact, avatar + name + subject + 1-line preview + timestamp + status badge
- **Status filter pills** with emoji icons: 🆕 Nuevo, 📂 Abierto, ⏳ En Progreso, ✅ Respondido, 🔒 Cerrado
- **Right panel header**: clean layout with grouped action buttons (icons + text)
- **Templates**: collapsible `<details>` element instead of always-visible bar
- **Messages**: cleaner bubbles, system messages centered with 🛡️ icon
- **Input**: auto-resize textarea with send icon
- **Mobile responsive**: single-panel with slide transitions, back button
- **Closed state**: 🔒 badge, input disabled, delete button for admin/dev only
- **Icons on buttons**: 🖐️ Tomar control, ✅ Abrir, 🔒 Cerrar, 🗑️ Eliminar

Full rewrite of the component. Preserve all existing logic (socket events, message loading, sending, templates, status changes, etc.) but refactor the JSX layout.

- [ ] **Step 3: Verify the component works**

Check imports are updated (no missing icons from lucide-react):
- `XCircle` for close
- `Check` for answered
- `Lock` for closed
- `ThumbsUp` for take control
- etc.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SupportTicketPanel.jsx
git commit -m "feat: redesign SupportTicketPanel with icons, responsive layout, cleaner UI"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run lint check**

```bash
cd backend && npm run lint 2>&1 || true
cd ../frontend && npm run lint 2>&1 || true
```

Fix any lint errors.

- [ ] **Step 2: Verify rate limiter syntax**

```bash
cd backend && node --check middlewares/rateLimiter.middleware.js
```
Expected: no errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete support chat redesign part 1"
```
