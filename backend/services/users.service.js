const usersRepository = require('../repositories/json/users.repository');

class UsersService {
  async login(email, role, password) {
    const user = await usersRepository.findByEmail(email);
    if (user && user.role === role && user.password === password) {
      return { ...user, baseRole: user.role };
    }
    throw new Error('Credenciales o rol incorrectos.');
  }

  async signup(userData) {
    return await usersRepository.create({
      ...userData,
      role: 'student',
      baseRole: 'student'
    });
  }

  async getAllUsers() {
    return await usersRepository.getAll();
  }

  async createUser(userData) {
    return await usersRepository.create(userData);
  }

  async updateUser(id, userData) {
    const user = await usersRepository.findById(id);
    if (user?.role === 'dev') throw new Error('Cannot modify dev account');
    return await usersRepository.update(id, userData);
  }

  async deleteUser(id) {
    const user = await usersRepository.findById(id);
    if (user?.role === 'dev') throw new Error('Cannot delete dev account');
    return await usersRepository.delete(id);
  }
}

module.exports = new UsersService();
