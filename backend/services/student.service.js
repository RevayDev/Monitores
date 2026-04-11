import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';
import usersRepository from '../repositories/mysql/users.repository.js';

class StudentService {
  async getAvailableModules() {
    return await monitoriasRepository.getAll();
  }

  async registerToModule(data, studentId) {
    const student = await usersRepository.findById(studentId);
    if (!student) throw new Error('Estudiante no encontrado');

    const moduloRaw = await monitoriasRepository.findById(data.monitorId);
    if (!moduloRaw) throw new Error('Modulo no encontrado');

    const normalizedEmail = student.email.trim().toLowerCase();

    return await monitoriasRepository.createRegistration({
      studentName: student.nombre,
      studentEmail: normalizedEmail,
      modulo: moduloRaw.modulo,
      monitorId: moduloRaw.id,
      registeredAt: new Date()
    });
  }

  async getMyRegistrations(studentId) {
    const student = await usersRepository.findById(studentId);
    if (!student) throw new Error('Estudiante no encontrado');

    const normalizedEmail = student.email.trim().toLowerCase();
    // Debug logging to pinpoint registration mismatches
    console.log(`[DEBUG] getMyRegistrations for studentId ${studentId}: Using email '${normalizedEmail}'`);
    const results = await monitoriasRepository.getAllRegistrations({ studentEmail: normalizedEmail });
    console.log(`[DEBUG] Found ${results.length} registrations for '${normalizedEmail}'`);
    return results;
  }
}

export default new StudentService();
