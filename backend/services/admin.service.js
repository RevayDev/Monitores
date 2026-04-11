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

}

export default new AdminService();
