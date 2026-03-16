const monitoriasRepository = require('../repositories/json/monitorias.repository');

class MonitoriasService {
  async getAllMonitorias() {
    return await monitoriasRepository.getAll();
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
  async getAllRegistrations() {
    return await monitoriasRepository.getAllRegistrations();
  }

  async registerStudent(monitoria, usuario) {
    const registrations = await monitoriasRepository.getAllRegistrations();
    const isDuplicate = registrations.some(r => r.id === monitoria.id && r.studentEmail === usuario.email);
    if (isDuplicate) throw new Error("Ya estás registrado.");

    const newReg = {
      id: monitoria.id,
      registrationId: Date.now(),
      ...monitoria,
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

module.exports = new MonitoriasService();
