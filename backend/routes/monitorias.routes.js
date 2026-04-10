import express from 'express';
import monitoriasController from '../controllers/monitorias.controller.js';

const router = express.Router();

// Modules
router.get('/modules', monitoriasController.getMonitorias);
router.post('/modules', monitoriasController.createMonitoria);
router.put('/modules/:id', monitoriasController.updateMonitoria);
router.delete('/modules/:id', monitoriasController.deleteMonitoria);

// Registrations
router.get('/registrations', monitoriasController.getRegistrations);
router.post('/register', monitoriasController.registerStudent);
router.delete('/registrations/:id', monitoriasController.deleteRegistration);

// Maintenance
router.get('/maintenance', monitoriasController.getMaintenance);
router.put('/maintenance', monitoriasController.updateMaintenance);

// Selects
router.get('/sedes', monitoriasController.getSedes);
router.get('/cuatrimestres', monitoriasController.getCuatrimestres);
router.get('/modalidades', monitoriasController.getModalidades);
router.get('/programas', monitoriasController.getProgramas);

// Other
router.post('/attendance', monitoriasController.submitAttendance);
router.get('/attendance', monitoriasController.getAttendance);
router.get('/modules/:id/attendance-sheet', monitoriasController.getAttendanceSheet);
router.post('/modules/:id/attendance-sheet', monitoriasController.saveAttendanceSheet);
router.post('/complaints', monitoriasController.submitComplaint);

export default router;
