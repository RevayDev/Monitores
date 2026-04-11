import reportsRepository from '../repositories/mysql/reports.repository.js';
import attendanceRepository from '../repositories/mysql/attendance.repository.js';

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
