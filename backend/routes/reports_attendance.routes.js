import { Router } from 'express';
import reportsAttendanceController from '../controllers/reports_attendance.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// POST /api/reports - Crear reporte
router.post('/reports', reportsAttendanceController.createReport);

// GET /api/admin/reports - Ver todos los reportes (solo admin)
router.get('/admin/reports', roleMiddleware('admin'), reportsAttendanceController.getAllReports);

// GET /api/admin/meal-logs - Ver logs de comedor (solo admin)
router.get('/admin/meal-logs', roleMiddleware('admin'), reportsAttendanceController.getMealLogs);

// POST /api/attendance - Registrar asistencia
router.post('/attendance', reportsAttendanceController.registerAttendance);

// GET /api/attendance/:moduleId - Ver asistencia por monitor
router.get('/attendance/:moduleId', reportsAttendanceController.getAttendanceByModule);

export default router;
