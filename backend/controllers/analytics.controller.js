import analyticsService from '../services/analytics.service.js';

const getAcademicModules = async (req, res) => {
  try {
    const data = await analyticsService.getAcademicModules(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createAcademicSession = async (req, res) => {
  try {
    const data = await analyticsService.createAcademicSession(req.params.moduleId, req.userContext.userId, req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAcademicModuleStats = async (req, res) => {
  try {
    const data = await analyticsService.getAcademicModuleStats(req.params.moduleId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAcademicSessionHistory = async (req, res) => {
  try {
    const data = await analyticsService.getAcademicSessionHistory(req.params.moduleId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAcademicSessionDetail = async (req, res) => {
  try {
    const data = await analyticsService.getAcademicSessionDetail(req.params.sessionId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getDiningStats = async (req, res) => {
  try {
    const data = await analyticsService.getDiningStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getDiningStudentHistory = async (req, res) => {
  try {
    const data = await analyticsService.getDiningStudentHistory(req.params.studentId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAdminOverview = async (req, res) => {
  try {
    const data = await analyticsService.getAdminOverview(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAdminUserStats = async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ error: 'ID de usuario invalido.' });
    }
    const data = await analyticsService.getAdminUserStats(targetId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addAttendanceExcuse = async (req, res) => {
  try {
    const data = await analyticsService.addAttendanceExcuse(req.params.attendanceId, req.userContext.userId, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default {
  getAcademicModules,
  createAcademicSession,
  getAcademicModuleStats,
  getAcademicSessionHistory,
  getAcademicSessionDetail,
  getDiningStats,
  getDiningStudentHistory,
  getAdminOverview,
  getAdminUserStats,
  addAttendanceExcuse
};
