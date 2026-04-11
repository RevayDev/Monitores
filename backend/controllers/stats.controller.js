import statsService from '../services/stats.service.js';

const getGlobalStats = async (req, res) => {
  try {
    const data = await statsService.getGlobalStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    const message = error.message || 'Error consultando estadisticas globales.';
    const status = message.includes('permisos') ? 403 : 400;
    res.status(status).json({ error: message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'ID de usuario invalido.' });
    }
    const data = await statsService.getUserStats(req.userContext.userId, targetUserId);
    return res.json(data);
  } catch (error) {
    const message = error.message || 'Error consultando estadisticas del usuario.';
    const status = message.includes('No autorizado') ? 403 : 400;
    return res.status(status).json({ error: message });
  }
};

export default {
  getGlobalStats,
  getUserStats
};
