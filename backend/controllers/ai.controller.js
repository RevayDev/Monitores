import { createSession, askQuestion, getSessionHistory } from '../services/ai.service.js';

const createAiSession = async (req, res) => {
  try {
    const user = req.user || req.userContext || {};
    const userId = user.id || 'anon';
    const role = user.role || 'student';
    console.log(`[AI] Creating session for user=${userId} role=${role}`);
    const result = createSession(userId, role);
    res.json(result);
  } catch (error) {
    console.error('[AI] Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
};

const askAi = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId y message son requeridos.' });
    const result = await askQuestion(sessionId, message);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAiHistory = async (req, res) => {
  try {
    const history = getSessionHistory(req.params.id);
    if (!history) return res.status(404).json({ error: 'Sesión no encontrada.' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { createAiSession, askAi, getAiHistory };
