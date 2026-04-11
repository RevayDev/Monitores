import studentService from '../services/student.service.js';

const getModules = async (req, res) => {
  try {
    const modules = await studentService.getAvailableModules();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const register = async (req, res) => {
  try {
    const registration = await studentService.registerToModule(req.body, req.user.id);
    res.status(201).json(registration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await studentService.getMyRegistrations(req.user.id);
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getModules,
  register,
  getMyRegistrations
};
