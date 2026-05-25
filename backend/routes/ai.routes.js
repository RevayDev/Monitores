import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js';
import aiController from '../controllers/ai.controller.js';

const router = Router();

router.post('/ai/session', authMiddleware, aiController.createAiSession);
router.post('/ai/ask', authMiddleware, aiLimiter, aiController.askAi);
router.get('/ai/session/:id/history', authMiddleware, aiController.getAiHistory);

export default router;
