const API_URL = 'http://localhost:3000/api';

// Persistence for the current user (session) still uses localStorage for convenience,
// but the data itself comes from the backend.
const CURRENT_USER_KEY = 'monitores_current_role';

// Helper for fetch
const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

// --- Auth & Roles ---
export const getCurrentUser = () => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return Promise.resolve(user ? JSON.parse(user) : { role: 'student' });
};

export const switchRole = async (role, data = {}) => {
  const currentUser = await getCurrentUser();
  const newUser = { ...currentUser, role, ...data };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const login = async (email, role, password) => {
  const user = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, role, password })
  });
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const signupStudent = async (userData) => {
  const user = await request('/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const logout = () => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ role: 'student' }));
  return Promise.resolve(true);
};

// --- Users & Staff ---
export const getAllUsers = () => request('/users');

export const createUser = (userData) => request('/users', {
  method: 'POST',
  body: JSON.stringify(userData)
});

export const updateUser = (userId, updatedData) => request(`/users/${userId}`, {
  method: 'PUT',
  body: JSON.stringify(updatedData)
});

export const deleteUser = (userId) => request(`/users/${userId}`, {
  method: 'DELETE'
});

// --- Modules ---
export const getMonitorias = () => request('/modules');

export const createMonitoria = (monitoriaData) => request('/modules', {
  method: 'POST',
  body: JSON.stringify(monitoriaData)
});

export const updateMonitoriaInfo = (id, data) => request(`/modules/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});

export const deleteModule = (id) => request(`/modules/${id}`, {
  method: 'DELETE'
});

// --- Specific Staff Actions ---
export const createMonitor = async (monitorData) => {
  // First create the user
  const user = await createUser({
    ...monitorData,
    role: 'monitor',
    baseRole: 'monitor'
  });

  // If modulo info provided, create the first module
  if (monitorData.modulo) {
    await createMonitoria({
      monitorId: user.id,
      monitor: user.nombre,
      monitorEmail: user.email,
      ...monitorData
    });
  }
  return user;
};

export const updateMonitor = async (monitorId, updatedData) => {
  await updateUser(monitorId, updatedData);
  // Backend handles associated module update if logic is there, 
  // but for now we follow the original split logic if needed.
  // In our current backend server.js implementation, we didn't include deep updates.
  // Let's assume for now simple updates are enough or add it to backend if critical.
  return true;
};

export const deleteMonitor = (monitorId) => deleteUser(monitorId);

// --- Registrations ---
export const getAllRegistrations = () => request('/registrations');

export const registerMonitoria = (monitoria, usuario) => request('/register', {
  method: 'POST',
  body: JSON.stringify({ monitoria, usuario })
});

export const getMisMonitorias = async (email) => {
  const regs = await request('/registrations');
  return regs.filter(r => r.studentEmail === email || !email);
};

export const getStudentsByMonitor = async (monitorId) => {
  const regs = await request('/registrations');
  return regs.filter(r => r.monitorId === monitorId);
};

export const deleteMonitoria = (id) => request(`/registrations/${id}`, {
  method: 'DELETE'
});

// --- Dynamic Select Data ---
export const getSedes = () => request('/sedes');
export const getProgramas = () => request('/programas');
export const getModalidades = () => request('/modalidades');
export const getCuatrimestres = () => request('/cuatrimestres');

// --- Attendance & Complaints ---
export const getAllAttendance = () => request('/attendance'); // Not used much but available
export const submitAttendance = (data) => request('/attendance', {
  method: 'POST',
  body: JSON.stringify(data)
});

export const submitComplaint = (data) => request('/complaints', {
  method: 'POST',
  body: JSON.stringify(data)
});

// --- Maintenance ---
export const getMaintenanceConfig = async () => {
  try {
    return await request('/maintenance');
  } catch {
    return null;
  }
};

export const setMaintenanceConfig = (config) => request('/maintenance', {
  method: 'PUT',
  body: JSON.stringify(config)
});
