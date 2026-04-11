import usersRepository from '../repositories/mysql/users.repository.js';

export const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId || !userRole) {
    return res.status(401).json({ error: 'No autorizado. Faltan headers de autenticación.' });
  }

  req.user = {
    id: parseInt(userId, 10),
    role: userRole.toLowerCase()
  };

  next();
};

export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol no autorizado.' });
    }
    next();
  };
};

export const adminPrincipalMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere ser administrador principal.' });
  }

  try {
    const user = await usersRepository.findById(req.user.id);
    if (!user || user.is_principal !== 1 && user.is_principal !== true) {
      return res.status(403).json({ error: 'Acceso denegado. Solo el Admin Principal puede realizar esta acción.' });
    }
    
    // Extender el req.user con info completa por si se necesita
    req.user.is_principal = true;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error verificando permisos de administrador principal.' });
  }
};
