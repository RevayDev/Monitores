# Support Chat Redesign — Part 1

## Overview
Three features in one cycle: (1) allow end-users to close their own chat, (2) add rate limiting to protect the server, (3) redesign the admin SupportTicketPanel with better UI, icons, and responsive layout.

---

## 1. User Chat Close (SupportChat)

### Behavior
- When chat mode is `live`, a **"Finalizar chat"** button appears (icon: `XCircle` or `LogOut`)
- When the user types keywords like "gracias", "listo", "solucionado", "no necesito nada más", the bot asks: *"¿Necesitas algo más?"* with two buttons: **"Sí, necesito ayuda"** (continues) and **"No, gracias"** (closes)
- If user clicks "No, gracias" or the "Finalizar chat" button, call `POST /support/tickets/:id/close`
- Status changes to `closed`, input is blocked, chat shows "Chat cerrado" with full history readable
- Ticket is NOT deleted — admin/dev see it with status "Cerrado"
- Only admin/dev can delete via existing DELETE endpoint

### Backend
- New route: `POST /support/tickets/:id/close`
- No `roleMiddleware`, only `authMiddleware` + `requireUserContext`
- Validates:
  - Ticket exists
  - Ticket belongs to the requester (or user is admin/dev)
  - Ticket is not already closed
- On success:
  - Sets `status = 'closed'`, `updated_at = NOW()`
  - Emits `ticket_status_changed` to room `ticket_chat_{ticketId}`
  - Calls `notifyStaffTicketUpdate({ action: 'closed', ticketId })`
- Returns `{ ok: true }`

### Frontend (SupportChat.jsx)
- Add "Finalizar chat" button (visible only in `live` mode, assigned state)
- Add bot question "¿Necesitas algo más?" with buttons on keyword detection
- On close success: disable input, show "Chat cerrado" state, keep history visible
- Socket listener for `ticket_status_changed` already handles this but add the API call as backup

---

## 2. Rate Limiting

### Middleware: `backend/middlewares/rateLimiter.middleware.js`
- Uses `express-rate-limit` package + custom in-memory store for attack detection
- Three limiters:
  - **`userLimiter`**: 200 requests per minute per `x-user-id` header
  - **`ipLimiter`**: 100 requests per minute per IP
  - **`aiLimiter`**: 30 requests per minute per user (stricter for AI endpoints)
- **Attack detection**: if a user/IP exceeds 2x the limit within a sliding 5-minute window, auto-block for 15 minutes (store blocked IPs/userIds in a Map with expiry)
- **Auto-save**: blocked entries saved to a JSON file on disk so blocks survive server restart

### Routes protected
- Apply `ipLimiter` globally to all API routes
- Apply `userLimiter` to support routes (`/support/*`)
- Apply `aiLimiter` to future AI routes (`/ai/*`)

### Response format
```json
{
  "error": "Demasiadas solicitudes. Intenta de nuevo en X minutos.",
  "retryAfter": 900
}
```

---

## 3. SupportTicketPanel Redesign

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Ticket List (left, 35%)  │  Chat Detail (right, 65%) │
│  ┌─────────────────────┐  │  ┌─────────────────────┐  │
│  │ Search 🔍           │  │  │ Header: #id, status, │  │
│  │ [Filtros: pills]    │  │  │ subject, actions     │  │
│  │                     │  │  ├─────────────────────┤  │
│  │ ┌─── Ticket Card ─┐ │  │  │ 📋 Templates (col-  │  │
│  │ │ 👤 Avatar        │ │  │  │  lapsable dropdown) │  │
│  │ │ Nombre           │ │  │  ├─────────────────────┤  │
│  │ │ Asunto           │ │  │  │ Messages area       │  │
│  │ │ 📝 Preview       │ │  │  │ 💬 message bubbles  │  │
│  │ │ 🕐 timestamp     │ │  │  │                     │  │
│  │ │ [status badge]   │ │  │  │                     │  │
│  │ └─────────────────┘ │  │  │                     │  │
│  │ ┌─── Ticket Card ─┐ │  │  ├─────────────────────┤  │
│  │ │ ...              │ │  │  │ Input area + send   │  │
│  │ └─────────────────┘ │  │  └─────────────────────┘  │
│  └─────────────────────┘  │                            │
└─────────────────────────────────────────────────────┘
```

### Left Panel (Ticket List)
- **Search** with magnifying glass icon, placeholder "Buscar tickets..."
- **Status filters** as compact pills with icons: 🆕 Nuevo, 📂 Abierto, ⏳ En Progreso, ✅ Respondido, 🔒 Cerrado
- **Ticket cards**: avatar (requester), name bold, subject, message preview (1 line), timestamp right-aligned, status badge colored
- On mobile: full width, tapping a card slides to detail view (back arrow to return)
- Empty state: 📭 "No hay tickets" with subdued styling

### Right Panel (Chat Detail)
- **Header**: ticket #id, status badge, assignment badge ("Sin asignar"/"Atendiendo"/"Cerrado"), subject
- **Action buttons** (grouped, with icons):
  - 🖐️ Tomar control (only if unassigned)
  - ✅ Abrir (only if not open)
  - 🔒 Cerrar (only if assigned and not closed)
  - 🗑️ Eliminar (only if closed, admin/dev only)
- **Templates section**: collapsible `<details>` or dropdown (not always expanded), with icons: 👋 Bienvenida, ⏳ Espera, 👋 Despedida, 🔑 Password, 📈 Escalar, 📱 QR, ✅ Resuelto
- **Messages**: cleaner bubbles with subtle shadows, system messages as centered pills with 🛡️ icon
- **Typing indicator**: animated dots with user name
- **Input**: textarea with auto-resize, send button with ▶️ icon
- **Closed state**: shows 🔒 "Chat cerrado" with delete button only

### Responsive Breakpoints
- `lg` (1024px+): side-by-side grid (35/65 split)
- `md` (768-1023px): stack vertically, list on top, detail below
- `sm` (<768px): full-screen single panel, slide transition between list and detail, back button in detail header

### Icons/Emojis used
| Element | Icon |
|---------|------|
| Finalizar chat (user) | ❌ or ⏹️ |
| Search | 🔍 |
| New status | 🆕 |
| Open status | 📂 |
| In progress | ⏳ |
| Answered | ✅ |
| Closed | 🔒 |
| Take control | 🖐️ |
| Delete | 🗑️ |
| Send | ▶️ |
| Templates | 📋 |
| System message | 🛡️ |
| Avatar placeholder | 👤 |
| Timestamp | 🕐 |

---

## Files Changed

### Backend
- `backend/services/support.service.js` — add `closeTicket()` method
- `backend/controllers/support.controller.js` — add `closeSupportTicket` handler
- `backend/routes/support.routes.js` — add `POST /support/tickets/:id/close`
- `backend/middlewares/rateLimiter.middleware.js` — new, three limiters + attack detection
- `backend/app.js` — apply rate limiters to routes

### Frontend
- `frontend/src/components/SupportChat.jsx` — add close button, bot question "¿Necesitas algo más?", close flow
- `frontend/src/components/SupportTicketPanel.jsx` — full redesign (layout, icons, responsive, cleaner UI)
- `frontend/src/services/api.js` — add `closeSupportTicket()` function
- `frontend/src/pages/AdminDashboard.jsx` — if needed for ticket badge count styling
- `frontend/src/pages/DevDashboard.jsx` — if needed for ticket badge count styling

---

## Future (Part 2 — AI Integration)
- Ollama tinyllama for support chat (.md knowledge base)
- Ollama phi3:mini for forum search
- AI service layer with RAG
- AI rate limiter (`aiLimiter`)
