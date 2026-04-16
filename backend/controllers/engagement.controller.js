import engagementService from '../services/engagement.service.js';

const getClientContext = (req) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'] || null
});

const generateQr = async (req, res) => {
  try {
    const userId = req.userContext.userId;
    const moduleId = req.body?.moduleId ? Number(req.body.moduleId) : null;
    const qr = await engagementService.generateQr(userId, moduleId, getClientContext(req));
    res.status(201).json(qr);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCurrentQr = async (req, res) => {
  try {
    const userId = req.userContext.userId;
    const qr = await engagementService.getCurrentQr(userId);
    res.json(qr || null);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const validateQr = async (req, res) => {
  try {
    const scannerUserId = req.userContext.userId;
    const result = await engagementService.validateQr(
      {
        token: req.body.token,
        moduleId: Number(req.body.moduleId),
        scannerUserId
      },
      getClientContext(req)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const scanQr = async (req, res) => {
  try {
    const scannerUserId = req.userContext.userId;
    const result = await engagementService.scanQrForLunch(
      { token: req.body?.token, scannerUserId },
      getClientContext(req)
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getModuleForum = async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    const userId = req.userContext.userId;
    const data = await engagementService.getModuleForum(moduleId, userId);
    res.json(data);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const createThread = async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    const userId = req.userContext.userId;
    const result = await engagementService.createThread(moduleId, userId, req.body, getClientContext(req));
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createThreadMessage = async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    const userId = req.userContext.userId;
    const result = await engagementService.createThreadMessage(threadId, userId, req.body, getClientContext(req));
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyModules = async (req, res) => {
  try {
    const modules = await engagementService.getMyModules(req.userContext.userId);
    res.json(modules);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const attendance = await engagementService.getMyAttendance(req.userContext.userId);
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyQrStatus = async (req, res) => {
  try {
    const qrStatus = await engagementService.getMyQrStatus(req.userContext.userId);
    res.json(qrStatus || null);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyForumHistory = async (req, res) => {
  try {
    const data = await engagementService.getMyForumHistory(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const saveThread = async (req, res) => {
  try {
    const result = await engagementService.saveThread(req.userContext.userId, Number(req.params.id));
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const unsaveThread = async (req, res) => {
  try {
    const result = await engagementService.unsaveThread(req.userContext.userId, Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteThread = async (req, res) => {
  try {
    const result = await engagementService.deleteThread(req.userContext.userId, Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const result = await engagementService.deleteMessage(Number(req.params.id), req.userContext.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const data = await engagementService.getNotifications(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const readNotifications = async (req, res) => {
  try {
    const data = await engagementService.readNotifications(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const data = await engagementService.deleteNotification(req.userContext.userId, Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMyStats = async (req, res) => {
  try {
    const data = await engagementService.getMyStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const uploadForumFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subio ningun archivo.' });
  const fileUrl = `http://localhost:3000/uploads/forum/${req.file.filename}`;
  const mime = req.file.mimetype || '';
  const kind = mime.startsWith('image/')
    ? 'image'
    : mime.startsWith('video/')
      ? 'video'
      : 'file';
  res.status(201).json({ url: fileUrl, kind, name: req.file.originalname });
};

const getForums = async (req, res) => {
  try {
    const data = await engagementService.listForums({ subjectId: req.query?.subject_id }, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getForumsByModule = async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);
    const data = await engagementService.listForumsByModule(moduleId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getForumMembers = async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);
    const data = await engagementService.listForumMembers(moduleId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createForum = async (req, res) => {
  try {
    const data = await engagementService.createForum(req.userContext.userId, req.body, getClientContext(req));
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getForum = async (req, res) => {
  try {
    const forumId = Number(req.params.id);
    if (!Number.isInteger(forumId) || forumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.getForumById(forumId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createForumComment = async (req, res) => {
  try {
    const forumId = Number(req.params.id);
    if (!Number.isInteger(forumId) || forumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.createForumReply(
      forumId,
      req.userContext.userId,
      req.body,
      getClientContext(req)
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createForumReply = async (req, res) => {
  try {
    const forumId = Number(req.params.id);
    if (!Number.isInteger(forumId) || forumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.createForumReply(
      forumId,
      req.userContext.userId,
      req.body,
      getClientContext(req)
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const toggleForumSave = async (req, res) => {
  try {
    const forumId = Number(req.params.id);
    if (!Number.isInteger(forumId) || forumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.toggleForumSave(forumId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteForum = async (req, res) => {
  try {
    const forumId = Number(req.params.id);
    if (!Number.isInteger(forumId) || forumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.deleteForum(forumId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getStudentStats = async (req, res) => {
  try {
    const data = await engagementService.getStudentStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMonitorAcademicStats = async (req, res) => {
  try {
    const data = await engagementService.getMonitorAcademicStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMonitorAdminStats = async (req, res) => {
  try {
    const data = await engagementService.getMonitorAdminStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const data = await engagementService.getAdminStats(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateForum = async (req, res) => {
  try {
    const data = await engagementService.updateForum(req.userContext.userId, req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateForumReply = async (req, res) => {
  try {
    const data = await engagementService.updateForumReply(req.userContext.userId, req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateForumPresence = async (req, res) => {
  try {
    const { forumId } = req.params;
    const parsedForumId = Number(forumId);
    if (!Number.isInteger(parsedForumId) || parsedForumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const { isTyping } = req.body;
    await engagementService.updateForumPresence(req.userContext.userId, parsedForumId, isTyping);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getForumPresence = async (req, res) => {
  try {
    const { forumId } = req.params;
    const parsedForumId = Number(forumId);
    if (!Number.isInteger(parsedForumId) || parsedForumId <= 0) {
      return res.status(400).json({ error: 'ID de foro invalido.' });
    }
    const data = await engagementService.getForumPresence(parsedForumId, req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const reportForum = async (req, res) => {
  try {
    const data = await engagementService.reportForum(req.userContext.userId, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const data = await engagementService.getReports(req.userContext.userId, req.query);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const resolveReport = async (req, res) => {
  try {
    const reportId = Number(req.params.id);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: 'ID de reporte invalido.' });
    }
    const { resolution_note } = req.body || {};
    const data = await engagementService.resolveReport(req.userContext.userId, reportId, resolution_note);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getModerationLogs = async (req, res) => {
  try {
    const data = await engagementService.getModerationLogs(req.userContext.userId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default {
  generateQr,
  getCurrentQr,
  validateQr,
  scanQr,
  getModuleForum,
  createThread,
  createThreadMessage,
  getMyModules,
  getMyAttendance,
  getMyQrStatus,
  getMyForumHistory,
  uploadForumFile,
  saveThread,
  unsaveThread,
  deleteThread,
  deleteMessage,
  getNotifications,
  readNotifications,
  deleteNotification,
  getForums,
  getForumsByModule,
  getForumMembers,
  createForum,
  getForum,
  createForumComment,
  createForumReply,
  toggleForumSave,
  deleteForum,
  getStudentStats,
  getMonitorAcademicStats,
  getMonitorAdminStats,
  getAdminStats,
  updateForum,
  updateForumReply,
  getMyStats,
  updateForumPresence,
  getForumPresence,
  reportForum,
  getReports,
  resolveReport,
  getModerationLogs,
  resetScans: async (req, res) => {
    try {
      await engagementService.resetAllScans(req.userContext.userId);
      res.json({ success: true, message: 'Todos los registros de escaneo han sido eliminados.' });
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }
};
