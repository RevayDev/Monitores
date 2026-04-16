import express from 'express';
import devController from '../controllers/dev.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de utilidades requieren ser desarrollador o admin principal
router.use(authMiddleware);

// Endpoints Técnicos con roleMiddleware específico para evitar fugas
router.post('/dev/db-reset', roleMiddleware('dev', 'admin'), devController.resetDatabase);
router.post('/dev/db-nuke', roleMiddleware('dev', 'admin'), devController.nukeDatabase);
router.post('/dev/db-populate', roleMiddleware('dev', 'admin'), devController.populateTestData);
router.post('/dev/db-populate-volume', roleMiddleware('dev', 'admin'), devController.populateVolume);
router.post('/dev/fix-usernames', roleMiddleware('dev', 'admin'), devController.fixUsernames);
router.get('/dev/diagnostics', roleMiddleware('dev', 'admin'), devController.runDiagnostics);
router.post('/dev/terminal', roleMiddleware('dev', 'admin'), devController.runTerminalCommand);
router.post('/dev/terminal/suggestions', roleMiddleware('dev', 'admin'), devController.getTerminalSuggestions);
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

// ROOT Terminal routes
router.post('/dev/root/enable', roleMiddleware('dev', 'admin'), devController.rootEnable);
router.post('/dev/root/member', roleMiddleware('dev', 'admin'), devController.rootMemberAction);
router.post('/dev/root/file', roleMiddleware('dev', 'admin'), devController.rootFileAction);
router.get('/dev/root/logs', roleMiddleware('dev', 'admin'), devController.getRootLogs);
router.get('/dev/root/backup', roleMiddleware('dev', 'admin'), devController.rootSystemBackup);
router.post('/dev/root/restore', roleMiddleware('dev', 'admin'), upload.single('backup'), devController.rootSystemRestore);

export default router;
