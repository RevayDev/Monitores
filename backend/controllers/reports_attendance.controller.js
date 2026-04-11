import { reportsService, attendanceService } from '../services/reports_attendance.service.js';

const createReport = async (req, res) => {
  try {
    const report = await reportsService.createReport(req.body, req.user);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllReports = async (req, res) => {
  try {
    const reports = await reportsService.getAllReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMealLogs = async (req, res) => {
  try {
    const logs = await reportsService.getMealLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const registerAttendance = async (req, res) => {
  try {
    const attendance = await attendanceService.registerAttendance(req.body);
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAttendanceByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const attendance = await attendanceService.getAttendanceByModule(moduleId);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  createReport,
  getAllReports,
  getMealLogs,
  registerAttendance,
  getAttendanceByModule
};
