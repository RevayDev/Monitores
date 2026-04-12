import adminService from '../services/admin.service.js';
import usersService from '../services/users.service.js';

const getStats = async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const roleFilter = req.query.role;
    const users = await adminService.getUsers(roleFilter);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    // Force role to admin
    const adminData = { ...req.body, role: 'admin' };
    const user = await usersService.createUser(adminData, req.user.id);
    res.status(201).json(user);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    // the user deleting is req.user.id, could add a check if it's the last admin
    const result = await usersService.deleteUser(req.params.id);
    if (result) {
      res.json({ success: true, message: 'Usuario eliminado' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const getComplaints = async (req, res) => {
  try {
    const complaints = await adminService.getComplaints();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getModules = async (req, res) => {
  try {
    const modules = await adminService.getAllModules();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateModule = async (req, res) => {
  try {
    const module = await adminService.updateModule(req.params.id, req.body);
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteModule = async (req, res) => {
  try {
    await adminService.deleteModule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getStats,
  getUsers,
  createAdmin,
  deleteUser,
  getComplaints,
  getModules,
  updateModule,
  deleteModule
};
