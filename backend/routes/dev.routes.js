import express from 'express';
import devController from '../controllers/dev.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de utilidades requieren ser desarrollador o admin principal
router.use(authMiddleware);

// Endpoints Técnicos con roleMiddleware específico para evitar fugas
router.post('/dev/db-reset', roleMiddleware('dev', 'admin'), devController.resetDatabase);
router.post('/dev/db-populate', roleMiddleware('dev', 'admin'), devController.populateTestData);
router.post('/dev/fix-usernames', roleMiddleware('dev', 'admin'), devController.fixUsernames);
router.get('/dev/diagnostics', roleMiddleware('dev', 'admin'), devController.runDiagnostics);
router.post('/dev/terminal', roleMiddleware('dev', 'admin'), devController.runTerminalCommand);

export default router;
