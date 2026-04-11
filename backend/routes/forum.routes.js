import express from 'express';
import forumController from '../controllers/forum.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/questions/:moduleId', authMiddleware, forumController.getQuestionsByModule);
router.get('/history', authMiddleware, forumController.getHistory);
router.post('/questions', authMiddleware, forumController.createQuestion);
router.post('/answers', authMiddleware, forumController.createAnswer);
router.put('/answers/:id/accept', authMiddleware, forumController.acceptAnswer);

export default router;
