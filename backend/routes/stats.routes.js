import express from 'express';
import statsController from '../controllers/stats.controller.js';
import requireUserContext from '../middlewares/user-context.middleware.js';

const router = express.Router();

router.get('/stats/global', requireUserContext, statsController.getGlobalStats);
router.get('/stats/user/:id', requireUserContext, statsController.getUserStats);

export default router;
