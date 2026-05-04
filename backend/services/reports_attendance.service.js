import reportsRepository from '../repositories/mysql/reports.repository.js';
import attendanceRepository from '../repositories/mysql/attendance.repository.js';
import feedbackRepository from '../repositories/mysql/feedback.repository.js';

class ReportsService {
  async createReport(data, user) {
    // Basic business rules: 
    // - Students can report monitors
    // - Monitors can report students
    // For now we'll rely on the frontend sending the correct 'tipo' and 'reported_id'.
    // but we can add validation here.
    return await reportsRepository.createReport(data);
  }

  async getAllReports() {
    return await reportsRepository.getAllReports();
  }

  async getMealLogs() {
    return await reportsRepository.getMealLogs();
  }
}

class AttendanceService {
  async registerAttendance(data) {
    return await attendanceRepository.registerAttendance(data);
  }

  async getAttendanceByModule(moduleId) {
    return await attendanceRepository.getAttendanceByModule(moduleId);
  }
}

export const reportsService = new ReportsService();
export const attendanceService = new AttendanceService();


class FeedbackService {
  async upsertMyFeedback(moduleId, userId, payload = {}) {
    const modId = Number(moduleId);
    if (!Number.isInteger(modId) || modId <= 0) throw new Error('ID de modulo invalido.');
    const rating = payload.rating === undefined ? null : Number(payload.rating);
    if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) throw new Error('Rating invalido.');
    const comment = String(payload.comment || '').trim();
    if (!comment) throw new Error('Comentario requerido.');
    const isPublic = payload.isPublic !== false;
    const isAnonymous = !!payload.isAnonymous;
    await feedbackRepository.upsertFeedback({ moduleId: modId, studentId: Number(userId), rating, comment, isPublic, isAnonymous });
    return { success: true };
  }

  async getMyFeedback(moduleId, userId) {
    const modId = Number(moduleId);
    if (!Number.isInteger(modId) || modId <= 0) throw new Error('ID de modulo invalido.');
    return await feedbackRepository.getMyFeedback(modId, Number(userId));
  }

  async getModuleFeedbackForMonitor(moduleId, userId) {
    const modId = Number(moduleId);
    if (!Number.isInteger(modId) || modId <= 0) throw new Error('ID de modulo invalido.');
    const mod = await feedbackRepository.getModuleById(modId);
    if (!mod) throw new Error('Modulo no encontrado.');
    if (Number(mod.monitorId) !== Number(userId)) throw new Error('No autorizado para ver comentarios de este modulo.');
    return await feedbackRepository.getModuleFeedbackForMonitor(modId);
  }
}

export const feedbackService = new FeedbackService();
