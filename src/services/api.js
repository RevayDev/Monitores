const DB_KEYS = {
  MODULES: 'monitores_modules',
  USERS: 'monitores_users',
  REGISTRATIONS: 'monitores_registrations',
  ATTENDANCE: 'monitores_attendance',
  CURRENT_USER: 'monitores_current_role',
  COMPLAINTS: 'monitores_complaints'
};

const initialModules = [
  { id: 1, monitorId: 101, monitor: "Juan Pérez", monitorEmail: "juan@u.edu", modulo: "Programación", cuatrimestre: "1° Cuatrimestre", modalidad: "Presencial", horario: "Lunes 14:00 - 16:00", salon: "B-102", sede: "Sede Centro", descripcion: "Fundamentos de algoritmos y lógica de programación en Python." },
  { id: 2, monitorId: 102, monitor: "Ana García", monitorEmail: "ana@u.edu", modulo: "Matemáticas", cuatrimestre: "2° Cuatrimestre", modalidad: "Virtual", horario: "Martes 10:00 - 12:00", salon: "Teams", sede: "Sede Norte", descripcion: "Cálculo diferencial e integral y sus aplicaciones." },
  { id: 3, monitorId: 103, monitor: "Carlos Ruiz", monitorEmail: "carlos@u.edu", modulo: "Bases de Datos", cuatrimestre: "3° Cuatrimestre", modalidad: "Presencial", horario: "Miércoles 16:00 - 18:00", salon: "C-205", sede: "Sede Sur", descripcion: "Diseño de modelos relacionales y lenguaje SQL." },
  { id: 4, monitorId: 101, monitor: "Juan Pérez", monitorEmail: "juan@u.edu", modulo: "Redes", cuatrimestre: "4° Cuatrimestre", modalidad: "Virtual", horario: "Jueves 18:00 - 20:00", salon: "Meet", sede: "Sede Centro", descripcion: "Configuración de redes locales y protocolos de comunicación." }
];

const initialUsers = [
  { id: 101, nombre: "Juan Pérez", email: "juan@u.edu", password: "123", role: "monitor" },
  { id: 102, nombre: "Ana García", email: "ana@u.edu", password: "123", role: "monitor" },
  { id: 103, nombre: "Carlos Ruiz", email: "carlos@u.edu", password: "123", role: "monitor" },
  { id: 999, nombre: "Admin Principal", email: "admin@u.edu", password: "123", role: "admin" }
];

const initDB = () => {
  if (!localStorage.getItem(DB_KEYS.MODULES)) localStorage.setItem(DB_KEYS.MODULES, JSON.stringify(initialModules));
  
  let users = localStorage.getItem(DB_KEYS.USERS);
  if (!users) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(initialUsers));
  } else {
    // Migration: Ensure all existing users have a password field
    const parsedUsers = JSON.parse(users);
    const updated = parsedUsers.map(u => ({ ...u, password: u.password || '123' }));
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(updated));
  }

  if (!localStorage.getItem(DB_KEYS.REGISTRATIONS)) localStorage.setItem(DB_KEYS.REGISTRATIONS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.ATTENDANCE)) localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.COMPLAINTS)) localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.CURRENT_USER)) localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({ role: 'student' }));
};


initDB();

const getCollection = (key) => JSON.parse(localStorage.getItem(key));
const saveCollection = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// --- Auth & Roles ---
export const getCurrentUser = () => Promise.resolve(getCollection(DB_KEYS.CURRENT_USER));
export const switchRole = (role, data = {}) => {
  const newUser = { 
    ...getCollection(DB_KEYS.CURRENT_USER),
    role, 
    ...data 
  };
  saveCollection(DB_KEYS.CURRENT_USER, newUser);
  return Promise.resolve(newUser);
};

// --- Users & Signup ---
export const signupStudent = (userData) => {
  const users = getCollection(DB_KEYS.USERS);
  const newUser = { 
    id: Date.now(), 
    ...userData, 
    role: 'student', 
    baseRole: 'student' 
  };
  users.push(newUser);
  saveCollection(DB_KEYS.USERS, users);
  saveCollection(DB_KEYS.CURRENT_USER, newUser);
  return Promise.resolve(newUser);
};

export const login = (email, role, password) => {
  const users = getCollection(DB_KEYS.USERS);
  const user = users.find(u => 
    u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
    u.role === role && 
    u.password === password
  );
  if (user) {
    const sessionUser = { ...user, baseRole: user.role };
    saveCollection(DB_KEYS.CURRENT_USER, sessionUser);
    return Promise.resolve(sessionUser);
  }
  return Promise.reject('Credenciales o rol incorrectos. Reintenta.');
};

export const logout = () => {
  saveCollection(DB_KEYS.CURRENT_USER, { role: 'student' }); // Reset to guest-like student role
  return Promise.resolve(true);
};


export const createMonitor = (monitorData) => {
  const users = getCollection(DB_KEYS.USERS);
  const modules = getCollection(DB_KEYS.MODULES);
  
  const monitorId = Date.now();
  const newMonitor = { 
    id: monitorId, 
    nombre: monitorData.nombre, 
    email: monitorData.email, 
    role: 'monitor' 
  };
  
  const newModule = {
    id: monitorId + 1,
    monitorId: monitorId,
    monitor: monitorData.nombre,
    monitorEmail: monitorData.email,
    modulo: monitorData.modulo,
    cuatrimestre: monitorData.cuatrimestre || "1° Cuatrimestre",
    modalidad: monitorData.modalidad || "Presencial",
    horario: monitorData.horario || "TBD",
    salon: monitorData.salon || "TBD",
    sede: monitorData.sede || "Sede Centro",
    descripcion: monitorData.descripcion || "Sin descripción."
  };

  users.push(newMonitor);
  modules.push(newModule);
  
  saveCollection(DB_KEYS.USERS, users);
  saveCollection(DB_KEYS.MODULES, modules);
  
  return Promise.resolve(true);
};

export const getAllUsers = () => Promise.resolve(getCollection(DB_KEYS.USERS));
export const getAllRegistrations = () => Promise.resolve(getCollection(DB_KEYS.REGISTRATIONS));
export const getAllAttendance = () => Promise.resolve(getCollection(DB_KEYS.ATTENDANCE));

// --- Modules ---
export const getMonitorias = () => Promise.resolve(getCollection(DB_KEYS.MODULES));
export const updateMonitoriaInfo = (id, data) => {
  const modules = getCollection(DB_KEYS.MODULES);
  const idx = modules.findIndex(m => m.id === id);
  if (idx !== -1) {
    modules[idx] = { ...modules[idx], ...data };
    saveCollection(DB_KEYS.MODULES, modules);
  }
  return Promise.resolve(true);
};

// --- Registrations ---
export const registerMonitoria = (monitoria, usuario) => {
  const regs = getCollection(DB_KEYS.REGISTRATIONS);
  
  // Check for duplicates
  const isDuplicate = regs.some(r => r.id === monitoria.id && r.studentEmail === usuario.email);
  if (isDuplicate) {
    return Promise.reject("Ya estás registrado en esta monitoría.");
  }

  // Prevent self-registration
  if (monitoria.monitorId === usuario.id) {
    return Promise.reject("No puedes registrarte en tu propia monitoría.");
  }

  const newReg = {
    id: monitoria.id, // Use module id as registration id for easier tracking, or keep Date.now() if many-to-one
    registrationId: Date.now(),
    ...monitoria,
    studentName: usuario?.nombre || "Estudiante Anónimo",
    studentEmail: usuario?.email || "anon@u.edu",
    registeredAt: new Date().toISOString()
  };
  regs.push(newReg);
  saveCollection(DB_KEYS.REGISTRATIONS, regs);
  return Promise.resolve(true);
};

export const getMisMonitorias = (email) => {
  const regs = getCollection(DB_KEYS.REGISTRATIONS);
  return Promise.resolve(regs.filter(r => r.studentEmail === email || !email));
};

export const getStudentsByMonitor = (monitorId) => {
  const regs = getCollection(DB_KEYS.REGISTRATIONS);
  return Promise.resolve(regs.filter(r => r.monitorId === monitorId));
};

export const deleteMonitoria = (id, reason, comment = "") => {
  const regs = getCollection(DB_KEYS.REGISTRATIONS);
  console.log(`Baja id ${id}. Motivo: ${reason}. Comentario: ${comment}`);
  const filtered = regs.filter(r => r.id !== id);
  saveCollection(DB_KEYS.REGISTRATIONS, filtered);
  return Promise.resolve(true);
};


// --- Attendance & Complaints ---
export const submitAttendance = (data) => {
  const attendance = getCollection(DB_KEYS.ATTENDANCE);
  attendance.push({ id: Date.now(), ...data });
  saveCollection(DB_KEYS.ATTENDANCE, attendance);
  return Promise.resolve(true);
};

export const submitComplaint = (data) => {
  const complaints = getCollection(DB_KEYS.COMPLAINTS) || [];
  complaints.push({ id: Date.now(), ...data, date: new Date().toISOString() });
  saveCollection(DB_KEYS.COMPLAINTS, complaints);
  return Promise.resolve(true);
};


// --- Advanced Admin Actions ---
export const updateMonitor = (monitorId, updatedData) => {
  const users = getCollection(DB_KEYS.USERS);
  const modules = getCollection(DB_KEYS.MODULES);
  
  // Update User Entry
  const uIdx = users.findIndex(u => u.id === monitorId);
  if (uIdx !== -1) {
    users[uIdx] = { ...users[uIdx], ...updatedData };
    saveCollection(DB_KEYS.USERS, users);
  }
  
  // Update Associated Module
  const mIdx = modules.findIndex(m => m.monitorId === monitorId);
  if (mIdx !== -1) {
    modules[mIdx] = { 
      ...modules[mIdx], 
      monitor: updatedData.nombre || modules[mIdx].monitor,
      modulo: updatedData.modulo || modules[mIdx].modulo,
      cuatrimestre: updatedData.cuatrimestre || modules[mIdx].cuatrimestre,
      modalidad: updatedData.modalidad || modules[mIdx].modalidad,
      sede: updatedData.sede || modules[mIdx].sede,
      horario: updatedData.horario || modules[mIdx].horario,
      descripcion: updatedData.descripcion || modules[mIdx].descripcion
    };
    saveCollection(DB_KEYS.MODULES, modules);
  }
  
  return Promise.resolve(true);
};

export const deleteMonitor = (monitorId) => {
  const users = getCollection(DB_KEYS.USERS);
  const modules = getCollection(DB_KEYS.MODULES);
  
  const filteredUsers = users.filter(u => u.id !== monitorId);
  const filteredModules = modules.filter(m => m.monitorId !== monitorId);
  
  saveCollection(DB_KEYS.USERS, filteredUsers);
  saveCollection(DB_KEYS.MODULES, filteredModules);
  
  return Promise.resolve(true);
};

export const updateUser = (userId, updatedData) => {
  const users = getCollection(DB_KEYS.USERS);
  const uIdx = users.findIndex(u => u.id === userId);
  if (uIdx !== -1) {
    users[uIdx] = { ...users[uIdx], ...updatedData };
    saveCollection(DB_KEYS.USERS, users);
  }
  return Promise.resolve(true);
};

export const deleteUser = (userId) => {
  const users = getCollection(DB_KEYS.USERS);
  const regs = getCollection(DB_KEYS.REGISTRATIONS);
  
  const targetUser = users.find(u => u.id === userId);
  const filteredUsers = users.filter(u => u.id !== userId);
  
  const filteredRegs = targetUser?.role === 'student' 
    ? regs.filter(r => r.studentEmail !== targetUser.email)
    : regs;

  saveCollection(DB_KEYS.USERS, filteredUsers);
  saveCollection(DB_KEYS.REGISTRATIONS, filteredRegs);
  
  return Promise.resolve(true);
};

