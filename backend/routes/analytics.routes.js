import express from 'express';
import analyticsController from '../controllers/analytics.controller.js';
import requireUserContext from '../middlewares/user-context.middleware.js';

const router = express.Router();

router.get('/academic/modules', requireUserContext, analyticsController.getAcademicModules);
router.get('/academic/modules/:moduleId/stats', requireUserContext, analyticsController.getAcademicModuleStats);
router.get('/academic/modules/:moduleId/sessions', requireUserContext, analyticsController.getAcademicSessionHistory);
router.post('/academic/modules/:moduleId/sessions', requireUserContext, analyticsController.createAcademicSession);
router.get('/academic/sessions/:sessionId', requireUserContext, analyticsController.getAcademicSessionDetail);
router.patch('/academic/attendance/:attendanceId/excuse', requireUserContext, analyticsController.addAttendanceExcuse);

router.get('/dining/stats', requireUserContext, analyticsController.getDiningStats);
router.get('/dining/students/:studentId/history', requireUserContext, analyticsController.getDiningStudentHistory);

router.get('/admin/overview', requireUserContext, analyticsController.getAdminOverview);
router.get('/admin/users/:userId/stats', requireUserContext, analyticsController.getAdminUserStats);

export default router;
