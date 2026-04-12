import adminRepository from '../repositories/mysql/admin.repository.js';
import usersRepository from '../repositories/mysql/users.repository.js';

class AdminService {
  async getStats() {
    return await adminRepository.getStats();
  }

  async getUsers(roleFilter) {
    const allUsers = await usersRepository.getAll();
    if (roleFilter) {
      return allUsers.filter(u => u.role === roleFilter);
    }
    return allUsers;
  }

  async getComplaints() {
    return await adminRepository.getComplaints();
  }

  async getAllModules() {
    // Usamos el repositorio de monitorias para obtener todos los modulos
    const monitoriasRepository = (await import('../repositories/mysql/monitorias.repository.js')).default;
    const modules = await monitoriasRepository.getAll();
    return modules;
  }

  async updateModule(id, data) {
    const monitoriasRepository = (await import('../repositories/mysql/monitorias.repository.js')).default;
    return await monitoriasRepository.update(id, data);
  }

  async deleteModule(id) {
    const monitoriasRepository = (await import('../repositories/mysql/monitorias.repository.js')).default;
    return await monitoriasRepository.delete(id);
  }
}

export default new AdminService();
