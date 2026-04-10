import express from 'express';
import engagementController from '../controllers/engagement.controller.js';
import requireUserContext from '../middlewares/user-context.middleware.js';
import { rateLimit } from '../middlewares/rate-limit.middleware.js';
import { validateQrPayload } from '../middlewares/qr.middleware.js';
import forumUpload from '../utils/forum-upload.helper.js';

const router = express.Router();

const userLimiterKey = (req) => req.userContext?.userId || req.headers['x-user-id'] || req.ip;

router.post(
  '/qr/generate',
  requireUserContext,
  rateLimit({ windowMs: 10 * 60 * 1000, max: 5, keyFn: userLimiterKey, message: 'Limite de generacion QR excedido.' }),
  engagementController.generateQr
);
router.get('/qr/current', requireUserContext, engagementController.getCurrentQr);
router.post(
  '/qr/validate',
  requireUserContext,
  rateLimit({ windowMs: 60 * 1000, max: 60, keyFn: userLimiterKey, message: 'Limite de escaneo excedido.' }),
  validateQrPayload,
  engagementController.validateQr
);
router.post('/qr/scan', requireUserContext, engagementController.scanQr);

router.get('/modules/:id/forum', requireUserContext, engagementController.getModuleForum);
router.post(
  '/modules/:id/forum/thread',
  requireUserContext,
  rateLimit({ windowMs: 60 * 1000, max: 10, keyFn: userLimiterKey, message: 'Demasiados threads por minuto.' }),
  engagementController.createThread
);
router.post(
  '/threads/:id/message',
  requireUserContext,
  rateLimit({ windowMs: 60 * 1000, max: 20, keyFn: userLimiterKey, message: 'Demasiados mensajes por minuto.' }),
  engagementController.createThreadMessage
);
router.post('/threads/:id/save', requireUserContext, engagementController.saveThread);
router.delete('/threads/:id/save', requireUserContext, engagementController.unsaveThread);
router.delete('/threads/:id', requireUserContext, engagementController.deleteThread);
router.delete('/messages/:id', requireUserContext, engagementController.deleteMessage);

router.get('/my-modules', requireUserContext, engagementController.getMyModules);
router.get('/my-attendance', requireUserContext, engagementController.getMyAttendance);
router.get('/my-qr-status', requireUserContext, engagementController.getMyQrStatus);
router.get('/my-forum-history', requireUserContext, engagementController.getMyForumHistory);
router.get('/my-stats', requireUserContext, engagementController.getMyStats);
router.get('/notifications', requireUserContext, engagementController.getNotifications);
router.post('/notifications/read', requireUserContext, engagementController.readNotifications);
router.delete('/notifications/:id', requireUserContext, engagementController.deleteNotification);
router.post('/forum/upload', requireUserContext, forumUpload.single('file'), engagementController.uploadForumFile);

router.get('/forums', requireUserContext, engagementController.getForums);
router.post('/forums', requireUserContext, engagementController.createForum);
router.get('/forums/:id', requireUserContext, engagementController.getForum);
router.post('/forums/:id/comment', requireUserContext, engagementController.createForumComment);

router.get('/stats/student', requireUserContext, engagementController.getStudentStats);
router.get('/stats/monitor-academic', requireUserContext, engagementController.getMonitorAcademicStats);
router.get('/stats/monitor-admin', requireUserContext, engagementController.getMonitorAdminStats);
router.get('/stats/admin', requireUserContext, engagementController.getAdminStats);

export default router;
