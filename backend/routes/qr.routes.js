import express from 'express';
import qrController from '../controllers/qr.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/qr', authMiddleware, qrController.generateQR);
router.post('/qr/validate', authMiddleware, roleMiddleware('monitor', 'admin'), qrController.validateQR);

export default router;
