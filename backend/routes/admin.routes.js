import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authMiddleware, roleMiddleware, adminPrincipalMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// Las rutas admin individuales llevan su propio roleMiddleware para evitar fugas a otros routers
router.get('/admin/stats', roleMiddleware('admin'), adminController.getStats);
router.get('/admin/users', roleMiddleware('admin'), adminController.getUsers);
router.get('/admin/complaints', roleMiddleware('admin'), adminController.getComplaints);
router.delete('/admin/user/:id', roleMiddleware('admin'), adminController.deleteUser);

// Module management
router.get('/admin/modules-management', roleMiddleware('admin'), adminController.getModules);
router.put('/admin/modules-management/:id', roleMiddleware('admin'), adminController.updateModule);
router.delete('/admin/modules-management/:id', roleMiddleware('admin'), adminController.deleteModule);

// Only principal admin can call this
router.post('/admin/create-admin', adminPrincipalMiddleware, adminController.createAdmin);

export default router;
