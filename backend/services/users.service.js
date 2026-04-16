import usersRepository from '../repositories/mysql/users.repository.js';
import monitoriasRepository from '../repositories/mysql/monitorias.repository.js';
import engagementRepository from '../repositories/mysql/engagement.repository.js';
import { deleteFile } from '../utils/upload.helper.js';
import bcrypt from 'bcryptjs';

class UsersService {
  static VALID_ROLES = new Set(['dev', 'admin', 'student', 'monitor_academico', 'monitor_administrativo']);

  normalizeRole(role) {
    const map = {
      student: 'student',
      estudiante: 'student',
      monitor: 'monitor_academico',
      MONITOR: 'monitor_academico',
      administrativo: 'monitor_administrativo',
      ADMINISTRATIVO: 'monitor_administrativo',
      MONITOR_ACADEMICO: 'monitor_academico',
      MONITOR_ADMINISTRATIVO: 'monitor_administrativo',
      STUDENT: 'student'
    };
    const normalized = map[role] || role;
    return String(normalized || '').toLowerCase();
  }

  isAdminRole(role) {
    return ['admin', 'dev'].includes(role);
  }

  isAdministrativeSelection(role) {
    return ['administrativo', 'monitor', 'monitor_academico', 'monitor_administrativo'].includes(String(role || '').toLowerCase());
  }

  async assertUniqueUser({ email, username }, excludeUserId = null) {
    const conflict = await usersRepository.existsByEmailOrUsername(email, username, excludeUserId);
    if (!conflict) return;
    throw new Error('El usuario o correo ya existe');
  }

  async login(identifier, role, password) {
    if (!identifier || !password) throw new Error('Credenciales incorrectas');
    const user = await usersRepository.findByEmailOrUsername(identifier);
    if (!user) throw new Error('Credenciales incorrectas');
    
    // Support both plain text (legacy) and hashed passwords
    const isMatch = user.password.startsWith('$2') 
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!isMatch) {
      throw new Error('Credenciales incorrectas');
    }
    const incoming = this.normalizeRole(role);
    const stored = this.normalizeRole(user?.role);
    if (this.isAdministrativeSelection(incoming)) {
      if (!['monitor_academico', 'monitor_administrativo'].includes(stored)) {
        throw new Error('Credenciales incorrectas');
      }
    } else if (incoming && incoming !== stored) {
      throw new Error('Credenciales incorrectas');
    }
    if (user.is_active === 0 || user.is_active === false) {
      throw new Error('Tu cuenta ha sido dada de baja. No tienes acceso al sistema.');
    }
    return { ...user, baseRole: user.role };
  }

  async signup(userData) {
    await this.assertUniqueUser({ email: userData.email, username: userData.username });
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await usersRepository.create({
      ...userData,
      password: hashedPassword,
      role: 'student'
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

  async getAllUsers(role = null) {
    return await usersRepository.getAll(role);
  }

  async getUserById(id) {
    return await usersRepository.findById(id);
  }

  async createUser(userData, creatorId) {
    const creator = await usersRepository.findById(creatorId);
    if (!creator) throw new Error('Usuario creador no encontrado.');

    // Only principal Admin can create other Admins
    const requestedRole = this.normalizeRole(userData.role);
    if (!UsersService.VALID_ROLES.has(requestedRole)) {
      throw new Error(`Rol invalido. Roles permitidos: ${[...UsersService.VALID_ROLES].join(', ')}`);
    }
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
    await this.assertUniqueUser({ email: userData.email, username: userData.username });
    const hashedPassword = await bcrypt.hash(userData.password || '123', 10);
    const created = await usersRepository.create({ ...userData, password: hashedPassword, role: requestedRole });
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

    // If target is dev, only principal dev can modify. 
    // AND security rule: No dev can edit another dev.
    const targetRole = this.normalizeRole(target.role);
    const updaterRole = this.normalizeRole(updater.role);
    
    // Allow self-editing for basic fields, but block sensitive fields
    const isSelfEditing = String(updaterId) === String(id);
    const sensitiveFields = ['role', 'is_active', 'is_principal', 'restrictions'];
    
    if (isSelfEditing) {
      const attemptingSensitiveChange = sensitiveFields.some(field => userData[field] !== undefined && userData[field] !== target[field]);
      if (attemptingSensitiveChange) {
        throw new Error("No puedes auto-asignarte privilegios o cambiar tu estado de cuenta.");
      }
    } else {
      // Logic for editing OTHER users
      if (targetRole === 'dev' && updaterRole === 'dev') {
        throw new Error("No puedes editar otro desarrollador");
      }
      if (targetRole === 'admin' && !updater.is_principal) {
        throw new Error('Solo el Administrador Principal puede modificar otros administradores.');
      }
    }

    const monitorRoles = new Set(['monitor_academico', 'monitor_administrativo']);
    const previousRole = this.normalizeRole(target.role);
    let nextRole = previousRole;

    // Role change guards
    if (userData.role && this.normalizeRole(userData.role) !== targetRole) {
      nextRole = this.normalizeRole(userData.role);
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
    if (['monitor_academico', 'monitor_administrativo'].includes(this.normalizeRole(target.role))) {
      if ((userData.nombre && userData.nombre !== target.nombre) || (userData.email && userData.email !== target.email)) {
        await monitoriasRepository.updateMonitorInfo(id, {
          nombre: userData.nombre || target.nombre,
          email: userData.email || target.email
        });
      }
    }

    // Name & Email Sync: If student info changes, update registrations table
    if (['student', 'monitor_academico', 'monitor_administrativo'].includes(this.normalizeRole(target.role))) {
      if ((userData.nombre && userData.nombre !== target.nombre) || (userData.email && userData.email !== target.email)) {
        await monitoriasRepository.updateStudentInfo(target.email, {
          nombre: userData.nombre || target.nombre,
          email: userData.email || target.email
        });
      }
    }

    const nextEmail = userData.email || target.email;
    const nextUsername = userData.username || target.username;
    await this.assertUniqueUser({ email: nextEmail, username: nextUsername }, id);

    if (userData.password && !userData.password.startsWith('$2')) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const updated = await usersRepository.update(id, userData);

    if (previousRole !== nextRole && monitorRoles.has(previousRole) && !monitorRoles.has(nextRole)) {
      // El usuario conserva historial, pero pierde sus modulos activos de monitor.
      await monitoriasRepository.unassignModulesByMonitorUserId(id);
    }

    return updated;
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

  async getMeStats(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new Error('Usuario no encontrado.');

    const [academic, meals] = await Promise.all([
      usersRepository.getPersonalAcademicStats(user.id, user.nombre),
      usersRepository.getPersonalMealStats(user.id)
    ]);

    const role = this.normalizeRole(user.role);
    let monitorActivity = null;
    if (role === 'monitor_academico') {
      monitorActivity = await usersRepository.getMonitorAcademicActivity(user.id);
    } else if (role === 'monitor_administrativo') {
      monitorActivity = await usersRepository.getMonitorAdministrativeActivity(user.id);
    }

    return {
      academic,
      meals,
      monitor_activity: monitorActivity
    };
  }

  async getUserStatsById(requesterId, targetId) {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new Error('Usuario solicitante no encontrado.');
    if (!this.isAdminRole(this.normalizeRole(requester.role))) {
      throw new Error('No autorizado para consultar estadisticas de otro usuario.');
    }
    return this.getMeStats(targetId);
  }
}

export default new UsersService();
