import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODELS = ['qwen2.5:3b', 'tinyllama'];

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
  } catch (err) { console.error('Error loading markdown files:', err); }
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

// ── File/Image reference patterns to sanitize ──────────────────────────
const FILE_REF_PATTERN = /[\\/]?[\w{}-]+\.(png|jpg|jpeg|gif|webp|bmp|svg|pdf|doc|docx|xls|xlsx|zip|rar)(["\s)\]>.,]|$)/gi;
const STRIP_IMAGES_PATTERN = /\b\w+\.(png|jpg|jpeg|gif|webp|bmp|svg)\b/gi;
const UUID_PATTERN = /\{[0-9A-Fa-f-]{36}\}\.(png|jpg|jpeg|gif|webp|bmp|svg|pdf|doc|docx|xls|xlsx|zip|rar)\b/gi;

// ── Ollama call ────────────────────────────────────────────────────────
const sanitizeContent = (content) => (content || '').replace(FILE_REF_PATTERN, '').replace(STRIP_IMAGES_PATTERN, '').replace(UUID_PATTERN, '');
const sanitizePrompt = (prompt) => prompt.replace(FILE_REF_PATTERN, '').replace(STRIP_IMAGES_PATTERN, '').replace(UUID_PATTERN, '');

const MODEL_TIMEOUT = 55000; // 55s (frontend timeout is 60s)

const tryModel = async (model, prompt) => {
  const cleanPrompt = sanitizePrompt(prompt);
  console.log(`[Ollama] Sending to ${model} (${cleanPrompt.length} chars)`);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), MODEL_TIMEOUT);
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: cleanPrompt, stream: false, options: { temperature: 0.7, max_tokens: 500 } }),
      signal: ac.signal
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const isImageErr = /cannot read.*not support image/i.test(body);
    throw new Error(isImageErr ? 'Ollama_rechazo_imagen' : body);
  }
  const data = await res.json();
  if (!data.response) throw new Error('Empty response from Ollama');
  return data.response;
};

const callOllama = async (messages) => {
  const clean = messages.map(m => ({ ...m, content: sanitizeContent(m.content) }));
  const prompt = clean.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

  for (const model of OLLAMA_MODELS) {
    try {
      const result = await tryModel(model, prompt);
      if (result !== null) return result;
    } catch (err) {
      if (err.message === 'Ollama_rechazo_imagen') {
        console.error(`Ollama ${model} rejected prompt due to image reference`);
      } else {
        console.error(`Ollama ${model} failed:`, err.message);
      }
    }
  }
  return null;
};

// ── Session management ────────────────────────────────────────────────
const cleanExpired = () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(id);
  }
};
const cleanupTimer = setInterval(cleanExpired, 60_000);
export const cleanupInterval = () => clearInterval(cleanupTimer);
export const clearAllSessions = () => { sessions.clear(); };

export const createSession = (userId, role) => {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, { userId, role, messages: [], expiresAt: Date.now() + SESSION_TTL, knowledge: getKnowledge(role) });
  return { sessionId: id, expiresAt: Date.now() + SESSION_TTL };
};

// ── Image detection ────────────────────────────────────────────────────
const IMAGE_PATTERN = /!\[imagen\]\(https?:\/\/[^\s)]+\)|\.(png|jpg|jpeg|gif|webp|bmp|svg)|\\\{[0-9A-Fa-f-]{36}\\\}\.png/i;

export const askQuestion = async (sessionId, message) => {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Sesión expirada o inválida. Inicia una nueva conversación.' };
  if (Date.now() > session.expiresAt) { sessions.delete(sessionId); return { error: 'Sesión expirada. Inicia una nueva conversación.' }; }

  // If the message contains image/file references, return early
  if (IMAGE_PATTERN.test(message)) {
    const imgResponse = '⚠️ RevayBot no procesa imágenes ni archivos. Solo puedo responder preguntas escritas sobre la plataforma MONITORES. Describe tu consulta con texto y te ayudo. 📝';
    session.messages.push({ role: 'user', content: message }, { role: 'assistant', content: imgResponse });
    return { response: imgResponse, expiresAt: session.expiresAt };
  }

  session.messages.push({ role: 'user', content: message });
  session.expiresAt = Date.now() + SESSION_TTL;

  const contextMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: 'Conocimiento:\n' + session.knowledge },
    ...session.messages.slice(-20)
  ];

  const response = await callOllama(contextMessages);
  if (response === null) {
    const msg = '⚠️ No hay conexión con la IA local (Ollama). RevayBot no está disponible. Si necesitas ayuda, escribe "asesor" para hablar con un humano.';
    session.messages.push({ role: 'assistant', content: msg });
    return { response: msg, aiOffline: true, expiresAt: session.expiresAt };
  }

  session.messages.push({ role: 'assistant', content: response });
  return { response, expiresAt: session.expiresAt };
};

export const getSessionHistory = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return session.messages.map(m => ({
    role: m.role === 'user' ? 'Usuario' : 'RevayBot',
    content: m.content
  }));
};
