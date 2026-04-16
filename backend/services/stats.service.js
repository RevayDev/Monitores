import statsRepository from '../repositories/mysql/stats.repository.js';

const ADMIN_ROLES = new Set(['admin', 'dev']);
const MONITOR_ROLES = new Set(['monitor_academico', 'monitor_administrativo']);
const STUDENT_ROLES = new Set(['student']);

const normalizeRole = (role) => String(role || '').toLowerCase();

class StatsService {
  async getGlobalStats(requesterId) {
    const requester = await statsRepository.getUserById(requesterId);
    if (!requester) throw new Error('Usuario no encontrado.');

    const role = normalizeRole(requester.role);
    if (!ADMIN_ROLES.has(role) && !MONITOR_ROLES.has(role)) {
      throw new Error('No tienes permisos para consultar estadisticas globales.');
    }

    if (role === 'monitor_academico') {
      const moduleIds = await statsRepository.getModuleIdsByMonitorUser(requester.id);
      return statsRepository.getGlobalStats(moduleIds);
    }

    return statsRepository.getGlobalStats(null);
  }

  async getUserStats(requesterId, targetUserId) {
    const [requester, target] = await Promise.all([
      statsRepository.getUserById(requesterId),
      statsRepository.getUserById(targetUserId)
    ]);

    if (!requester || !target) throw new Error('Usuario no encontrado.');

    const requesterRole = normalizeRole(requester.role);
    const isAdmin = ADMIN_ROLES.has(requesterRole);
    const isSelf = Number(requester.id) === Number(target.id);
    if (!isAdmin && !isSelf) throw new Error('No autorizado para consultar estadisticas de otro usuario.');

    const role = normalizeRole(target.role);
    if (STUDENT_ROLES.has(role)) {
      return statsRepository.getStudentPersonalStats(target);
    }

    if (MONITOR_ROLES.has(role) || ADMIN_ROLES.has(role)) {
      return statsRepository.getMonitorPersonalStats(target.id);
    }

    return {
      role,
      totals: {
        total_students_attended: 0,
        average_rating_received: 0,
        sessions_count: 0
      }
    };
  }
}

export default new StatsService();
