const API_URL = 'http://localhost:3000/api';

// Persistence for the current user (session) still uses localStorage for convenience,
// but the data itself comes from the backend.
const CURRENT_USER_KEY = 'monitores_current_role';
const NOTIFICATIONS_KEY = 'monitores_notifications';

const pushNotification = (item) => {
  try {
    const current = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    const next = [{ id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), read: false, ...item }, ...current].slice(0, 80);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('notifications-updated'));
  } catch {
    // no-op
  }
};

// Helper for fetch
const request = async (endpoint, options = {}) => {
  const sessionUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionUser?.id ? { 'x-user-id': String(sessionUser.id) } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Request failed');
  }
  const data = await response.json();
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    pushNotification({
      title: `${method} ${endpoint}`,
      message: 'Operacion completada correctamente.'
    });
  }
  return data;
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

export const login = async (identifier, role, password) => {
  const user = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, role, password })
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
export const getMeUserStats = () => request('/users/me/stats');
export const getUserStatsById = (id) => request(`/users/${id}/stats`);

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

export const getMyModules = () => request('/my-modules');
export const getMyAttendance = () => request('/my-attendance');
export const getMyQrStatus = () => request('/my-qr-status');
export const getMyForumHistory = () => request('/my-forum-history');
export const getMyStats = () => request('/my-stats');
export const getNotifications = () => request('/notifications');
export const markNotificationsRead = () => request('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
export const deleteNotification = (id) => request(`/notifications/${id}`, { method: 'DELETE' });

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

export const getModuleAttendanceSheet = (moduleId) => request(`/modules/${moduleId}/attendance-sheet`);
export const saveModuleAttendanceSheet = (moduleId, rows) => request(`/modules/${moduleId}/attendance-sheet`, {
  method: 'POST',
  body: JSON.stringify({ rows })
});

export const submitComplaint = (data) => request('/complaints', {
  method: 'POST',
  body: JSON.stringify(data)
});

// --- QR ---
export const generateQr = (moduleId = null) => request('/qr/generate', {
  method: 'POST',
  body: JSON.stringify(moduleId ? { moduleId } : {})
});

export const getCurrentQr = () => request('/qr/current');

export const validateQr = ({ token, moduleId }) => request('/qr/validate', {
  method: 'POST',
  body: JSON.stringify({ token, moduleId })
});
export const scanQrLunch = ({ token }) => request('/qr/scan', {
  method: 'POST',
  body: JSON.stringify({ token })
});

// --- Forum ---
export const getModuleForum = (moduleId) => request(`/modules/${moduleId}/forum`);

export const createForumThread = (moduleId, payload) => request(`/modules/${moduleId}/forum/thread`, {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const createForumMessage = (threadId, payload) => request(`/threads/${threadId}/message`, {
  method: 'POST',
  body: JSON.stringify(payload)
});
export const saveForumThread = (threadId) => request(`/threads/${threadId}/save`, { method: 'POST', body: JSON.stringify({}) });
export const unsaveForumThread = (threadId) => request(`/threads/${threadId}/save`, { method: 'DELETE' });
export const deleteForumThread = (threadId) => request(`/threads/${threadId}`, { method: 'DELETE' });
export const deleteForumMessage = (messageId) => request(`/messages/${messageId}`, { method: 'DELETE' });
export const getForums = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/forums${query ? '?' + query : ''}`);
};
export const getForumsByModule = (moduleId) => request(`/forums/module/${moduleId}`);
export const getForumMembers = (moduleId) => request(`/forums/module/${moduleId}/members`);
export const createForum = (payload) => request('/forums', { method: 'POST', body: JSON.stringify(payload) });
export const getForumById = (id) => request(`/forums/${id}`);
export const createForumComment = (id, payload) => request(`/forums/${id}/comment`, { method: 'POST', body: JSON.stringify(payload) });
export const createForumReply = (id, payload) => request(`/forums/${id}/reply`, { method: 'POST', body: JSON.stringify(payload) });
export const updateForum = (id, payload) => request(`/forums/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const updateForumReply = (id, payload) => request(`/forums/reply/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const toggleForumSave = (id) => request(`/forums/${id}/save`, { method: 'POST', body: JSON.stringify({}) });
export const deleteForum = (id) => request(`/forums/${id}`, { method: 'DELETE' });
export const getMonitorAdminStats = () => request('/stats/monitor-admin');
export const getAdminStats = () => request('/stats/admin');
export const getGlobalStats = () => request('/stats/global');
export const getUserStats = (userId) => request(`/stats/user/${userId}`);

// --- Reports ---
export const createForumReport = (payload) => request('/forums/report', { method: 'POST', body: JSON.stringify(payload) });
export const getForumReports = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/forums/reports${query ? '?' + query : ''}`);
};
export const resolveForumReport = (id) => request(`/forums/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({}) });

// --- Administrative Module Management ---
export const adminGetModules = () => request('/admin/modules-management');
export const adminUpdateModule = (id, payload) => request(`/admin/modules-management/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload)
});
export const adminDeleteModule = (id) => request(`/admin/modules-management/${id}`, {
  method: 'DELETE'
});

// --- Forum Engagement & Presence ---
export const updateForumPresence = (forumId, isTyping) => request(`/forums/${forumId}/presence`, {
  method: 'PUT',
  body: JSON.stringify({ isTyping })
});
export const getForumPresence = (forumId) => request(`/forums/${forumId}/presence`);

// --- Analytics v2 (Academic / Dining / Admin) ---
export const getAcademicModules = () => request('/academic/modules');
export const getAcademicModuleStats = (moduleId) => request(`/academic/modules/${moduleId}/stats`);
export const getAcademicSessionHistory = (moduleId) => request(`/academic/modules/${moduleId}/sessions`);
export const getAcademicSessionDetail = (sessionId) => request(`/academic/sessions/${sessionId}`);
export const addAcademicAttendanceExcuse = (attendanceId, payload) => request(`/academic/attendance/${attendanceId}/excuse`, {
  method: 'PATCH',
  body: JSON.stringify(payload)
});
export const createAcademicSession = (moduleId, payload) => request(`/academic/modules/${moduleId}/sessions`, {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const getDiningStats = () => request('/dining/stats');
export const getDiningStudentHistory = (studentId) => request(`/dining/students/${studentId}/history`);

export const getAdminOverview = () => request('/admin/overview');
export const getAdminUserFullStats = (userId) => request(`/admin/users/${userId}/stats`);

export const uploadForumFile = async (file) => {
  const sessionUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_URL}/forum/upload`, {
    method: 'POST',
    headers: {
      ...(sessionUser?.id ? { 'x-user-id': String(sessionUser.id) } : {})
    },
    body: formData
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  return response.json();
};

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
