import usersRepository from '../repositories/mysql/users.repository.js';
import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';
import engagementRepository from '../repositories/mysql/engagement.repository.js';
import { deleteFile } from '../utils/upload.helper.js';

class UsersService {
  normalizeRole(role) {
    const map = {
      student: 'estudiante',
      monitor: 'monitor_academico'
    };
    return map[role] || role;
  }

  isAdminRole(role) {
    return ['admin', 'dev'].includes(role);
  }

  async login(username, role, password) {
    const user = await usersRepository.findByUsername(username);
    const incoming = this.normalizeRole(role);
    const stored = this.normalizeRole(user?.role);
    if (!user || stored !== incoming || user.password !== password) {
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
      role: 'estudiante'
    });
    await engagementRepository.createNotification({
      userId: user.id,
      type: 'account_created',
      title: 'Cuenta creada',
      body: 'Tu cuenta fue creada correctamente.',
      metadata: { userId: user.id }
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
    const requestedRole = this.normalizeRole(userData.role);
    const creatorRole = this.normalizeRole(creator.role);
    if (requestedRole === 'admin') {
      if (creatorRole !== 'admin' || !creator.is_principal) {
        throw new Error('Solo el Administrador Principal puede crear otros administradores.');
      }
    }
    // Any Admin can create Monitors
    if (['monitor_academico', 'monitor_administrativo'].includes(requestedRole)) {
      if (creatorRole !== 'admin') {
        throw new Error('Solo los administradores pueden crear monitores.');
      }
    }
    // Only principal Dev can create other Devs
    if (requestedRole === 'dev') {
      if (creatorRole !== 'dev' || !creator.is_principal) {
        throw new Error('Solo el Developer Principal puede crear otros desarrolladores.');
      }
    }
    const created = await usersRepository.create({ ...userData, role: requestedRole });
    await engagementRepository.createNotification({
      userId: created.id,
      type: 'account_created_by_admin',
      title: 'Cuenta agregada',
      body: 'Un administrador creo tu cuenta.',
      metadata: { userId: created.id }
    });
    return created;
  }

  async updateUser(id, userData, updaterId) {
    const target = await usersRepository.findById(id);
    if (!target) throw new Error('Usuario no encontrado');

    const updater = await usersRepository.findById(updaterId);
    if (!updater) throw new Error('Usuario actualizador no encontrado.');

    // If target is dev, only principal dev can modify
    const targetRole = this.normalizeRole(target.role);
    const updaterRole = this.normalizeRole(updater.role);
    if (targetRole === 'dev') {
      if (updaterRole !== 'dev' || !updater.is_principal) {
        throw new Error('Solo el Developer Principal puede modificar cuentas de desarrolladores.');
      }
    }

    // If target is admin, only principal admin can modify (excluding self)
    if (targetRole === 'admin' && target.id !== updater.id) {
      if (!updater.is_principal || updaterRole !== 'admin') {
        throw new Error('Solo el Administrador Principal puede modificar otros administradores.');
      }
    }

    // Role change guards
    if (userData.role && this.normalizeRole(userData.role) !== targetRole) {
      const nextRole = this.normalizeRole(userData.role);
      if (nextRole === 'admin') {
        if (updaterRole !== 'admin' || !updater.is_principal) {
          throw new Error('Solo el Administrador Principal puede asignar el rol de administradores.');
        }
      }
      if (nextRole === 'dev') {
        if (updaterRole !== 'dev' || !updater.is_principal) {
          throw new Error('Solo el Developer Principal puede asignar el rol de desarrolladores.');
        }
      }
      userData.role = nextRole;
    }

    // If updating photo, delete old one
    if (userData.foto !== undefined && userData.foto !== target.foto) {
      if (target.foto) deleteFile(target.foto);
    }

    // Name & Email Sync: If monitor info changes, update modules table
    if (['monitor', 'monitor_academico', 'monitor_administrativo'].includes(target.role)) {
      if ((userData.nombre && userData.nombre !== target.nombre) || (userData.email && userData.email !== target.email)) {
        await monitoriasRepository.updateMonitorInfo(id, {
          nombre: userData.nombre || target.nombre,
          email: userData.email || target.email
        });
      }
    }

    // Name & Email Sync: If student info changes, update registrations table
    if (['student', 'estudiante', 'monitor', 'monitor_academico', 'monitor_administrativo'].includes(target.role)) {
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

    await usersRepository.anonymize(id);
    await engagementRepository.createActivityLog({
      userId: id,
      action: 'USER_ANONYMIZED',
      entityType: 'user',
      entityId: id,
      metadata: { strategy: 'soft-delete-anonymization' }
    });
    return true;
  }
}

export default new UsersService();
