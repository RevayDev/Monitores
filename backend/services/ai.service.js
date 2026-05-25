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
    if (!data.response) throw new Error('Empty response from Ollama');
    return data.response;
  } catch (err) {
    console.error('Ollama primary failed, trying fallback:', err.message);
    // Fallback to tinyllama
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tinyllama', prompt, stream: false, options: { temperature: 0.7, max_tokens: 300 } })
      });
      if (!res.ok) throw new Error('Ollama fallback failed');
      const data = await res.json();
      if (!data.response) throw new Error('Empty response from fallback');
      return data.response;
    } catch (err) {
      console.error('Ollama fallback also failed:', err.message);
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
const cleanupTimer = setInterval(cleanExpired, 60_000);
export const cleanupInterval = () => clearInterval(cleanupTimer);

export const createSession = (userId, role) => {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, { userId, role, messages: [], expiresAt: Date.now() + SESSION_TTL, knowledge: getKnowledge(role) });
  return { sessionId: id, expiresAt: Date.now() + SESSION_TTL };
};

// ── Image detection ────────────────────────────────────────────────────
const IMAGE_PATTERN = /!\[imagen\]\(https?:\/\/[^\s)]+\)|\.(png|jpg|jpeg|gif|webp|bmp|svg)/i;

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
    session.messages.push({ role: 'assistant', content: '⚠️ No hay conexión con la IA local (Ollama). RevayBot no está disponible. Si necesitas ayuda, escribe "asesor" para hablar con un humano.' });
    return { response: session.messages[session.messages.length - 1].content, expiresAt: session.expiresAt };
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
