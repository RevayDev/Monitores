import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  getAllUsers,
  getAllRegistrations,
  getAllAttendance,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  updateUser,
  deleteUser,
  createUser,
  getMonitorias,
  getMaintenanceConfig,
  getSedes,
  getProgramas,
  getModalidades,
  getCuatrimestres
} from '../services/api';
import { ToastContext } from '../App';
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
  GraduationCap,
  MessageCircle,
  Video,
  UserCheck
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import StatCard from '../components/StatCard';
import { getRoleColors } from '../utils/roleHelpers';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('monitors');
  const { showToast } = React.useContext(ToastContext);
  const [monitors, setMonitors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [students, setStudents] = useState([]);
  const [devs, setDevs] = useState([]);
  const [monitorModules, setMonitorModules] = useState([]);
  const [dbSedes, setDbSedes] = useState([]);
  const [dbProgramas, setDbProgramas] = useState([]);
  const [dbModalidades, setDbModalidades] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);
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
    username: '',
    email: '',
    role: 'monitor',
    sede: '',
    cuatrimestre: '',
    foto: ''
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      try {
        const config = await getMaintenanceConfig();
        const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

        if (session?.role !== 'admin' && session?.baseRole !== 'admin') {
          showToast('No tienes permisos de Administrador', 'error');
          navigate('/');
          return;
        }

        if (config?.panelAdmin && session?.baseRole !== 'dev' && session?.role !== 'dev') {
          showToast('Esta función está en mantenimiento', 'error');
          navigate('/');
          return;
        }

        fetchData();
      } catch (error) {
        console.error("Error in AdminDashboard init:", error);
      }
    };

    checkAccessAndFetch();
    window.addEventListener('data-updated', fetchData);
    return () => {
      window.removeEventListener('data-updated', fetchData);
    };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [users, regs, att, modules, sedesList, progsList, modsList, cuatsList] = await Promise.all([
        getAllUsers(),
        getAllRegistrations(),
        getAllAttendance(),
        getMonitorias(),
        getSedes(),
        getProgramas(),
        getModalidades(),
        getCuatrimestres()
      ]);
      setMonitors(users.filter(u => u.role === 'monitor'));
      setAdmins(users.filter(u => u.role === 'admin'));
      setStudents(users.filter(u => u.role === 'student'));
      setDevs(users.filter(u => u.role === 'dev'));
      setMonitorModules(modules || []);
      setDbSedes(sedesList || []);
      setDbProgramas(progsList || []);
      setDbModalidades(modsList || []);
      setDbCuatrimestres(cuatsList || []);
      setStats({
        totalRegs: regs.length,
        totalAttendance: att.length
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    const currentUserId = session.id;
    const role = formData.role || 'monitor';

    try {
      if (role === 'monitor') {
        await createMonitor({ ...formData, currentUserId });
      } else {
        await createUser({ ...formData, role: role, currentUserId });
      }
      setIsNewMonitorOpen(false);
      resetForm();
      fetchData();
      showToast('Registro creado correctamente', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Error al crear', 'error');
    }
  };


  const handleEditMonitor = (monitor) => {
    setSelectedUser(monitor);
    setFormData({
      nombre: monitor.nombre,
      email: monitor.email,
      sede: monitor.sede || (dbSedes[0] || ''),
      cuatrimestre: monitor.cuatrimestre || (dbCuatrimestres[0] || ''),
      role: monitor.role,
      foto: monitor.foto || ''
    });
    setIsEditMonitorOpen(true);
  };

  const confirmUpdateMonitor = async (e) => {
    e.preventDefault();
    await updateMonitor(selectedUser.id, formData);
    // If the edited monitor is the current session user, sync the session
    const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    if (currentSession.id === selectedUser.id) {
      const updated = { ...currentSession, ...formData };
      localStorage.setItem('monitores_current_role', JSON.stringify(updated));
      window.dispatchEvent(new Event('profile-updated'));
    }
    setIsEditMonitorOpen(false);
    resetForm();
    fetchData();
    showToast('¡Monitor actualizado correctamente!', 'success');
    window.dispatchEvent(new Event('data-updated'));
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      sede: user.sede || (dbSedes[0] || ''),
      cuatrimestre: user.cuatrimestre || (dbCuatrimestres[0] || ''),
      role: user.role,
      foto: user.foto || ''
    });
    setPasswordData({ password: '', confirmPassword: '' });
    setIsEditUserOpen(true);
  };

  const confirmUpdateUser = async (e) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    const currentUserId = session.id;

    if (passwordData.password && passwordData.password !== passwordData.confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    const updatePayload = { ...formData, currentUserId };
    if (passwordData.password) updatePayload.password = passwordData.password;

    try {
      await updateUser(selectedUser.id, updatePayload);
      // If editing the current session user, sync the session too
      const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      if (currentSession.id === selectedUser.id) {
        const updated = { ...currentSession, ...updatePayload };
        localStorage.setItem('monitores_current_role', JSON.stringify(updated));
        window.dispatchEvent(new Event('profile-updated'));
      }
      setIsEditUserOpen(false);
      resetForm();
      fetchData();
      showToast('¡Usuario actualizado correctamente!', 'success');
      window.dispatchEvent(new Event('data-updated'));
    } catch (error) {
      showToast(error.response?.data?.error || 'Error al actualizar', 'error');
    }
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
    setFormData({
      nombre: '',
      username: '',
      email: '',
      role: 'monitor',
      sede: dbSedes[0] || '',
      cuatrimestre: dbCuatrimestres[0] || '',
      foto: ''
    });
    setPasswordData({ password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-amber-600 rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-700/40 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

          <div className="relative z-10 flex gap-5 items-center w-full">
            <div className="w-24 h-24 bg-amber-600/50 backdrop-blur-md rounded-2xl flex items-center justify-center ring-4 ring-white/20 shadow-2xl">
              <ShieldCheck size={48} className="text-amber-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 backdrop-blur-sm border border-white/10">
                <ShieldCheck size={10} className="text-amber-100" />
                <span className="text-amber-50">Sistema Central Institucional</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-none mb-1.5">
                Panel de Administración
              </h1>
              <p className="text-amber-100 text-sm font-medium leading-snug max-w-lg">
                Gestiona usuarios, monitorías, asistencias y reportes. Tienes el control total de la plataforma académica.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => { resetForm(); setIsNewMonitorOpen(true); }}
            className="relative z-10 flex items-center gap-2 bg-white text-amber-600 px-5 py-3 rounded-2xl font-black shadow-lg hover:bg-amber-50 active:scale-95 transition-all text-sm shrink-0 whitespace-nowrap border-2 border-white/50"
          >
            <PlusCircle size={18} /> <span>Registrar Monitor</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={<GraduationCap />} title="Estudiantes" value={students.length} role="student" />
          <StatCard icon={<Users />} title="Monitores" value={monitors.length} role="monitor" />
          <StatCard icon={<ShieldCheck />} title="Administradores" value={admins.length} role="admin" />
          <StatCard icon={<Activity />} title="Developers" value={devs.length} role="dev" />
        </div>
        {/* Management Tabs - Refined to Pill Style */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 p-2 overflow-x-auto">
            <div className="flex flex-wrap gap-2 p-1 bg-gray-50 rounded-2xl w-full sm:w-fit">
              <button
                onClick={() => setActiveTab('monitors')}
                className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'monitors'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Users size={16} /> <span className="hidden xs:inline">Monitores</span>
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'admins'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <ShieldCheck size={16} /> <span className="hidden xs:inline">Admins</span>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'students'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <GraduationCap size={16} /> <span className="hidden xs:inline">Estudiantes</span>
              </button>
              <button
                onClick={() => setActiveTab('devs')}
                className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'devs'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Activity size={16} /> <span className="hidden xs:inline">Devs</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-x-auto"
            >
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-50 bg-gray-50/50">
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Usuario</th>
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Username</th>
                    {activeTab === 'monitors' && <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Módulo / Curso</th>}
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Información Académica</th>
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(activeTab === 'monitors' ? monitors : activeTab === 'admins' ? admins : activeTab === 'devs' ? devs : students).map(user => {
                    const mod = monitorModules.find(m => m.monitorId === user.id);
                    const { lightBg, textColor } = getRoleColors(user.role);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                          <div className="flex items-center gap-4">
                            <UserAvatar user={user} size="md" rounded="rounded-xl" />
                            <div>
                              <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors">{user.nombre}</p>
                              <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider italic">
                            @{user.username}
                          </span>
                        </td>
                        {activeTab === 'monitors' && (
                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-gray-800">{mod?.modulo || 'No asignado'}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{mod?.cuatrimestre}</p>
                            </div>
                          </td>
                        )}
                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                          <div className="flex flex-col gap-1.5">
                            <span className="w-fit px-3 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest uppercase">
                              {mod?.sede || 'Sin Sede'}
                            </span>
                            <span className="w-fit px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-lg tracking-widest uppercase">
                              {mod?.modalidad || 'Activo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
                              const isDev = user.role === 'dev';
                              const canModifyDev = session.role === 'dev' && session.is_principal;
                              const isSelf = session.id === user.id;

                              if (isDev && !canModifyDev) {
                                return (
                                  <span className={`px-3 py-1 ${lightBg} ${textColor} text-[10px] font-black rounded-lg tracking-widest uppercase flex items-center gap-1.5 focus:outline-none`}>
                                    <Lock size={12} /> {isSelf ? 'Tu Perfil' : 'Protegido'}
                                  </span>
                                );
                              }

                              if (isSelf && !isDev) {
                                return (
                                  <span className={`px-3 py-1 ${lightBg} ${textColor} text-[10px] font-black rounded-lg tracking-widest uppercase flex items-center gap-1.5 focus:outline-none`}>
                                    <Lock size={12} /> Tu Perfil
                                  </span>
                                );
                              }

                              return (
                                <>
                                  <button
                                    onClick={() => user.role === 'monitor' ? handleEditMonitor(user) : handleEditUser(user)}
                                    className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                                    title="Editar Información"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  {!user.is_principal && (
                                    <button
                                      onClick={() => openDeleteConfirm(user, user.role)}
                                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Eliminar Registro"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal: Monitor CRUD (Create/Edit) */}
      <Modal
        isOpen={isNewMonitorOpen || isEditMonitorOpen}
        onClose={() => { setIsNewMonitorOpen(false); setIsEditMonitorOpen(false); resetForm(); }}
        title={isEditMonitorOpen ? "Editar Monitor" : "Registrar Personal"}
      >
        <form onSubmit={isEditMonitorOpen ? confirmUpdateMonitor : handleCreate} className="space-y-6 py-4">
          <div className="space-y-1.5 ring-2 ring-brand-blue/5 p-4 rounded-2xl bg-brand-blue/5">
            <label className="text-[10px] font-black text-brand-blue uppercase tracking-widest ml-1">Tipo de Cuenta</label>
            <select className="w-full p-4 bg-white border-2 border-transparent rounded-xl focus:border-brand-blue outline-none text-black font-bold transition-all text-sm cursor-pointer"
              value={formData.role || 'monitor'} onChange={e => setFormData({ ...formData, role: e.target.value })}>
              <option value="monitor">🧑‍🏫 Monitor Académico</option>
              {(JSON.parse(localStorage.getItem('monitores_current_role') || '{}').is_principal || formData.role === 'admin') && (
                <option value="admin">🛡️ Administrador de Sistema</option>
              )}
              {(JSON.parse(localStorage.getItem('monitores_current_role') || '{}').role === 'dev' && JSON.parse(localStorage.getItem('monitores_current_role') || '{}').is_principal) && (
                <option value="dev">💻 Developer</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Nombre Completo" icon={<Users />} value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Username" icon={<UserCheck />} value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Email Institucional" icon={<Mail />} type="email" value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })} />

          <div className="space-y-1.5">
            <InputField label="URL Foto de Perfil" icon={<Activity />} value={formData.foto || ''}
              onChange={e => setFormData({ ...formData, foto: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sede</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })}>
                {dbSedes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuatrimestre</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}>
                {dbCuatrimestres.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-2xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            {isEditMonitorOpen ? "Actualizar Registro" : "Confirmar Registro"}
          </button>
        </form>
      </Modal>

      {/* Modal: Edit User/Student & Password */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Gestionar Usuario">
        <form onSubmit={confirmUpdateUser} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Nombre completo" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Username" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Email institucional" icon={<Mail />} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sede</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })}>
                {dbSedes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuatrimestre</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm cursor-pointer"
                value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}>
                {dbCuatrimestres.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Cambiar Contraseña (Opcional)
            </p>
            <InputField label="Nueva Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} />
            <InputField label="Confirmar Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-3xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            Guardar Cambios
          </button>
        </form>
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="¿Confirmar Eliminación?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-2xl inline-block text-red-600 animate-pulse">
            <AlertTriangle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">Estás a punto de borrar a <br /><span className="text-red-600">{deleteTarget?.user.nombre}</span></p>
            <p className="text-gray-500 font-medium">Esta acción eliminará todos los registros asociados permanentemente.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={executeDelete} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
              Sí, eliminar definitivamente
            </button>
            <button onClick={() => setIsConfirmDeleteOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
