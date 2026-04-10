import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';

class MonitoriasService {
  parseHorarioWindow(horario) {
    if (!horario) return null;
    const raw = String(horario).trim();
    const withDays = raw.match(/^(.*?)\s(\d{2}:\d{2})\s-\s(\d{2}:\d{2})$/);
    if (withDays) {
      const dias = withDays[1].split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      return { dias, start: withDays[2], end: withDays[3] };
    }
    const plain = raw.match(/^(\d{2}:\d{2})\s-\s(\d{2}:\d{2})$/);
    if (plain) {
      return { dias: [], start: plain[1], end: plain[2] };
    }
    return null;
  }

  getCurrentDayNameEs() {
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const raw = map[new Date().getDay()];
    return raw;
  }

  toMinutes(hhmm) {
    const [hh, mm] = String(hhmm).split(':').map(Number);
    return hh * 60 + mm;
  }

  async getAllMonitorias(filters) {
    return await monitoriasRepository.getAll(filters);
  }

  async createMonitoria(data) {
    return await monitoriasRepository.create(data);
  }

  async updateMonitoria(id, data) {
    return await monitoriasRepository.update(id, data);
  }

  async deleteMonitoria(id) {
    return await monitoriasRepository.delete(id);
  }

  // Registrations
  async getAllRegistrations(filters) {
    return await monitoriasRepository.getAllRegistrations(filters);
  }

  async registerStudent(monitoria, usuario) {
    const registrations = await monitoriasRepository.getAllRegistrations();
    const isDuplicate = registrations.some(
      (r) => Number(r.moduleId) === Number(monitoria.id) && r.studentEmail === usuario.email
    );
    if (isDuplicate) throw new Error('Ya estas registrado.');

    const newReg = {
      moduleId: monitoria.id,
      modulo: monitoria.modulo,
      studentName: usuario?.nombre,
      studentId: usuario?.id || null,
      studentEmail: usuario?.email,
      registeredAt: new Date().toISOString()
    };
    return await monitoriasRepository.createRegistration(newReg);
  }

  async deleteRegistration(id) {
    return await monitoriasRepository.deleteRegistration(id);
  }

  // Maintenance
  async getMaintenance() {
    return await monitoriasRepository.getMaintenance();
  }

  async updateMaintenance(config) {
    return await monitoriasRepository.updateMaintenance(config);
  }

  // Selects
  async getSedes() {
    return await monitoriasRepository.getStaticData('sedes');
  }
  async getCuatrimestres() {
    return await monitoriasRepository.getStaticData('cuatrimestres');
  }
  async getModalidades() {
    return await monitoriasRepository.getStaticData('modalidades');
  }
  async getProgramas() {
    return await monitoriasRepository.getStaticData('programas');
  }

  // Attendance & Complaints
  async getAllAttendance() {
    return await monitoriasRepository.getAllAttendance();
  }
  async submitAttendance(data) {
    return await monitoriasRepository.addAttendance(data);
  }
  async submitComplaint(data) {
    return await monitoriasRepository.addComplaint(data);
  }

  async getAttendanceSheet(moduleId, monitorUserId) {
    const moduleData = await monitoriasRepository.findById(moduleId);
    if (!moduleData) throw new Error('Modulo no encontrado.');
    if (Number(moduleData.monitorId) !== Number(monitorUserId)) {
      throw new Error('No autorizado para este modulo.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const regs = await monitoriasRepository.getRegistrationsByModule(moduleId);
    const savedRows = await monitoriasRepository.getAttendanceSheetByDate(moduleId, today);
    const savedMap = new Map(
      savedRows.map((r) => {
        const emailMatch = String(r.comment || '').match(/EMAIL=([^;]+)/);
        return [emailMatch ? emailMatch[1] : '', r];
      })
    );

    const students = regs.map((s) => {
      const saved = savedMap.get(s.studentEmail);
      return {
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        present: saved ? Number(saved.rating) === 1 : false,
        saved: !!saved
      };
    });

    return {
      module: moduleData,
      date: today,
      locked: savedRows.length > 0,
      students
    };
  }

  async saveAttendanceSheet(moduleId, monitorUserId, rows) {
    const moduleData = await monitoriasRepository.findById(moduleId);
    if (!moduleData) throw new Error('Modulo no encontrado.');
    if (Number(moduleData.monitorId) !== Number(monitorUserId)) {
      throw new Error('No autorizado para este modulo.');
    }

    const schedule = this.parseHorarioWindow(moduleData.horario);
    if (!schedule) throw new Error('Horario del modulo invalido.');

    const currentDay = this.getCurrentDayNameEs();
    const normalizedDias = (schedule.dias || []).map((d) => d.normalize('NFD').replace(/\p{Diacritic}/gu, ''));
    const normalizedCurrent = currentDay.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (normalizedDias.length > 0 && !normalizedDias.includes(normalizedCurrent)) {
      throw new Error('La asistencia solo se puede guardar en los dias del horario.');
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = this.toMinutes(schedule.start);
    const end = this.toMinutes(schedule.end);
    if (nowMinutes < start || nowMinutes > end) {
      throw new Error('La asistencia solo se puede guardar dentro del horario establecido.');
    }

    const today = now.toISOString().slice(0, 10);
    const existing = await monitoriasRepository.getAttendanceSheetByDate(moduleId, today);
    if (existing.length > 0) {
      throw new Error('La asistencia de hoy ya fue guardada y no puede modificarse.');
    }

    await monitoriasRepository.saveAttendanceBatch(
      moduleId,
      today,
      (rows || []).map((r) => ({
        monitorUserId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        present: !!r.present
      }))
    );

    return { success: true };
  }
}

export default new MonitoriasService();
