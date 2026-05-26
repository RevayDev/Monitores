import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

/*
  MODELOS RECOMENDADOS PARA CPU:
  - qwen2:0.5b  -> mejor equilibrio
  - phi3:mini   -> más inteligente pero más lento
*/
const OLLAMA_MODELS = ['qwen2:0.5b'];

const sessions = new Map();

const SESSION_TTL = 30 * 60 * 1000;

/* ──────────────────────────────────────────────────────────────
   KNOWLEDGE
────────────────────────────────────────────────────────────── */

const loadMdFiles = (dir) => {
  try {
    const fullPath = path.resolve(__dirname, '..', dir);

    if (!fs.existsSync(fullPath)) {
      return '';
    }

    const files = fs
      .readdirSync(fullPath)
      .filter(file => file.endsWith('.md'));

    let content = '';

    for (const file of files) {
      const filePath = path.join(fullPath, file);

      content += fs.readFileSync(filePath, 'utf8') + '\n\n';
    }

    return content.slice(0, 2500);

  } catch (err) {
    console.error('[AI] Error loading markdown:', err.message);
    return '';
  }
};

const getKnowledge = (role) => {
  const publicKnowledge = loadMdFiles('knowledge/public');

  if (['admin', 'dev'].includes(String(role).toLowerCase())) {
    return (
      publicKnowledge +
      '\n' +
      loadMdFiles('knowledge/technical')
    ).slice(0, 3000);
  }

  return publicKnowledge;
};

/* ──────────────────────────────────────────────────────────────
   SYSTEM PROMPT
────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `
Eres RevayBot, asistente oficial de MONITORES.

REGLAS:
- Responde SOLO en español.
- Máximo 3 oraciones.
- Sé breve y directo.
- No inventes información.
- Si no sabes algo, dilo.
- No uses markdown.
- No uses listas largas.
- Ayuda con la plataforma MONITORES.
- Si el usuario necesita ayuda humana, sugiere hablar con un asesor.
`;

/* ──────────────────────────────────────────────────────────────
   SANITIZE
────────────────────────────────────────────────────────────── */

const UUID_STRIP =
  /\{[0-9A-Fa-f-]{36}\}\.(png|jpg|jpeg|gif|webp|bmp|svg)/gi;

const IMAGE_STRIP =
  /[\\/]?[\w{}-]+\.(png|jpg|jpeg|gif|webp|bmp|svg)/gi;

const NAME_STRIP =
  /\b\w+\.(png|jpg|jpeg|gif|webp|bmp|svg)\b/gi;

const sanitizeContent = (content) => {
  if (typeof content !== 'string') {
    return '';
  }

  return content
    .replace(UUID_STRIP, '')
    .replace(IMAGE_STRIP, '')
    .replace(NAME_STRIP, '')
    .trim();
};

/* ──────────────────────────────────────────────────────────────
   IMAGE DETECTION
────────────────────────────────────────────────────────────── */

const IMAGE_PATTERN =
  /!\[imagen\]\(https?:\/\/[^\s)]+\)|\.(png|jpg|jpeg|gif|webp|bmp|svg)|\{[0-9A-Fa-f-]{36}\}\.png/i;

/* ──────────────────────────────────────────────────────────────
   OLLAMA
────────────────────────────────────────────────────────────── */

const MODEL_TIMEOUT = 45000;

const tryModel = async (model, messages) => {
  const cleanMessages = messages.map((m) => ({
    role: m.role,
    content: sanitizeContent(m.content).slice(0, 700)
  }));

  console.log(`[Ollama] Sending to ${model}`);

  const ac = new AbortController();

  const timer = setTimeout(() => {
    ac.abort();
  }, MODEL_TIMEOUT);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      signal: ac.signal,

      body: JSON.stringify({
        model,

        stream: false,

        keep_alive: '2m',

        messages: cleanMessages,

        options: {
          temperature: 0.3,
          num_predict: 80,
          num_ctx: 512,
          top_k: 20,
          top_p: 0.8
        }
      })
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = await res.json();

    const response = data?.message?.content?.trim();

    if (!response) {
      return null;
    }

    return sanitizeContent(response);

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      console.error(`Ollama ${model} timeout`);
    } else {
      console.error(`Ollama ${model} failed:`, err.message);
    }

    return null;
  }
};

const callOllama = async (messages) => {
  for (const model of OLLAMA_MODELS) {
    const response = await tryModel(model, messages);

    if (response) {
      return response;
    }
  }

  return null;
};

/* ──────────────────────────────────────────────────────────────
   SESSION CLEANUP
────────────────────────────────────────────────────────────── */

const cleanExpired = () => {
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }
};

const cleanupTimer = setInterval(cleanExpired, 60_000);

export const cleanupInterval = () => {
  clearInterval(cleanupTimer);
};

export const clearAllSessions = () => {
  sessions.clear();
};

/* ──────────────────────────────────────────────────────────────
   CREATE SESSION
────────────────────────────────────────────────────────────── */

export const createSession = (userId, role = 'user') => {
  const sessionId =
    `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const expiresAt = Date.now() + SESSION_TTL;

  sessions.set(sessionId, {
    userId,
    role,
    expiresAt,
    knowledge: getKnowledge(role),
    messages: []
  });

  console.log(
    `[AI] Session created for ${userId} (${role})`
  );

  return {
    sessionId,
    expiresAt
  };
};

/* ──────────────────────────────────────────────────────────────
   ASK QUESTION
────────────────────────────────────────────────────────────── */

export const askQuestion = async (
  sessionId,
  message
) => {

  const session = sessions.get(sessionId);

  if (!session) {
    return {
      error:
        'Sesión inválida o expirada.'
    };
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);

    return {
      error:
        'La sesión expiró. Inicia una nueva conversación.'
    };
  }

  if (
    !message ||
    typeof message !== 'string'
  ) {
    return {
      error:
        'Mensaje inválido.'
    };
  }

  if (IMAGE_PATTERN.test(message)) {
    const msg =
      '⚠️ RevayBot no puede analizar imágenes o archivos. Describe tu problema en texto.';

    session.messages.push({
      role: 'assistant',
      content: msg
    });

    return {
      response: msg,
      expiresAt: session.expiresAt
    };
  }

  const cleanUserMessage =
    sanitizeContent(message).slice(0, 700);

  session.messages.push({
    role: 'user',
    content: cleanUserMessage
  });

  session.expiresAt =
    Date.now() + SESSION_TTL;

  const messages = [
    {
      role: 'system',
      content:
        `${SYSTEM_PROMPT}\n\n${session.knowledge}`
    },

    ...session.messages
      .slice(-4)
      .map((m) => ({
        role: m.role,
        content: sanitizeContent(m.content)
      }))
  ];

  const response = await callOllama(messages);

  if (!response) {
    const fallback =
      '⚠️ RevayBot está temporalmente ocupado. Intenta nuevamente en unos segundos o escribe "asesor".';

    session.messages.push({
      role: 'assistant',
      content: fallback
    });

    return {
      response: fallback,
      aiOffline: true,
      expiresAt: session.expiresAt
    };
  }

  session.messages.push({
    role: 'assistant',
    content: response
  });

  return {
    response,
    expiresAt: session.expiresAt
  };
};

/* ──────────────────────────────────────────────────────────────
   HISTORY
────────────────────────────────────────────────────────────── */

export const getSessionHistory = (
  sessionId
) => {

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  return session.messages.map((m) => ({
    role:
      m.role === 'user'
        ? 'Usuario'
        : 'RevayBot',

    content: m.content
  }));
};

/* ──────────────────────────────────────────────────────────────
   WARMUP DESACTIVADO
────────────────────────────────────────────────────────────── */

export const warmUpModel = async () => {
  console.log(
    '[Ollama] Warm-up desactivado para ahorrar CPU'
  );
};