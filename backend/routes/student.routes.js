import { Router } from 'express';
import studentController from '../controllers/student.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Expanded roles so monitors/admins can also participate as students if needed
router.get('/student/modules', roleMiddleware('student', 'monitor', 'admin', 'dev'), studentController.getModules);
router.post('/student/register', roleMiddleware('student', 'monitor', 'admin', 'dev'), studentController.register);
router.get('/student/my-registrations', roleMiddleware('student', 'monitor', 'admin', 'dev'), studentController.getMyRegistrations);

export default router;
