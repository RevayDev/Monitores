const usersService = require('../services/users.service');

const login = async (req, res) => {
  try {
    const { email, role, password } = req.body;
    const user = await usersService.login(email, role, password);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const signup = async (req, res) => {
  try {
    const user = await usersService.signup(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  const users = await usersService.getAllUsers();
  res.json(users);
};

const createUser = async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json(user);
};

const updateUser = async (req, res) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    if (user) res.json(user);
    else res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await usersService.deleteUser(req.params.id);
    if (result) res.json({ success: true });
    else res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

module.exports = {
  login,
  signup,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
