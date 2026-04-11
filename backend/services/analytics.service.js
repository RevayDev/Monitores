import analyticsRepository from '../repositories/mysql/analytics.repository.js';
import statsService from './stats.service.js';

const ADMIN_ROLES = new Set(['admin', 'dev']);
const ACADEMIC_MONITOR_ROLES = new Set(['monitor', 'monitor_academico']);
const ADMIN_MONITOR_ROLES = new Set(['monitor_administrativo']);

class AnalyticsService {
  async getCurrentUser(userId) {
    const user = await analyticsRepository.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    return user;
  }

  async getAcademicModules(requesterId) {
    const user = await this.getCurrentUser(requesterId);
    if (ADMIN_ROLES.has(user.role)) return analyticsRepository.getModulesByMonitor(requesterId);
    if (!ACADEMIC_MONITOR_ROLES.has(user.role)) {
      throw new Error('Solo monitores academicos pueden ver modulos academicos.');
    }
    return analyticsRepository.getModulesByMonitor(user.id);
  }

  async createAcademicSession(moduleId, requesterId, payload) {
    const user = await this.getCurrentUser(requesterId);
    if (!ACADEMIC_MONITOR_ROLES.has(user.role) && !ADMIN_ROLES.has(user.role)) {
      throw new Error('No autorizado para crear sesiones academicas.');
    }

    const startTime = payload?.start_time;
    const endTime = payload?.end_time;
    const attendance = Array.isArray(payload?.attendance) ? payload.attendance : [];
    if (!startTime || !endTime) throw new Error('start_time y end_time son obligatorios.');
    if (new Date(endTime) <= new Date(startTime)) throw new Error('end_time debe ser mayor a start_time.');

    const normalizedRows = attendance.map((item) => {
      const status = String(item?.status || '').toUpperCase();
      if (!['PRESENTE', 'AUSENTE', 'EXCUSA'].includes(status)) {
        throw new Error('Estado invalido. Use PRESENTE, AUSENTE o EXCUSA.');
      }
      const excuse = item?.excuse || {};
      return {
        student_id: item?.student_id ? Number(item.student_id) : null,
        student_name: item?.student_name || null,
        status,
        excuse_reason: status === 'EXCUSA' ? (excuse.reason || null) : null,
        excuse_description: status === 'EXCUSA' ? (excuse.description || null) : null,
        rating: item?.rating ? Number(item.rating) : null
      };
    });

    const ratings = normalizedRows.map((r) => r.rating).filter((r) => Number.isFinite(r) && r >= 1 && r <= 5);
    const ratingAverage = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : null;
    const sessionId = await analyticsRepository.createAcademicSession({
      moduleId: Number(moduleId),
      monitorId: user.id,
      startTime,
      endTime,
      ratingAverage
    });
    await analyticsRepository.createAcademicAttendanceRows(sessionId, normalizedRows);
    return { id: sessionId };
  }

  async getAcademicModuleStats(moduleId, requesterId) {
    const user = await this.getCurrentUser(requesterId);
    const scopeMonitorId = ADMIN_ROLES.has(user.role) ? null : user.id;
    return analyticsRepository.getAcademicModuleStats(Number(moduleId), scopeMonitorId);
  }

  async getAcademicSessionHistory(moduleId, requesterId) {
    const user = await this.getCurrentUser(requesterId);
    const scopeMonitorId = ADMIN_ROLES.has(user.role) ? null : user.id;
    return analyticsRepository.getAcademicSessionHistory(Number(moduleId), scopeMonitorId);
  }

  async getAcademicSessionDetail(sessionId, requesterId) {
    await this.getCurrentUser(requesterId);
    const session = await analyticsRepository.getAcademicSessionById(Number(sessionId));
    if (!session) throw new Error('Sesion no encontrada.');
    const attendance = await analyticsRepository.getAcademicSessionAttendance(Number(sessionId));
    return { ...session, attendance };
  }

  async addAttendanceExcuse(attendanceId, requesterId, payload) {
    const user = await this.getCurrentUser(requesterId);
    if (!ACADEMIC_MONITOR_ROLES.has(user.role) && !ADMIN_ROLES.has(user.role)) {
      throw new Error('No autorizado para registrar excusas.');
    }
    const reason = String(payload?.reason || '').trim();
    const description = String(payload?.description || '').trim();
    if (!reason) throw new Error('El motivo es obligatorio.');
    const ok = await analyticsRepository.updateAcademicAttendanceExcuse(Number(attendanceId), {
      status: 'EXCUSA',
      reason,
      description
    });
    if (!ok) throw new Error('Registro de asistencia no encontrado.');
    return { success: true };
  }

  async getDiningStats(requesterId) {
    const user = await this.getCurrentUser(requesterId);
    const scopeScanner = ADMIN_MONITOR_ROLES.has(user.role) ? user.id : null;
    if (!scopeScanner && !ADMIN_ROLES.has(user.role)) {
      throw new Error('No autorizado para estadisticas de comedor.');
    }
    return analyticsRepository.getDiningStats(scopeScanner);
  }

  async getDiningStudentHistory(studentId, requesterId) {
    const user = await this.getCurrentUser(requesterId);
    const scopeScanner = ADMIN_MONITOR_ROLES.has(user.role) ? user.id : null;
    if (!scopeScanner && !ADMIN_ROLES.has(user.role)) {
      throw new Error('No autorizado para historial de comedor.');
    }
    return analyticsRepository.getDiningStudentHistory(Number(studentId), scopeScanner);
  }

  async getAdminOverview(requesterId) {
    const user = await this.getCurrentUser(requesterId);
    if (!ADMIN_ROLES.has(user.role)) throw new Error('Solo admin/dev pueden ver vista global.');
    return analyticsRepository.getAdminOverview();
  }

  async getAdminUserStats(targetId, requesterId) {
    const user = await this.getCurrentUser(requesterId);
    if (!ADMIN_ROLES.has(user.role)) throw new Error('Solo admin/dev pueden ver estadisticas de miembros.');
    const userStats = await statsService.getUserStats(requesterId, Number(targetId));
    const diningHistory = await analyticsRepository.getDiningStudentHistory(Number(targetId), null);
    return { user_stats: userStats, dining_history: diningHistory };
  }
}

export default new AnalyticsService();
