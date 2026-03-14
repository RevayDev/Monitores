import React, { useState, useEffect } from 'react';
import { 
  getAllUsers, 
  getAllRegistrations, 
  getAllAttendance, 
  createMonitor, 
  updateMonitor, 
  deleteMonitor, 
  updateUser, 
  deleteUser,
  getMonitorias
} from '../services/api';
import Modal from '../components/Modal';
import { 
  Users, 
  UserPlus, 
  FileText, 
  Activity, 
  ShieldCheck, 
  Mail, 
  BookOpen, 
  Trash2, 
  MapPin, 
  Clock, 
  PlusCircle, 
  Edit3, 
  Lock, 
  Search,
  AlertTriangle,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('monitors');
  const [monitors, setMonitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [monitorModules, setMonitorModules] = useState([]);
  const [stats, setStats] = useState({ totalRegs: 0, totalAttendance: 0 });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewMonitorOpen, setIsNewMonitorOpen] = useState(false);
  const [isEditMonitorOpen, setIsEditMonitorOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    modulo: '',
    sede: 'Sede Centro',
    horario: '',
    descripcion: '',
    cuatrimestre: '1° Cuatrimestre',
    modalidad: 'Presencial'
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [users, regs, att, modules] = await Promise.all([
      getAllUsers(),
      getAllRegistrations(),
      getAllAttendance(),
      getMonitorias()
    ]);
    setMonitors(users.filter(u => u.role === 'monitor'));
    setStudents(users.filter(u => u.role === 'student'));
    setMonitorModules(modules);
    setStats({
      totalRegs: regs.length,
      totalAttendance: att.length
    });
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const role = formData.role || 'monitor';
    if (role === 'monitor') {
      await createMonitor(formData);
    } else {
      await updateUser(Date.now(), { ...formData, role: 'admin' });
    }
    setIsNewMonitorOpen(false);
    resetForm();
    fetchData();
    alert('¡Registro creado exitosamente!');
  };


  const handleEditMonitor = (monitor) => {
    const mod = monitorModules.find(m => m.monitorId === monitor.id);
    setSelectedUser(monitor);
    setFormData({
      nombre: monitor.nombre,
      email: monitor.email,
      modulo: mod?.modulo || '',
      sede: mod?.sede || 'Sede Centro',
      horario: mod?.horario || '',
      descripcion: mod?.descripcion || '',
      cuatrimestre: mod?.cuatrimestre || '1° Cuatrimestre',
      modalidad: mod?.modalidad || 'Presencial'
    });
    setIsEditMonitorOpen(true);
  };

  const confirmUpdateMonitor = async (e) => {
    e.preventDefault();
    await updateMonitor(selectedUser.id, formData);
    setIsEditMonitorOpen(false);
    resetForm();
    fetchData();
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({ nombre: user.nombre, email: user.email });
    setPasswordData({ password: '', confirmPassword: '' });
    setIsEditUserOpen(true);
  };

  const confirmUpdateUser = async (e) => {
    e.preventDefault();
    if (passwordData.password && passwordData.password !== passwordData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    const updatePayload = { ...formData };
    if (passwordData.password) updatePayload.password = passwordData.password;
    
    await updateUser(selectedUser.id, updatePayload);
    setIsEditUserOpen(false);
    resetForm();
    fetchData();
  };

  const openDeleteConfirm = (user, type) => {
    setDeleteTarget({ user, type });
    setIsConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (deleteTarget.type === 'monitor') {
      await deleteMonitor(deleteTarget.user.id);
    } else {
      await deleteUser(deleteTarget.user.id);
    }
    setIsConfirmDeleteOpen(false);
    setDeleteTarget(null);
    fetchData();
  };

  const resetForm = () => {
    setFormData({ nombre: '', email: '', modulo: '', sede: 'Sede Centro', horario: '', descripcion: '', cuatrimestre: '1° Cuatrimestre', modalidad: 'Presencial', role: 'monitor' });
    setSelectedUser(null);
  };


  return (
    <div className="min-h-screen bg-brand-gray p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Administración</h1>
            <p className="text-brand-blue font-bold tracking-tight uppercase text-[10px] flex items-center gap-1.5 bg-brand-blue/5 px-3 py-1 rounded-full w-fit">
              <ShieldCheck size={14} /> Sistema Central Institucional
            </p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsNewMonitorOpen(true); }}
            className="flex items-center gap-2 bg-brand-blue text-white px-8 py-4 rounded-3xl font-black shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all text-lg"
          >
            <PlusCircle size={24} /> Registrar Monitor
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={<Users />} title="Monitores" value={monitors.length} color="blue" />
          <StatCard icon={<GraduationCap />} title="Estudiantes" value={students.length} color="purple" />
          <StatCard icon={<FileText />} title="Inscritos" value={stats.totalRegs} color="green" />
          <StatCard icon={<Activity />} title="Certificados" value={stats.totalAttendance} color="yellow" />
        </div>

        {/* Management Tabs */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-50 bg-gray-50/30 p-2">
            <button 
              onClick={() => setActiveTab('monitors')}
              className={`flex-1 py-4 px-6 rounded-3xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'monitors' ? 'bg-white text-brand-blue shadow-sm ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Users size={18} /> Gestionar Monitores
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex-1 py-4 px-6 rounded-3xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'students' ? 'bg-white text-brand-blue shadow-sm ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <GraduationCap size={18} /> Gestionar Estudiantes
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-black text-gray-400">
                  <th className="px-8 py-6">Información</th>
                  {activeTab === 'monitors' && <th className="px-8 py-6">Módulo / Curso</th>}
                  <th className="px-8 py-6">Estado / Sede</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeTab === 'monitors' ? monitors : students).map(user => {
                  const mod = monitorModules.find(m => m.monitorId === user.id);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                            user.role === 'monitor' ? 'bg-brand-blue text-white shadow-lg' : 'bg-purple-100 text-purple-600'
                          }`}>
                            {user.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors">{user.nombre}</p>
                            <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {activeTab === 'monitors' && (
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-gray-800">{mod?.modulo || 'No asignado'}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{mod?.cuatrimestre}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="w-fit px-3 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest uppercase">
                            {mod?.sede || 'Sin Sede'}
                          </span>
                          <span className="w-fit px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-lg tracking-widest uppercase">
                            {mod?.modalidad || 'Activo'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => user.role === 'monitor' ? handleEditMonitor(user) : handleEditUser(user)}
                            className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                            title="Editar Información"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => openDeleteConfirm(user, user.role)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar Registro"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Monitor CRUD (Create/Edit) */}
      <Modal 
        isOpen={isNewMonitorOpen || isEditMonitorOpen} 
        onClose={() => { setIsNewMonitorOpen(false); setIsEditMonitorOpen(false); resetForm(); }} 
        title={isEditMonitorOpen ? "Editar Monitor" : "Registrar Personal"}
      >
        <form onSubmit={isEditMonitorOpen ? confirmUpdateMonitor : handleCreate} className="space-y-6 py-4">
          <div className="space-y-1.5 ring-2 ring-brand-blue/5 p-4 rounded-3xl bg-brand-blue/5">
            <label className="text-[10px] font-black text-brand-blue uppercase tracking-widest ml-1">Tipo de Cuenta</label>
            <select className="w-full p-4 bg-white border-2 border-transparent rounded-2xl focus:border-brand-blue outline-none text-black font-bold transition-all text-sm cursor-pointer"
              value={formData.role || 'monitor'} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="monitor">🧑‍🏫 Monitor Académico</option>
              <option value="admin">🛡️ Administrador de Sistema</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <InputField label="Nombre Completo" icon={<Users />} value={formData.nombre} 
              onChange={e => setFormData({...formData, nombre: e.target.value})} />
            <InputField label="Email Institucional" icon={<Mail />} type="email" value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Módulo / Curso" icon={<BookOpen />} value={formData.modulo} 
              onChange={e => setFormData({...formData, modulo: e.target.value})} />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modalidad</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.modalidad} onChange={e => setFormData({...formData, modalidad: e.target.value})}>
                <option value="Presencial">Presencial</option>
                <option value="Virtual">Virtual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuatrimestre</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.cuatrimestre} onChange={e => setFormData({...formData, cuatrimestre: e.target.value})}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={`${n}° Cuatrimestre`}>{n}° Cuatrimestre</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sede</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.sede} onChange={e => setFormData({...formData, sede: e.target.value})}>
                <option value="Sede Centro">Sede Centro</option>
                <option value="Sede Norte">Sede Norte</option>
                <option value="Sede Sur">Sede Sur</option>
              </select>
            </div>
          </div>

          <InputField label="Horario Detallado" icon={<Clock />} placeholder="Ej. Lunes y Viernes 10:00 - 12:00" value={formData.horario} 
            onChange={e => setFormData({...formData, horario: e.target.value})} />

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Módulo</label>
            <textarea className="w-full h-24 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-medium transition-all resize-none text-sm"
              value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-3xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            {isEditMonitorOpen ? "Actualizar Monitor" : "Confirmar Registro"}
          </button>
        </form>
      </Modal>

      {/* Modal: Edit User/Student & Password */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Gestionar Usuario">
        <form onSubmit={confirmUpdateUser} className="space-y-6 py-4">
          <InputField label="Nombre completo" icon={<Users />} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
          <InputField label="Email institucional" icon={<Mail />} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value })} />
          
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Cambiar Contraseña (Opcional)
            </p>
            <InputField label="Nueva Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.password} onChange={e => setPasswordData({...passwordData, password: e.target.value})} />
            <InputField label="Confirmar Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} />
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-3xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            Guardar Cambios
          </button>
        </form>
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="¿Confirmar Eliminación?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-[40px] inline-block text-red-600 animate-pulse">
            <AlertTriangle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">Estás a punto de borrar a <br/><span className="text-red-600">{deleteTarget?.user.nombre}</span></p>
            <p className="text-gray-500 font-medium">Esta acción eliminará todos los registros asociados permanentemente.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={executeDelete} className="w-full py-4 bg-red-600 text-white font-black rounded-3xl shadow-lg hover:bg-red-700 active:scale-95 transition-all">
              Sí, eliminar definitivamente
            </button>
            <button onClick={() => setIsConfirmDeleteOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-3xl hover:bg-gray-50 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-md transition-all">
      <div className={`${colors[color]} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-0.5">{title}</p>
        <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, type = "text", placeholder = "", value, onChange }) => (
  <div className="space-y-2 text-left group">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-brand-blue transition-colors">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors pointer-events-none">
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <input 
        type={type}
        required={type !== "password"}
        className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-brand-blue/20 focus:ring-8 focus:ring-brand-blue/5 outline-none text-black font-bold transition-all text-sm placeholder-gray-300 shadow-inner"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);


export default AdminDashboard;
