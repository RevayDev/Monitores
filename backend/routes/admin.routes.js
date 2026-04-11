import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authMiddleware, roleMiddleware, adminPrincipalMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
// Apply role middleware to ensure only admins enter
router.use(roleMiddleware('admin'));

router.get('/admin/stats', adminController.getStats);
router.get('/admin/users', adminController.getUsers);
router.get('/admin/complaints', adminController.getComplaints);
router.delete('/admin/user/:id', adminController.deleteUser);

// Only principal admin can call this
router.post('/admin/create-admin', adminPrincipalMiddleware, adminController.createAdmin);

export default router;
