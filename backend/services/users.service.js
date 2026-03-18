import usersRepository from '../repositories/mysql/users.repository.js';
import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';
import { deleteFile } from '../utils/upload.helper.js';

class UsersService {
  async login(username, role, password) {
    const user = await usersRepository.findByUsername(username);
    if (!user || user.role !== role || user.password !== password) {
      throw new Error('Credenciales incorrectas');
    }
    if (user.is_active === 0 || user.is_active === false) {
      throw new Error('Tu cuenta ha sido dada de baja. No tienes acceso al sistema.');
    }
    return { ...user, baseRole: user.role };
  }

  async signup(userData) {
    const user = await usersRepository.create({
      ...userData,
      role: 'student'
    });
    return { ...user, baseRole: 'student' };
  }

  async getAllUsers() {
    return await usersRepository.getAll();
  }

  async getUserById(id) {
    return await usersRepository.findById(id);
  }

  async createUser(userData, creatorId) {
    const creator = await usersRepository.findById(creatorId);
    if (!creator) throw new Error('Usuario creador no encontrado.');

    // Only principal Admin can create other Admins
    if (userData.role === 'admin') {
      if (creator.role !== 'admin' || !creator.is_principal) {
        throw new Error('Solo el Administrador Principal puede crear otros administradores.');
      }
    }
    // Any Admin can create Monitors
    if (userData.role === 'monitor') {
      if (creator.role !== 'admin') {
        throw new Error('Solo los administradores pueden crear monitores.');
      }
    }
    // Only principal Dev can create other Devs
    if (userData.role === 'dev') {
      if (creator.role !== 'dev' || !creator.is_principal) {
        throw new Error('Solo el Developer Principal puede crear otros desarrolladores.');
      }
    }
    return await usersRepository.create(userData);
  }

  async updateUser(id, userData, updaterId) {
    const target = await usersRepository.findById(id);
    if (!target) throw new Error('Usuario no encontrado');

    const updater = await usersRepository.findById(updaterId);
    if (!updater) throw new Error('Usuario actualizador no encontrado.');

    // If target is dev, only principal dev can modify
    if (target.role === 'dev') {
      if (updater.role !== 'dev' || !updater.is_principal) {
        throw new Error('Solo el Developer Principal puede modificar cuentas de desarrolladores.');
      }
    }

    // If target is admin, only principal admin can modify (excluding self)
    if (target.role === 'admin' && target.id !== updater.id) {
      if (!updater.is_principal || updater.role !== 'admin') {
        throw new Error('Solo el Administrador Principal puede modificar otros administradores.');
      }
    }

    // Role change guards
    if (userData.role && userData.role !== target.role) {
      if (userData.role === 'admin') {
        if (updater.role !== 'admin' || !updater.is_principal) {
          throw new Error('Solo el Administrador Principal puede asignar el rol de administradores.');
        }
      }
      if (userData.role === 'dev') {
        if (updater.role !== 'dev' || !updater.is_principal) {
          throw new Error('Solo el Developer Principal puede asignar el rol de desarrolladores.');
        }
      }
    }

    // If updating photo, delete old one
    if (userData.foto !== undefined && userData.foto !== target.foto) {
      if (target.foto) deleteFile(target.foto);
    }

    // Name & Email Sync: If monitor info changes, update modules table
    if (target.role === 'monitor') {
      if ((userData.nombre && userData.nombre !== target.nombre) || (userData.email && userData.email !== target.email)) {
        await monitoriasRepository.updateMonitorInfo(id, {
          nombre: userData.nombre || target.nombre,
          email: userData.email || target.email
        });
      }
    }

    // Name & Email Sync: If student info changes, update registrations table
    if (target.role === 'student' || target.role === 'monitor') {
      if ((userData.nombre && userData.nombre !== target.nombre) || (userData.email && userData.email !== target.email)) {
        await monitoriasRepository.updateStudentInfo(target.email, {
          nombre: userData.nombre || target.nombre,
          email: userData.email || target.email
        });
      }
    }

    return await usersRepository.update(id, userData);
  }

  async deleteUser(id) {
    const user = await usersRepository.findById(id);
    if (!user) return false;
    if (user.is_principal) throw new Error('No se puede eliminar una cuenta principal.');
    
    // Delete photo file if exists
    if (user.foto) {
      deleteFile(user.foto);
    }

    return await usersRepository.delete(id);
  }
}

export default new UsersService();
