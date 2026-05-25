import { Router } from 'express';
import supportController from '../controllers/support.controller.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware.js';
import requireUserContext from '../middlewares/user-context.middleware.js';
import supportUpload from '../utils/support-upload.helper.js';

const router = Router();

router.post('/support/contact', supportController.submitSupportRequest);
router.get('/support/tickets', authMiddleware, roleMiddleware('dev', 'admin'), supportController.listSupportTickets);
router.post('/support/tickets/:id/respond', authMiddleware, roleMiddleware('dev', 'admin'), supportController.respondSupportTicket);
router.patch('/support/tickets/:id/status', authMiddleware, roleMiddleware('dev', 'admin'), supportController.updateSupportTicketStatus);
router.delete('/support/tickets/:id', authMiddleware, roleMiddleware('dev', 'admin'), supportController.deleteSupportTicket);

router.get('/support/tickets/:id/messages', authMiddleware, supportController.getTicketMessages);
router.post('/support/tickets/:id/messages', authMiddleware, supportController.addTicketMessage);
router.post('/support/tickets/:id/assign', authMiddleware, roleMiddleware('dev', 'admin'), supportController.assignTicketToAdvisor);

// File upload for support chat — saves to /uploads/support/
router.post('/support/upload', requireUserContext, supportUpload.single('file'), supportController.uploadSupportFile);

export default router;
