import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const MODEL = 'qwen2.5:1.5b';

const sessions = new Map();

const SESSION_TTL = 30 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// LOAD KNOWLEDGE ONLY ONCE
// ─────────────────────────────────────────────────────────────

const loadMdFiles = (dir) => {
  try {
    const fullPath = path.resolve(__dirname, '..', dir);

    if (!fs.existsSync(fullPath)) return '';

    return fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.md'))
      .map(f => fs.readFileSync(path.join(fullPath, f), 'utf8'))
      .join('\n\n');

  } catch (err) {
    console.error('Knowledge load error:', err);
    return '';
  }
};

const PUBLIC_KNOWLEDGE = loadMdFiles('knowledge/public');
const TECH_KNOWLEDGE = loadMdFiles('knowledge/technical');

const getKnowledge = (role) => {
  const isDev = ['admin', 'dev']
    .includes(String(role || '').toLowerCase());

  return isDev
    ? `${PUBLIC_KNOWLEDGE}\n${TECH_KNOWLEDGE}`
    : PUBLIC_KNOWLEDGE;
};

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
Eres RevayBot, asistente oficial de MONITORES.

Reglas:
- Responde SOLO en español.
- Máximo 3 oraciones.
- Sé breve y claro.
- No inventes información.
- Si no sabes algo, dilo.
- Ayudas con la plataforma MONITORES.
`;

// ─────────────────────────────────────────────────────────────
// SANITIZE
// ─────────────────────────────────────────────────────────────

const IMAGE_REGEX =
  /\{[0-9A-Fa-f-]{36}\}\.(png|jpg|jpeg|gif|webp|bmp|svg)/gi;

const sanitize = (text = '') =>
  text.replace(IMAGE_REGEX, '').trim();

// ─────────────────────────────────────────────────────────────
// OLLAMA
// ─────────────────────────────────────────────────────────────

const askOllama = async (messages) => {

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 45000);

  try {

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },

      signal: controller.signal,

      body: JSON.stringify({
        model: MODEL,

        stream: false,

        keep_alive: '5m',

        options: {
          temperature: 0.3,
          num_predict: 80,
          num_ctx: 2048
        },

        messages
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();

    return data?.message?.content?.trim();

  } finally {
    clearTimeout(timeout);
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE SESSION
// ─────────────────────────────────────────────────────────────

export const createSession = (userId, role) => {

  const sessionId =
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  sessions.set(sessionId, {
    userId,
    role,

    knowledge: getKnowledge(role)
      .slice(0, 4000),

    messages: [],

    expiresAt: Date.now() + SESSION_TTL
  });

  return {
    sessionId,
    expiresAt: Date.now() + SESSION_TTL
  };
};

// ─────────────────────────────────────────────────────────────
// ASK QUESTION
// ─────────────────────────────────────────────────────────────

export const askQuestion = async (sessionId, message) => {

  const session = sessions.get(sessionId);

  if (!session) {
    return {
      error: 'Sesión inválida.'
    };
  }

  if (Date.now() > session.expiresAt) {

    sessions.delete(sessionId);

    return {
      error: 'Sesión expirada.'
    };
  }

  const cleanMessage = sanitize(message);

  session.messages.push({
    role: 'user',
    content: cleanMessage
  });

  // LIMIT HISTORY
  const history = session.messages.slice(-6);

  const messages = [

    {
      role: 'system',
      content:
        SYSTEM_PROMPT +
        '\n\n' +
        session.knowledge
    },

    ...history
  ];

  let response;

  try {

    response = await askOllama(messages);

  } catch (err) {

    console.error('Ollama error:', err.message);

    return {
      response:
        '⚠️ La IA no está disponible ahora mismo.'
    };
  }

  if (!response) {
    response = 'No pude generar respuesta.';
  }

  response = sanitize(response);

  session.messages.push({
    role: 'assistant',
    content: response
  });

  session.expiresAt = Date.now() + SESSION_TTL;

  return {
    response,
    expiresAt: session.expiresAt
  };
};

// ─────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────

setInterval(() => {

  const now = Date.now();

  for (const [id, session] of sessions) {

    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }

}, 60000);

// ─────────────────────────────────────────────────────────────
// WARMUP
// ─────────────────────────────────────────────────────────────

export const warmUpModel = async () => {

  console.log(`[AI] Warming up ${MODEL}...`);

  try {

    await fetch(`${OLLAMA_URL}/api/generate`, {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        model: MODEL,
        prompt: 'hola',
        stream: false
      })

    });

    console.log('[AI] Warmup complete');

  } catch (err) {

    console.warn('[AI] Warmup failed:', err.message);
  }
};