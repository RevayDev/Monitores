import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';

class MonitoriasService {
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
    const isDuplicate = registrations.some(r => r.monitorId === monitoria.id && r.studentEmail === usuario.email);
    if (isDuplicate) throw new Error("Ya estás registrado.");

    const newReg = {
      monitorId: monitoria.id,
      modulo: monitoria.modulo,
      studentName: usuario?.nombre,
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
  async getSedes() { return await monitoriasRepository.getStaticData('sedes'); }
  async getCuatrimestres() { return await monitoriasRepository.getStaticData('cuatrimestres'); }
  async getModalidades() { return await monitoriasRepository.getStaticData('modalidades'); }
  async getProgramas() { return await monitoriasRepository.getStaticData('programas'); }

  // Attendance & Complaints
  async getAllAttendance() { return await monitoriasRepository.getAllAttendance(); }
  async submitAttendance(data) { return await monitoriasRepository.addAttendance(data); }
  async submitComplaint(data) { return await monitoriasRepository.addComplaint(data); }
}

export default new MonitoriasService();
