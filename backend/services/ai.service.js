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
   KNOWLEDGE - carga inteligente por tema
────────────────────────────────────────────────────────────── */

const loadMdFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

const STOP_WORDS = new Set([
  'para', 'como', 'que', 'con', 'por', 'del', 'las', 'los', 'mas', 'pero',
  'esta', 'este', 'entre', 'todo', 'tiene', 'hacer', 'puedo', 'debe', 'dice',
  'sabe', 'well', 'very', 'una', 'uno', 'esa', 'eso', 'ese', 'sus', 'son',
  'era', 'fue', 'han', 'has', 'hay', 'dos', 'tres', 'vez', 'cada', 'nada',
  'algo', 'muy', 'asi', 'aqui', 'bien', 'solo', 'otro', 'otros', 'ante',
  'sobre', 'hasta', 'contra', 'durante', 'mediante', 'segun', 'segun',
  'donde', 'cuando', 'quien', 'cual', 'cuales', 'cuanto', 'cuanta',
  'ningun', 'ninguna', 'tanto', 'tanta', 'varios', 'varias', 'mismo',
  'misma', 'propio', 'propia', 'gran', 'grande', 'buen', 'buena', 'mal',
  'mala', 'peor', 'mejor', 'mayor', 'menor', 'primer', 'primero', 'ultimo',
  'ultima', 'siguiente', 'anterior', 'aquel', 'aquella', 'ello', 'le',
  'lo', 'la', 'los', 'las', 'el', 'ella', 'ellos', 'ellas', 'nos',
  'os', 'me', 'te', 'se', 'le', 'les', 'nos', 'os'
]);

const getRelevantKnowledge = (message, role) => {
  const publicDir = path.resolve(__dirname, '..', 'knowledge', 'public');
  const hasTechnical = ['admin', 'dev'].includes(String(role).toLowerCase());
  const allFiles = [];

  try {
    if (fs.existsSync(publicDir)) {
      for (const f of fs.readdirSync(publicDir).filter(f => f.endsWith('.md'))) {
        allFiles.push({ name: f, path: path.join(publicDir, f), technical: false });
      }
    }
    if (hasTechnical) {
      const techDir = path.resolve(__dirname, '..', 'knowledge', 'technical');
      if (fs.existsSync(techDir)) {
        for (const f of fs.readdirSync(techDir).filter(f => f.endsWith('.md'))) {
          allFiles.push({ name: f, path: path.join(techDir, f), technical: true });
        }
      }
    }
  } catch (err) {
    console.error('[AI] Error reading knowledge dirs:', err.message);
    return '';
  }

  if (allFiles.length === 0) return '';

  const msg = message.toLowerCase();
  const words = msg.split(/[^a-záéíóúñ0-9]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const keywords = [...new Set(words)];

  // Score each file by keyword matches in filename (weight 5) and content (weight 2)
  const scored = allFiles.map(f => {
    const content = loadMdFile(f.path);
    let score = 0;
    for (const kw of keywords) {
      if (f.name.toLowerCase().includes(kw)) score += 5;
      if (content.toLowerCase().includes(kw)) score += 2;
    }
    return { ...f, content, score };
  });

  const relevant = scored.filter(f => f.score > 0).sort((a, b) => b.score - a.score);

  if (relevant.length === 0) {
    // No match: return only a brief generic summary
    return '[MONITORES]\nSistema académico de gestión de monitorías. Soporta registro, login, inscripción a monitorías, asistencia QR, foros, y soporte.';
  }

  // Return top 2 most relevant files, max 1500 chars each
  return relevant.slice(0, 2).map(f => {
    const label = f.name.replace('.md', '').replace(/-/g, ' ');
    const maxLen = 1500;
    const body = f.content.length > maxLen ? f.content.slice(0, maxLen) + '...' : f.content;
    return `[${label}]\n${body}`;
  }).join('\n\n');
};

/* ──────────────────────────────────────────────────────────────
   SYSTEM PROMPT
────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Eres RevayBot, asistente de soporte de MONITORES.

REGLAS ABSOLUTAS (no las ignores):
1. Responde SOLO en español, máximo 3 oraciones, directo.
2. USA ÚNICAMENTE la información de los Documentos de abajo. NO inventes nada. NADA.
3. Si la respuesta no está en los Documentos, dice "No tengo esa información en mi base de conocimiento."
4. Si preguntan algo NO relacionado con MONITORES (matemáticas, clima, historia, geografía, política, cultura general, capitales, presidentes, etc.), responde exactamente: "Solo soy un chat de soporte de MONITORES. No puedo responder eso."
5. Sé amable, calmado. Usa "tú". NO uses markdown.`;

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
  if (typeof content !== 'string') return '';
  return content
    .replace(UUID_STRIP, '')
    .replace(IMAGE_STRIP, '')
    .replace(NAME_STRIP, '')
    .trim();
};

// Brute-force final sanitization (strip ANY {UUID}.ext pattern)
const FINAL_STRIP = /\{[A-Fa-f0-9-]{36}\}\..{3,4}\b/gi;
const finalSanitize = (content) => {
  if (typeof content !== 'string') return '';
  let c = content;
  // Run 3 passes to catch any remaining
  for (let i = 0; i < 3; i++) {
    c = c.replace(FINAL_STRIP, '');
    c = c.replace(UUID_STRIP, '');
    c = c.replace(IMAGE_STRIP, '');
    c = c.replace(NAME_STRIP, '');
  }
  return c.trim();
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

const FINAL_UUID = /\{[A-Fa-f0-9-]{36}\}\.(png|jpg|jpeg|gif|webp|bmp|svg)/gi;

const tryModel = async (model, messages) => {
  // 4 rounds of sanitization to ensure NO UUID reaches Ollama
  const cleanMessages = messages.map((m) => ({
    role: m.role,
    content: finalSanitize(m.content).slice(0, 700)
  }));

  // Last-resort: strip from serialized JSON
  const rawBody = JSON.stringify({
    model,
    stream: false,
    keep_alive: '2m',
    messages: cleanMessages,
    options: { temperature: 0.1, num_predict: 60, num_ctx: 1024, top_k: 10, top_p: 0.5 }
  });
  const safeBody = rawBody.replace(FINAL_UUID, '');

  console.log(`[Ollama] Sending to ${model}`);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), MODEL_TIMEOUT);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ac.signal,
      body: safeBody
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      // Sanitize error before logging (remove any UUIDs)
      const safeErr = errText.replace(FINAL_UUID, '[UUID eliminado]');
      throw new Error(safeErr);
    }

    const data = await res.json();
    const response = data?.message?.content?.trim();
    if (!response) return null;

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
    if (response) return response;
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

  // Out-of-scope detection (no enviar a IA preguntas no-MONITORES)
  const OUT_OF_SCOPE = /\b(capital de|presidente de|cuánto es |resultado de |operación matem|suma |resta |multiplic|división |historia de |geografía de |clima de |receta de |película |canción |deporte |noticias de |política de |economía de |filosofía de |religión de |poema |cuento |chiste |traduce |tradúceme|idioma |quién fue |qué es el |qué es la |qué son los|diferencia entre |que significa |definición de|origen de|cuál es la capital|quién descubrió|año de |fecha de |edad de |peso de |altura de)\b/i;
  const MATH_PATTERN = /\d+\s*[+\-*/^]\s*\d+|\b(cuánto es|suma|resta|multiplica|divide)\b.*\d+/i;
  if (!/monitore|módulo|horario|sede|cuatrimestre|programa|asistencia|qr|foro|soporte|perfil|contraseña|login|registro|inscribir|olvidé|olvide|recuperar|cambiar|error|problema|ayuda|como|qué es|qué son/i.test(message)) {
    if (OUT_OF_SCOPE.test(message) || MATH_PATTERN.test(message)) {
      const msg = 'Solo soy un chat de soporte de MONITORES. No puedo responder eso.';
      session.messages.push({ role: 'assistant', content: msg });
      return { response: msg, expiresAt: session.expiresAt };
    }
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

  const relevantKnowledge = getRelevantKnowledge(cleanUserMessage, session.role);

  const messages = [
    {
      role: 'system',
      content:
        `${SYSTEM_PROMPT}\n\nDocumentos:\n${relevantKnowledge}`
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