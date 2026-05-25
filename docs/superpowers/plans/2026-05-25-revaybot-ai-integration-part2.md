# RevayBot AI Integration — Part 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a local AI assistant (RevayBot) powered by Ollama into MONITORES with role-based knowledge, 30-min session TTL, and reusable chat modal.

**Architecture:** Backend AI service connects to local Ollama (`localhost:11434`), loads .md knowledge files per role, manages sessions with 30-min TTL. Frontend uses a reusable AiChatModal component with floating button in each panel. SupportChat uses RevayBot as first responder before human transfer.

**Tech Stack:** Ollama (local), tinyllama + phi3:mini, Node.js/Express, React 19, Tailwind CSS 4

---

## File Structure

**Backend — new files:**
- `backend/services/ai.service.js` — Ollama client, session manager, context builder
- `backend/controllers/ai.controller.js` — thin handlers
- `backend/routes/ai.routes.js` — POST /api/ai/session, /api/ai/ask, GET /api/ai/session/:id/history
- `backend/knowledge/public/plataforma.md` — public knowledge base
- `backend/knowledge/technical/arquitectura.md` — technical knowledge (admin/dev only)

**Backend — modified files:**
- `backend/app.js` — add AI routes with aiLimiter

**Frontend — new files:**
- `frontend/src/components/AiChatModal.jsx` — reusable modal with chat, timer, download

**Frontend — modified files:**
- `frontend/src/pages/AdminDashboard.jsx` — add AiChatModal
- `frontend/src/pages/DevDashboard.jsx` — add AiChatModal
- `frontend/src/components/SupportChat.jsx` — RevayBot as first responder

---

### Task 1: Create AI service (backend)

**Files:**
- Create: `backend/services/ai.service.js`

- [ ] **Step 1: Write the AI service**

Create `backend/services/ai.service.js`:

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_URL = 'http://localhost:11434';

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;

// ── Knowledge loading ──────────────────────────────────────────────────
const loadMdFiles = (dir) => {
  const fullPath = path.resolve(__dirname, '..', dir);
  let content = '';
  try {
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        content += fs.readFileSync(path.join(fullPath, file), 'utf-8') + '\n\n';
      }
    }
  } catch { /* ignore */ }
  return content;
};

const getKnowledge = (role) => {
  const publicKnowledge = loadMdFiles('knowledge/public');
  if (['admin', 'dev'].includes(String(role || '').toLowerCase())) {
    return publicKnowledge + '\n' + loadMdFiles('knowledge/technical');
  }
  return publicKnowledge;
};

const SYSTEM_PROMPT = `Soy RevayBot, un asistente virtual creado por Roberto Jiménez, estudiante de cuarto cuatrimestre de la IUB. Estoy aquí para ayudarte con la plataforma MONITORES, un sistema académico de gestión de monitorías universitarias. Soy amable, hablo claro y con pocas palabras. Guío paso a paso, y si necesitas más detalles, los doy sin problema. Si no sé algo, lo digo directamente y ofrezco alternativas.`;

// ── Ollama call ────────────────────────────────────────────────────────
const callOllama = async (messages) => {
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
  const model = 'phi3:mini';
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.7, max_tokens: 500 } })
    });
    if (!res.ok) throw new Error('Ollama returned ' + res.status);
    const data = await res.json();
    return data.response || '';
  } catch {
    // Fallback to tinyllama
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tinyllama', prompt, stream: false, options: { temperature: 0.7, max_tokens: 300 } })
      });
      if (!res.ok) throw new Error('Ollama fallback failed');
      const data = await res.json();
      return data.response || '';
    } catch {
      return null;
    }
  }
};

// ── Session management ────────────────────────────────────────────────
const cleanExpired = () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(id);
  }
};
setInterval(cleanExpired, 60_000);

export const createSession = (userId, role) => {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, { userId, role, messages: [], expiresAt: Date.now() + SESSION_TTL, knowledge: getKnowledge(role) });
  return { sessionId: id, expiresAt: Date.now() + SESSION_TTL };
};

export const askQuestion = async (sessionId, message, user) => {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Sesión expirada o inválida. Inicia una nueva conversación.' };
  if (Date.now() > session.expiresAt) { sessions.delete(sessionId); return { error: 'Sesión expirada. Inicia una nueva conversación.' }; }

  session.expiresAt = Date.now() + SESSION_TTL;
  session.messages.push({ role: 'user', content: message });

  const contextMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: 'Conocimiento:\n' + session.knowledge },
    ...session.messages.slice(-20)
  ];

  const response = await callOllama(contextMessages);
  if (response === null) {
    session.messages.push({ role: 'assistant', content: 'Lo siento, el asistente IA no está disponible en este momento. Intenta más tarde.' });
    return { response: session.messages[session.messages.length - 1].content, expiresAt: session.expiresAt };
  }

  session.messages.push({ role: 'assistant', content: response });
  return { response, expiresAt: session.expiresAt };
};

export const getSessionHistory = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return session.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'user' ? 'Usuario' : 'RevayBot',
    content: m.content
  }));
};
```

- [ ] **Step 2: Verify syntax**

```bash
cd C:\Users\RevayDev\Desktop\17\Monitores\backend
node --check services/ai.service.js
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add backend/services/ai.service.js
git commit -m "feat: create AI service with Ollama integration and session management"
```

---

### Task 2: Create AI controller and routes

**Files:**
- Create: `backend/controllers/ai.controller.js`
- Create: `backend/routes/ai.routes.js`
- Modify: `backend/app.js`

- [ ] **Step 1: Write AI controller**

Create `backend/controllers/ai.controller.js`:

```javascript
import { createSession, askQuestion, getSessionHistory } from '../services/ai.service.js';

export const createAiSession = (req, res) => {
  try {
    const user = req.user || req.userContext || {};
    const result = createSession(user.id || 'anon', user.role || 'student');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const askAi = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId y message son requeridos.' });
    const user = req.user || req.userContext || {};
    const result = await askQuestion(sessionId, message, user);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAiHistory = (req, res) => {
  try {
    const history = getSessionHistory(req.params.id);
    if (!history) return res.status(404).json({ error: 'Sesión no encontrada.' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

- [ ] **Step 2: Write AI routes**

Create `backend/routes/ai.routes.js`:

```javascript
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { createAiSession, askAi, getAiHistory } from '../controllers/ai.controller.js';

const router = Router();

router.post('/ai/session', authMiddleware, createAiSession);
router.post('/ai/ask', authMiddleware, aiLimiter, askAi);
router.get('/ai/session/:id/history', authMiddleware, getAiHistory);

export default router;
```

- [ ] **Step 3: Mount routes in app.js**

Read `backend/app.js` and add:
```javascript
import aiRoutes from './routes/ai.routes.js';
```
at the top, and after the `supportRoutes` line:
```javascript
app.use('/api', aiRoutes);
```

- [ ] **Step 4: Verify**

```bash
cd C:\Users\RevayDev\Desktop\17\Monitores\backend
node --check controllers/ai.controller.js
node --check routes/ai.routes.js
node --check app.js
```
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/ai.controller.js backend/routes/ai.routes.js backend/app.js
git commit -m "feat: add AI routes, controller, and mount in app"
```

---

### Task 3: Create knowledge .md files

**Files:**
- Create: `backend/knowledge/public/plataforma.md`
- Create: `backend/knowledge/technical/arquitectura.md`

- [ ] **Step 1: Create public knowledge file**

Create `backend/knowledge/public/plataforma.md` with the knowledge from the spec document (sections 1-3: qué es MONITORES, tipos de usuarios, funcionalidades principales).

- [ ] **Step 2: Create technical knowledge file**

Create `backend/knowledge/technical/arquitectura.md` with:
- Arquitectura por capas (Routes → Controllers → Services → MySQL)
- Tablas principales (users, modules, registrations, attendance)
- Tecnologías (React 19, Vite, Tailwind 4, Express, MySQL2, ES Modules)
- Problemas comunes (estadísticas en 0, rutas faltantes, migración JSON → MySQL)
- Middlewares y logging

**Content:**
```markdown
# ARQUITECTURA TÉCNICA

## Capas del backend
Routes → Controllers → Services → MySQL

## Tablas principales
- users: id, nombre, email, role, sede, cuatrimestre, foto
- modules: monitorId, modulo, cuatrimestre, horario, sede
- registrations: studentEmail, moduloId, monitorId
- attendance: monitorId, studentName, date, rating
- support_tickets: id, requester_user_id, category, subject, status
- support_ticket_messages: ticket_id, sender_id, message
- notifications: user_id, type, message, is_read

## Tecnologías
- Frontend: React 19, Vite, Tailwind CSS 4, Lucide React, Framer Motion
- Backend: Node.js, Express, ES Modules
- DB: MySQL, mysql2
- Persistencia local: localStorage

## Errores comunes
- Estadísticas en 0 → falta ruta GET /api/attendance
- Socket no conecta → verificar VITE_SOCKET_URL y path /api/socket.io
- Login falla → verificar x-user-id y x-user-role headers

## Migración histórica
El proyecto migró de JSON/localStorage a MySQL por escalabilidad.
```

- [ ] **Step 3: Commit**

```bash
git add backend/knowledge/public/plataforma.md backend/knowledge/technical/arquitectura.md
git commit -m "feat: add knowledge base .md files for RevayBot"
```

---

### Task 4: Create AiChatModal component

**Files:**
- Create: `frontend/src/components/AiChatModal.jsx`

- [ ] **Step 1: Write the AiChatModal component**

Create `frontend/src/components/AiChatModal.jsx` (full component):

```jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Bot, X, Send, Loader2, Download, Clock, RefreshCw } from 'lucide-react';
import { request } from '../services/api';
import { ToastContext } from '../context/ToastContext';

const SESSION_TTL = 30 * 60 * 1000;

const AiChatModal = ({ panelName = 'general' }) => {
  const { showToast } = useContext(ToastContext);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  useEffect(() => {
    if (isOpen && !sessionId) startSession();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!sessionId || expired) return;
    const tick = () => {
      const saved = localStorage.getItem(`ai_session_${sessionId}`);
      if (saved) {
        const expiresAt = JSON.parse(saved).expiresAt;
        const left = Math.max(0, expiresAt - Date.now());
        setTimeLeft(left);
        if (left <= 0) { setExpired(true); setSessionId(null); localStorage.removeItem(`ai_session_${sessionId}`); }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionId, expired]);

  const startSession = async () => {
    try {
      const data = await request('/ai/session', { method: 'POST' });
      setSessionId(data.sessionId);
      setExpired(false);
      setMessages([]);
      localStorage.setItem(`ai_session_${data.sessionId}`, JSON.stringify({ expiresAt: data.expiresAt }));
      setTimeLeft(data.expiresAt - Date.now());
    } catch { showToast('Error al iniciar sesión con RevayBot.', 'error'); }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    try {
      const data = await request('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: trimmed })
      });
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error }]);
        if (data.error.includes('expirada')) setExpired(true);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        const saved = localStorage.getItem(`ai_session_${sessionId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.expiresAt = data.expiresAt;
          localStorage.setItem(`ai_session_${sessionId}`, JSON.stringify(parsed));
        }
      }
    } catch { showToast('Error al comunicarse con RevayBot.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!sessionId) return;
    try {
      const history = await request(`/ai/session/${sessionId}/history`);
      if (!Array.isArray(history)) return;
      let text = `RevayBot — Conversación\nFecha: ${new Date().toLocaleString()}\n\n`;
      history.forEach(m => { text += `${m.role}: ${m.content}\n\n`; });
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `revaybot-${panelName}-${Date.now()}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } catch { showToast('Error al descargar la conversación.', 'error'); }
  };

  const formatTime = (ms) => {
    if (ms === null) return '';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-all active:scale-90 border-none">
          <Bot size={22} />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-blue text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="text-xs font-black">RevayBot</p>
                <p className="text-[9px] text-white/70">{panelName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {sessionId && !expired && (
                <button onClick={handleDownload} title="Descargar conversación"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors border-none bg-transparent text-white/80 hover:text-white">
                  <Download size={14} />
                </button>
              )}
              {timeLeft !== null && !expired && (
                <span className="text-[9px] font-black text-white/80 flex items-center gap-1">
                  <Clock size={10} /> {formatTime(timeLeft)}
                </span>
              )}
              <button onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors border-none bg-transparent text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 && !expired && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4">
                <Bot size={36} className="text-slate-300 mb-3" />
                <p className="text-sm font-black text-slate-500">¡Hola! Soy RevayBot</p>
                <p className="text-[11px] text-slate-400 mt-1">Pregúntame sobre la plataforma MONITORES.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-blue text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-slate-800 rounded-tl-none shadow-sm'
                }`}>
                  <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Expired overlay */}
          {expired && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center space-y-2">
              <p className="text-xs font-black text-slate-500">⏰ Sesión expirada</p>
              <button onClick={startSession}
                className="px-4 py-2 bg-brand-blue text-white text-[10px] font-black rounded-xl flex items-center gap-1.5 mx-auto border-none">
                <RefreshCw size={12} /> Nueva conversación
              </button>
            </div>
          )}

          {/* Input */}
          {!expired && (
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 pr-2 pl-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Pregunta a RevayBot..." rows={1}
                  className="flex-1 resize-none outline-none text-xs font-medium max-h-20 py-1 leading-relaxed border-none bg-transparent"
                  style={{ minHeight: '24px' }} />
                <button onClick={handleSend} disabled={!inputValue.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-gray-900 hover:bg-black text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shrink-0 border-none">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AiChatModal;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/AiChatModal.jsx
git commit -m "feat: create AiChatModal reusable component"
```

---

### Task 5: Add AiChatModal to Admin and Dev dashboards

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx`
- Modify: `frontend/src/pages/DevDashboard.jsx`

- [ ] **Step 1: Add import and component to AdminDashboard**

In `AdminDashboard.jsx`, add the import:
```javascript
import AiChatModal from '../components/AiChatModal';
```

And add the component just before the closing `</div>` of the return:
```jsx
<AiChatModal panelName="admin" />
```

- [ ] **Step 2: Add import and component to DevDashboard**

Same pattern:
```javascript
import AiChatModal from '../components/AiChatModal';
```
And:
```jsx
<AiChatModal panelName="dev" />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminDashboard.jsx frontend/src/pages/DevDashboard.jsx
git commit -m "feat: add AiChatModal to admin and dev dashboards"
```

---

### Task 6: Integrate RevayBot in SupportChat as first responder

**Files:**
- Modify: `frontend/src/components/SupportChat.jsx`

- [ ] **Step 1: Read current SupportChat.jsx to understand the bot flow**

The SupportChat already has a `detectIntent` function and a bot mode. We need to replace the local bot intent detection with AI-powered responses from RevayBot.

- [ ] **Step 2: Add RevayBot integration**

In the bot mode handler (around line 661 where `detectIntent` is called), replace the local intent logic with:

```javascript
// ── BOT MODE — RevayBot AI response ──────────────────────────────
} else if (chatMode === 'bot') {
  setMessages(prev => [...prev, {
    id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario',
    sender_role: 'user', text: fullMessage, time: new Date(),
  }]);

  // Show typing indicator
  setIsBotTyping(true);
  try {
    // Create AI session if needed
    if (!aiSessionRef.current) {
      const sessionRes = await request('/ai/session', { method: 'POST' });
      aiSessionRef.current = sessionRes.sessionId;
      // Extend session TTL on every message
    }
    const res = await request('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ sessionId: aiSessionRef.current, message: trimmed })
    });
    setIsBotTyping(false);
    if (res && res.response) {
      addBotMessage(res.response, 500);
    } else {
      addBotMessage('No pude procesar tu consulta. ¿Quieres que te conecte con un asesor humano?', 500);
    }
  } catch {
    setIsBotTyping(false);
    addBotMessage('Hubo un error. ¿Quieres hablar con un asesor humano?', 500);
  }
```

But also handle the "asesor" keyword — if the user asks for a human or RevayBot explicitly says it can't answer, trigger the transfer flow.

Actually, the cleaner approach is:
1. Add a state `aiSessionRef` to track the RevayBot session
2. In bot mode, instead of `detectIntent`, call RevayBot AI
3. If AI can't answer or user says "asesor", call `requestAdvisor()`
4. Set a flag `transferredToHuman` that prevents RevayBot from responding again until the chat is closed

The exact implementation requires careful integration with the existing SupportChat code. For the plan, note the approach:

1. Add `aiSessionRef = useRef(null)` and `transferredToHumanRef = useRef(false)`
2. In the bot `handleSend` flow, if `!transferredToHumanRef.current`, call RevayBot
3. If AI response indicates it can't help OR user message contains "asesor", call `requestAdvisor()` and set `transferredToHumanRef.current = true`
4. On `ticket_status_changed` with closed, reset `transferredToHumanRef.current = false`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SupportChat.jsx
git commit -m "feat: integrate RevayBot AI in SupportChat as first responder"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify backend syntax**

```bash
cd C:\Users\RevayDev\Desktop\17\Monitores\backend
node --check services/ai.service.js
node --check controllers/ai.controller.js
node --check routes/ai.routes.js
node --check app.js
```

- [ ] **Step 2: Check Ollama connectivity (if available)**

```bash
curl -s http://localhost:11434/api/tags | head -5
```

- [ ] **Step 3: Final commit**

```bash
cd C:\Users\RevayDev\Desktop\17\Monitores
git add -A
git commit -m "feat: complete RevayBot AI integration (Part 2)"
```
