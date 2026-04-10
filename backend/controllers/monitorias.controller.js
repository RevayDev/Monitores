import monitoriasService from '../services/monitorias.service.js';

const getMonitorias = async (req, res) => {
  const monitorias = await monitoriasService.getAllMonitorias(req.query);
  res.json(monitorias);
};

const createMonitoria = async (req, res) => {
  const monitoria = await monitoriasService.createMonitoria(req.body);
  res.status(201).json(monitoria);
};

const updateMonitoria = async (req, res) => {
  const monitoria = await monitoriasService.updateMonitoria(req.params.id, req.body);
  if (monitoria) res.json(monitoria);
  else res.status(404).json({ error: 'Monitoría not found' });
};

const deleteMonitoria = async (req, res) => {
  const result = await monitoriasService.deleteMonitoria(req.params.id);
  res.json({ success: result });
};

const getRegistrations = async (req, res) => {
  const registrations = await monitoriasService.getAllRegistrations(req.query);
  res.json(registrations);
};

const registerStudent = async (req, res) => {
  try {
    const { monitoria, usuario } = req.body;
    const registration = await monitoriasService.registerStudent(monitoria, usuario);
    res.status(201).json(registration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteRegistration = async (req, res) => {
  await monitoriasService.deleteRegistration(req.params.id);
  res.json({ success: true });
};

// Maintenance
const getMaintenance = async (req, res) => {
  const config = await monitoriasService.getMaintenance();
  res.json(config);
};

const updateMaintenance = async (req, res) => {
  const config = await monitoriasService.updateMaintenance(req.body);
  res.json(config);
};

// Selects
const getSedes = async (req, res) => res.json(await monitoriasService.getSedes());
const getCuatrimestres = async (req, res) => res.json(await monitoriasService.getCuatrimestres());
const getModalidades = async (req, res) => res.json(await monitoriasService.getModalidades());
const getProgramas = async (req, res) => res.json(await monitoriasService.getProgramas());

// Attendance/Complaints
const getAttendance = async (req, res) => {
  const attendance = await monitoriasService.getAllAttendance();
  res.json(attendance);
};

const submitAttendance = async (req, res) => {
  await monitoriasService.submitAttendance(req.body);
  res.status(201).json({ success: true });
};

const submitComplaint = async (req, res) => {
  await monitoriasService.submitComplaint(req.body);
  res.status(201).json({ success: true });
};

const getAttendanceSheet = async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    const monitorUserId = Number(req.headers['x-user-id'] || req.query.userId || req.body?.userId);
    const data = await monitoriasService.getAttendanceSheet(moduleId, monitorUserId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const saveAttendanceSheet = async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    const monitorUserId = Number(req.headers['x-user-id'] || req.body?.userId);
    const result = await monitoriasService.saveAttendanceSheet(moduleId, monitorUserId, req.body?.rows || []);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default {
  getMonitorias,
  createMonitoria,
  updateMonitoria,
  deleteMonitoria,
  getRegistrations,
  registerStudent,
  deleteRegistration,
  getMaintenance,
  updateMaintenance,
  getSedes,
  getCuatrimestres,
  getModalidades,
  getProgramas,
  getAttendance,
  submitAttendance,
  submitComplaint,
  getAttendanceSheet,
  saveAttendanceSheet
};
