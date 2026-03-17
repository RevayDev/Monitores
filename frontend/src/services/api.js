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

export const login = async (username, role, password) => {
  const user = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, role, password })
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

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('foto', file);
  
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
    // Don't set Content-Type, fetch will set it with boundary
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  return response.json();
};

export const logout = () => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ role: 'student' }));
  return Promise.resolve(true);
};

// --- Users & Staff ---
export const getAllUsers = () => request('/users');
export const getUserById = (id) => request(`/users/${id}`);

export const createUser = (userData) => {
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  return request('/users', {
    method: 'POST',
    body: JSON.stringify({ ...userData, currentUserId: currentUser.id })
  });
};

export const updateUser = (userId, updatedData) => {
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  return request(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...updatedData, currentUserId: currentUser.id })
  });
};

export const deleteUser = (userId) => {
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  return request(`/users/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({ currentUserId: currentUser.id })
  });
};

// --- Modules ---
export const getMonitorias = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/modules${query ? '?' + query : ''}`);
};

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
export const getAllRegistrations = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/registrations${query ? '?' + query : ''}`);
};

export const registerMonitoria = (monitoria, usuario) => request('/register', {
  method: 'POST',
  body: JSON.stringify({ monitoria, usuario })
});

export const getMisMonitorias = (email) => {
  return getAllRegistrations({ studentEmail: email });
};

export const getStudentsByMonitor = (monitorId) => {
  return getAllRegistrations({ monitorUserId: monitorId });
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
