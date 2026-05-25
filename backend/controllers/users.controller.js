import usersService from '../services/users.service.js';

const login = async (req, res) => {
  try {
    const { identifier, username, email, role, password } = req.body;
    const user = await usersService.login(identifier || email || username, role, password);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const getPublicBaseUrl = (req) => {
  const configured = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL;
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
};

const requestPasswordReset = async (req, res) => {
  try {
    const result = await usersService.requestPasswordReset(req.body?.username, getPublicBaseUrl(req));
    res.json(result);
  } catch (error) {
    if (error?.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Servicio temporalmente no disponible. Intenta de nuevo en unos minutos.' });
    }
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const result = await usersService.resetPassword(req.body?.token, req.body?.password);
    res.json(result);
  } catch (error) {
    if (error?.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Servicio temporalmente no disponible. Intenta de nuevo en unos minutos.' });
    }
    res.status(400).json({ error: error.message });
  }
};

const signup = async (req, res) => {
  try {
    const user = await usersService.signup(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'El usuario o correo ya existe') {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const result = await usersService.logout(req.userContext?.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  const { role } = req.query;
  const users = await usersService.getAllUsers(role || null);
  res.json(users);
};

const getUser = async (req, res) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    if (user) res.json(user);
    else res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  const { currentUserId } = req.body; // Expecting frontend to send this or handle via auth middleware (if implemented)
  try {
    const user = await usersService.createUser(req.body, req.userContext?.userId || currentUserId);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'El usuario o correo ya existe') {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(403).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { currentUserId } = req.body;
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.userContext?.userId || currentUserId);
    if (user) res.json(user);
    else res.status(404).json({ error: 'User not found' });
  } catch (error) {
    if (error.message === 'El usuario o correo ya existe') {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(403).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await usersService.deleteUser(req.params.id, req.userContext?.userId || req.body?.currentUserId);
    if (result) res.json({ success: true });
    else res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
};

const getMeStats = async (req, res) => {
  try {
    const data = await usersService.getMeStats(req.userContext?.userId || req.user?.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'ID de usuario invalido.' });
    }
    const data = await usersService.getUserStatsById(req.userContext?.userId || req.user?.id, targetId);
    res.json(data);
  } catch (error) {
    const code = error.message.includes('No autorizado') ? 403 : 400;
    res.status(code).json({ error: error.message });
  }
};

export default {
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  signup,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadImage,
  getMeStats,
  getUserStats
};
