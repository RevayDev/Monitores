import { Router } from 'express';
import supportController from '../controllers/support.controller.js';
import { requireUserContext } from '../middlewares/user-context.middleware.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/support/contact', requireUserContext, supportController.submitSupportRequest);
router.get('/support/tickets', authMiddleware, roleMiddleware('dev', 'admin'), supportController.listSupportTickets);
router.post('/support/tickets/:id/respond', authMiddleware, roleMiddleware('dev', 'admin'), supportController.respondSupportTicket);
router.patch('/support/tickets/:id/status', authMiddleware, roleMiddleware('dev', 'admin'), supportController.updateSupportTicketStatus);
router.delete('/support/tickets/:id', authMiddleware, roleMiddleware('dev', 'admin'), supportController.deleteSupportTicket);

export default router;
