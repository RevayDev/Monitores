# RevayBot AI Integration — Part 2

## Overview
Integrate a local AI assistant (RevayBot) powered by Ollama into the MONITORES platform. Two models: tinyllama (~1GB) for support chat FAQ, phi3:mini (~2GB) for admin/dev panels and forum. Role-based knowledge access, 30-min session TTL, conversation download, and reusable AiChatModal component.

---

## 1. Personality

**Name:** RevayBot  
**Created by:** Roberto Jiménez, estudiante de cuarto cuatrimestre de la IUB  
**Platform:** MONITORES — sistema académico de gestión de monitorías universitarias  

**System prompt:**
> "Soy RevayBot 👋 Asistente virtual de MONITORES. Estoy aquí para ayudarte con la plataforma, resolver dudas y guiarte rápido y claro. Si algo falla, intentaré decirte qué pasó y cómo solucionarlo paso a paso."

**Style rules:**
- Respuestas cortas (2-3 párrafos máximo)
- Lenguaje tranquilo y directo
- Emojis con moderación (✅ ❌ ⚠️ 💡 🔑)
- Ofrece más detalles si el usuario lo pide
- Mantiene contexto de toda la conversación en la sesión
- Usa el conocimiento de los .md según el rol del usuario

---

## 2. Sessions

- Each session has a 30-minute TTL (time-to-live) from the last interaction
- On expiry: history is cleared on backend, frontend shows "Sesión expirada"
- User can click "Descargar conversación" to download a `.txt` file before expiry
- User can click "Nueva conversación" to start fresh

---

## 3. Knowledge Folders

### `backend/knowledge/public/`
Accessible by all authenticated users. Contains .md files with:
- Institutional info (qué es MONITORES)
- Role descriptions (estudiante, monitor, admin, dev)
- Feature explanations (monitorías, asistencia, quejas)
- FAQ and common issues

### `backend/knowledge/technical/`
Accessible only by admin/dev roles. Contains .md files with:
- System architecture
- Database schema and relationships
- Common backend errors and solutions
- Server configuration
- Log analysis tips

---

## 4. Backend Architecture

### Files

**`backend/services/ai.service.js`**
- `createSession(userId, role)` — creates a session with 30-min TTL, returns sessionId
- `askQuestion(sessionId, message, user)` — loads knowledge .md files by role, builds context, calls Ollama, stores in session history, returns response
- `getSessionHistory(sessionId)` — returns full conversation for download
- `extendSession(sessionId)` — resets TTL
- `cleanExpiredSessions()` — periodic cleanup

**`backend/routes/ai.routes.js`**
- `POST /api/ai/session` — create new session
- `POST /api/ai/ask` — send question (rate limited by aiLimiter)
- `GET /api/ai/session/:id/history` — get conversation for download

**`backend/controllers/ai.controller.js`**
- Thin handlers that call ai.service.js

**`backend/knowledge/public/`** — .md files
**`backend/knowledge/technical/`** — .md files (gitignored from public, only for dev/admin)

### Ollama Integration
- Connects to `http://localhost:11434/api/generate`
- Uses tinyllama for support chat (lighter, faster)
- Uses phi3:mini for admin/dev panels (more capable)
- Falls back to tinyllama if phi3:mini not available
- Request format:
```json
{
  "model": "phi3:mini",
  "prompt": "context...\n\nUser: pregunta\nAssistant:",
  "stream": false,
  "options": { "temperature": 0.7, "max_tokens": 500 }
}
```

### Context Building
When a question arrives:
1. Load all .md files from knowledge folder(s) based on role
2. Concatenate into a context string
3. Prepend system prompt (personality)
4. Append conversation history from session
5. Append user's question
6. Send to Ollama
7. Return response + append to history

### Rate Limiting
- `aiLimiter` from Part 1: 30 requests per minute per user (already applied)

---

## 4.5 SupportChat Integration (RevayBot as First Line)

- RevayBot appears in SupportChat as the first responder before human transfer
- Presentación corta: "Soy RevayBot, asistente de soporte. ¿En qué puedo ayudarte?"
- Si RevayBot no puede responder O el usuario pide "asesor" → transfiere a humano:
  1. Crea un ticket con `category: 'chat'` (mismo flujo que `requestAdvisor`)
  2. RevayBot deja de responder automáticamente
  3. Chat cambia a modo `waiting` → `live` cuando un asesor toma el control
- RevayBot no vuelve a responder hasta que el ticket se cierre
- Una vez cerrado, si el usuario inicia nuevo chat, RevayBot responde de nuevo

---

## 5. Frontend Architecture

### `frontend/src/components/AiChatModal.jsx`
Reusable modal component with:
- Floating button 🤖 (position: fixed, bottom-right, customizible per panel)
- Modal with:
  - Header: "RevayBot 🤖" + timer (30:00 countdown) + "Descargar" + "Cerrar"
  - Messages area: user bubbles (right) + RevayBot bubbles (left) with avatar
  - Typing indicator (animated dots)
  - Input + send button
  - On expiry: overlay "Sesión expirada" + "Nueva conversación" button
- Props:
  - `panelName` (string, for context)
  - `role` (string, for access control)
  - `userId` (number)
  - `position` (optional, custom positioning)

### Integration points
- AdminDashboard: add `<AiChatModal panelName="admin" />`
- DevDashboard: add `<AiChatModal panelName="dev" />`
- SupportChat (SupportChatModal): add AI suggestion button
- Forum: add `<AiChatModal panelName="forum" />` for students to ask forum-related questions

### Conversation Download
- Button "Descargar" calls `GET /api/ai/session/:id/history`
- Formats as `.txt`:
```
RevayBot — Conversación
Fecha: 2026-05-25 14:30

Usuario: ¿Cómo me registro en una monitoría?
RevayBot: Para registrarte...

Usuario: ¿Qué hago si no veo el enlace?
RevayBot: Verifica que...
```
- Triggers browser download

---

## 6. Session Lifecycle

```
User clicks 🤖 → POST /api/ai/session → returns { sessionId, expiresAt }
                         ↓
User types question → POST /api/ai/ask { sessionId, message }
                         ↓
              Backend loads .md by role
                         ↓
              Builds context + history
                         ↓
              Calls Ollama → gets response
                         ↓
              Returns { response, expiresAt (extended) }
                         ↓
        30 min idle → session expires → backend deletes
              Frontend detects expiration (poll or timer)
                         ↓
              Shows "Sesión expirada" + offers download/new
```

---

## 7. Files Changed / Created

### New files
- `backend/services/ai.service.js`
- `backend/controllers/ai.controller.js`
- `backend/routes/ai.routes.js`
- `backend/knowledge/public/plataforma.md`
- `backend/knowledge/technical/arquitectura.md`
- `frontend/src/components/AiChatModal.jsx`

### Modified files
- `backend/app.js` — mount AI routes
- `frontend/src/pages/AdminDashboard.jsx` — add AiChatModal
- `frontend/src/pages/DevDashboard.jsx` — add AiChatModal
- `frontend/src/pages/Home.jsx` or Forum — add AiChatModal for forum

---

## 8. Model Fallback Strategy

```
Try phi3:mini
  └─ If not available → try tinyllama
       └─ If not available → return "El asistente IA no está disponible en este momento."
```

Check available models on startup by calling `GET http://localhost:11434/api/tags` and selecting the best available.
