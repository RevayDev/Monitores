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
  getCuatrimestres,
  setMaintenanceConfig
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
  Search,
  AlertTriangle,
  ChevronRight,
  Video,
  UserCheck,
  Unlock,
  Settings,
  ToggleLeft,
  ToggleRight,
  Info,
  LogOut as LogOutIcon,
  Lock,
  GraduationCap,
  Check
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import StatCard from '../components/StatCard';
import { getRoleColors } from '../utils/roleHelpers';

const MaintToggle = ({ id, title, subtitle, icon: Icon, active, onToggle }) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
    <div className="flex items-center gap-5">
      <div className={`p-4 rounded-2xl ${active ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'} transition-colors`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="text-lg font-black text-gray-900 tracking-tight">{title}</h4>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{subtitle}</p>
      </div>
    </div>
    <button 
      onClick={() => onToggle(id)}
      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${active ? 'bg-red-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${active ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
  const [activeTab, setActiveTab] = useState('students');
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
  const [maintenance, setMaintenance] = useState({
    login: false,
    signup: false,
    monitorias: false,
    adminPanel: false,
    monitorPanel: false,
    global: false
  });
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
    foto: '',
    password: ''
  });

  const [statusTarget, setStatusTarget] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [localRestrictions, setLocalRestrictions] = useState({
    login: false,
    search: false,
    dashboards: false,
    registrations: false
  });

  useEffect(() => {
    if (statusTarget) {
      try {
        const parsed = typeof statusTarget.restrictions === 'string' 
          ? JSON.parse(statusTarget.restrictions) 
          : (statusTarget.restrictions || {});
        setLocalRestrictions({
          login: parsed.login || false,
          search: parsed.search || false,
          dashboards: parsed.dashboards || false,
          registrations: parsed.registrations || false
        });
      } catch (e) {
        setLocalRestrictions({ login: false, search: false, dashboards: false, management: false });
      }
    }
  }, [statusTarget]);

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      try {
        const config = await getMaintenanceConfig();
        const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

        if (session?.role !== 'admin' && session?.baseRole !== 'admin' && session?.role !== 'dev' && session?.baseRole !== 'dev') {
          showToast('No tienes permisos de Administrador', 'error');
          navigate('/');
          return;
        }

        setMaintenance(config || maintenance);

        const restrictions = typeof session?.restrictions === 'string' 
          ? JSON.parse(session.restrictions) 
          : (session?.restrictions || {});

        if (restrictions.dashboards && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
          showToast('Tu acceso a este panel ha sido restringido.', 'error');
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






  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre,
      username: user.username,
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

  const handleToggleMaintenance = async (key) => {
    const newMaint = { ...maintenance, [key]: !maintenance[key] };
    try {
      await setMaintenanceConfig(newMaint);
      setMaintenance(newMaint);
      showToast('Configuración actualizada', 'success');
      window.dispatchEvent(new Event('data-updated'));
    } catch (error) {
      showToast('Error al actualizar configuración', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      username: '',
      email: '',
      role: 'monitor',
      sede: dbSedes[0] || '',
      cuatrimestre: dbCuatrimestres[0] || '',
      foto: '',
      password: ''
    });
    setPasswordData({ password: '', confirmPassword: '' });
  };

  const exportActiveTabCsv = () => {
    const dataMap = {
      students,
      monitors,
      admins,
      devs
    };
    const rowsData = dataMap[activeTab] || [];
    const rows = [
      ['Nombre', 'Username', 'Email', 'Rol', 'Sede', 'Cuatrimestre'],
      ...rowsData.map((u) => [u.nombre, u.username, u.email, u.role, u.sede || '-', u.cuatrimestre || '-'])
    ];
    const csv = rows.map((line) => line.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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


        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={<GraduationCap />} title="Estudiantes" value={students.length} role="student" />
          <StatCard icon={<Users />} title="Monitores" value={monitors.length} role="monitor" />
          <StatCard icon={<ShieldCheck />} title="Administradores" value={admins.length} role="admin" />
          <StatCard icon={<Activity />} title="Developers" value={devs.length} role="dev" />
        </div>
        {/* Management Tabs - Refined to Pill Style */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border border-gray-200 shadow-sm">
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
                onClick={() => setActiveTab('devs')}
                className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'devs'
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Activity size={16} /> <span className="hidden xs:inline">Devs</span>
              </button>
              {(session.role === 'dev' || session.baseRole === 'dev') && (
                <button
                  onClick={() => setActiveTab('config')}
                  className={`flex-grow sm:flex-initial px-4 sm:px-8 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'config'
                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Settings size={16} /> <span className="hidden xs:inline">Configuración</span>
                </button>
              )}
            </div>


            {activeTab !== 'config' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportActiveTabCsv}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all active:scale-95"
                >
                  <FileText size={16} />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, role: activeTab === 'monitors' ? 'monitor' : activeTab === 'admins' ? 'admin' : activeTab === 'devs' ? 'dev' : 'student' }));
                    setIsNewMonitorOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-dark-blue transition-all active:scale-95"
                >
                  <PlusCircle size={16} />
                  <span>Registrar Miembro</span>
                </button>
              </div>
            )}
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
              {(activeTab === 'config' && (session.role === 'dev' || session.baseRole === 'dev')) ? (
                <div className="p-4 sm:p-8 space-y-8 animate-fade-in">
                  <div className="flex items-center gap-3 bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10">
                    <Info className="text-brand-blue shrink-0" size={20} />
                    <p className="text-[11px] font-bold text-brand-blue tracking-tight leading-relaxed">
                      El modo mantenimiento restringe el acceso a funciones específicas para todos los usuarios, excepto para Desarrolladores y Administradores Principales.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MaintToggle 
                      id="login" 
                      title="Inicio de Sesión" 
                      subtitle="BLOQUEAR ACCESO A CUENTAS" 
                      icon={LogOutIcon} 
                      active={maintenance.login} 
                      onToggle={handleToggleMaintenance}
                    />
                    <MaintToggle 
                      id="signup" 
                      title="Registro Estudiantil" 
                      subtitle="SUSPENDER CREACIÓN DE CUENTAS" 
                      icon={UserPlus} 
                      active={maintenance.signup} 
                      onToggle={handleToggleMaintenance}
                    />
                    <MaintToggle 
                      id="monitorias" 
                      title="Sistema de Monitorías" 
                      subtitle="BÚSQUEDA E INSCRIPCIÓN A CLASES" 
                      icon={BookOpen} 
                      active={maintenance.monitorias} 
                      onToggle={handleToggleMaintenance}
                    />
                    <MaintToggle 
                      id="adminPanel" 
                      title="Panel de Administración" 
                      subtitle="ACCESO A GESTIONAR REPORTES Y USUARIOS" 
                      icon={ShieldCheck} 
                      active={maintenance.adminPanel} 
                      onToggle={handleToggleMaintenance}
                    />
                    <MaintToggle 
                      id="monitorPanel" 
                      title="Panel de Monitores" 
                      subtitle="GESTIÓN DE CLASES Y ASISTENCIAS" 
                      icon={Users} 
                      active={maintenance.monitorPanel} 
                      onToggle={handleToggleMaintenance}
                    />
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-50 bg-gray-50/50">
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Usuario</th>
                    <th className="px-4 sm:px-8 py-4 sm:py-6 text-left">Username</th>
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
                              <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors truncate max-w-[150px]">{user.nombre}</p>
                              <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider italic">
                            @{user.username}
                          </span>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-6">
                          <div className="flex flex-col gap-1.5">
                            {(() => {
                              const restr = typeof user.restrictions === 'string' ? JSON.parse(user.restrictions) : (user.restrictions || {});
                              const isBlocked = user.is_active === 0 || user.is_active === false || restr.login;
                              const isRestricted = !isBlocked && (restr.search || restr.dashboards || restr.registrations);

                              if (isBlocked) {
                                return (
                                  <span className="w-fit px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-lg tracking-widest uppercase flex items-center gap-1.5">
                                    <Lock size={10} /> BLOQUEADO
                                  </span>
                                );
                              }
                              if (isRestricted) {
                                return (
                                  <span className="w-fit px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg tracking-widest uppercase flex items-center gap-1.5 border border-amber-100/50 shadow-sm">
                                    <AlertTriangle size={10} /> RESTRINGIDO
                                  </span>
                                );
                              }
                              return (
                                <span className="w-fit px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-lg tracking-widest uppercase flex items-center gap-1.5">
                                  <Check size={10} /> ACTIVO
                                </span>
                              );
                            })()}
                            <span className="w-fit px-3 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest uppercase truncate max-w-[150px]">
                              {mod?.sede || user.sede || 'Sin Sede'}
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
                                    onClick={() => handleEditUser(user)}
                                    className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                                    title="Editar Información"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setStatusTarget(user);
                                      setIsStatusModalOpen(true);
                                    }}
                                    className={`p-2.5 rounded-xl transition-all ${(() => {
                                      const restr = typeof user.restrictions === 'string' ? JSON.parse(user.restrictions) : (user.restrictions || {});
                                      const isBlocked = user.is_active === 0 || user.is_active === false || restr.login;
                                      const isRestricted = !isBlocked && (restr.search || restr.dashboards || restr.management);
                                      
                                      if (isBlocked) return 'text-red-500 hover:bg-red-50 hover:text-red-600';
                                      if (isRestricted) return 'text-amber-500 hover:bg-amber-50 hover:text-amber-600';
                                      return 'text-green-500 hover:bg-green-50 hover:text-green-600';
                                    })()}`}
                                    title={user.is_active === 0 || user.is_active === false ? "Reactivar Usuario" : "Gestionar Estado"}
                                  >
                                    {(() => {
                                      const restr = typeof user.restrictions === 'string' ? JSON.parse(user.restrictions) : (user.restrictions || {});
                                      const isBlocked = user.is_active === 0 || user.is_active === false || restr.login;
                                      const isRestricted = !isBlocked && (restr.search || restr.dashboards || restr.management);

                                      if (isBlocked) return <Lock size={18} />;
                                      if (isRestricted) return <Lock size={18} />;
                                      return <Unlock size={18} />;
                                    })()}
                                  </button>

                                  {user.id !== session.id && !(user.is_principal && user.role === 'admin') && user.role !== 'dev' && (
                                    <button
                                      onClick={() => openDeleteConfirm(user, user.role)}
                                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Eliminar Registro Permanentemente"
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
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal: Monitor CRUD (Create/Edit) */}
      <Modal
        isOpen={isNewMonitorOpen}
        onClose={() => { setIsNewMonitorOpen(false); resetForm(); }}
        title="Registrar Personal"
      >
        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <InputField
            type="select"
            label="Tipo de Cuenta (Rol)"
            value={formData.role || 'monitor'}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'monitor', label: '🧑‍🏫 Monitor Académico' },
              ...( (JSON.parse(localStorage.getItem('monitores_current_role') || '{}').is_principal || formData.role === 'admin') 
                   ? [{ value: 'admin', label: '🛡️ Administrador de Sistema' }] : [] ),
              ...( (JSON.parse(localStorage.getItem('monitores_current_role') || '{}').role === 'dev') 
                   ? [{ value: 'dev', label: '💻 Developer' }] : [] )
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nombre Completo" icon={<Users />} value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Username" icon={<UserCheck />} value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Email Institucional" icon={<Mail />} type="email" value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })} />



          <div className="space-y-3 pt-1">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Contraseña de Acceso
            </p>
            <InputField label="Contraseña" icon={<Lock />} type="password" value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.role !== 'dev' && (
              <>
                <InputField
                  type="select"
                  label="Sede"
                  value={formData.sede}
                  onChange={e => setFormData({ ...formData, sede: e.target.value })}
                  options={dbSedes}
                />
                <InputField
                  type="select"
                  label="Cuatrimestre"
                  value={formData.cuatrimestre}
                  onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}
                  options={dbCuatrimestres}
                />
              </>
            )}
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-2xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            Confirmar Registro
          </button>
        </form>
      </Modal>

      {/* Modal: Edit User/Student & Password */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Gestionar Usuario">
        <form onSubmit={confirmUpdateUser} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nombre completo" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Username" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>

          <InputField
            type="select"
            label="Tipo de Cuenta (Rol)"
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'student', label: '🎓 Estudiante' },
              { value: 'monitor', label: '🧑‍🏫 Monitor Académico' },
              { value: 'admin', label: '🛡️ Administrador' },
              ...( (JSON.parse(localStorage.getItem('monitores_current_role') || '{}').role === 'dev') 
                   ? [{ value: 'dev', label: '💻 Developer' }] : [] )
            ]}
          />

          <InputField label="Email institucional" icon={<Mail />} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.role !== 'dev' && (
              <>
                <InputField
                  type="select"
                  label="Sede"
                  value={formData.sede}
                  onChange={e => setFormData({ ...formData, sede: e.target.value })}
                  options={dbSedes}
                />
                <InputField
                  type="select"
                  label="Cuatrimestre"
                  value={formData.cuatrimestre}
                  onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}
                  options={dbCuatrimestres}
                />
              </>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Cambiar Contraseña (Opcional)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nueva Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} />
              <InputField label="Confirmar Contraseña" icon={<Lock />} type="password" placeholder="••••••••" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-3xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all">
            Guardar Cambios
          </button>
        </form>
      </Modal>

      {/* Modal: Account Status Management (Dar de baja) */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Estado de Cuenta">
        <div className="space-y-8 text-center py-6">
          <div className={`p-8 rounded-3xl inline-block shadow-2xl ${statusTarget?.is_active === 0 || statusTarget?.is_active === false ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} animate-pulse`}>
            {statusTarget?.is_active === 0 || statusTarget?.is_active === false ? <Lock size={72} /> : <Unlock size={72} />}
          </div>

          <div className="space-y-4 px-6">
            <h3 className="text-3xl font-black text-gray-900 leading-tight">
              {statusTarget?.nombre}
            </h3>
            <p className="text-gray-500 font-bold leading-relaxed px-4">
              Gestiona el nivel de acceso y las restricciones activas para esta cuenta.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${localRestrictions.login ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>
                      <LogOutIcon size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">Acceso Total</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Login</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLocalRestrictions(prev => ({ ...prev, login: !prev.login }))}
                    className={`relative w-10 h-6 rounded-full transition-all ${localRestrictions.login ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRestrictions.login ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${localRestrictions.search ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>
                      <Search size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">Búsqueda</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Consultas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLocalRestrictions(prev => ({ ...prev, search: !prev.search }))}
                    className={`relative w-10 h-6 rounded-full transition-all ${localRestrictions.search ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRestrictions.search ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${localRestrictions.dashboards ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>
                      <Activity size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">Paneles</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Dashboards</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLocalRestrictions(prev => ({ ...prev, dashboards: !prev.dashboards }))}
                    className={`relative w-10 h-6 rounded-full transition-all ${localRestrictions.dashboards ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRestrictions.dashboards ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${localRestrictions.registrations ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'}`}>
                      <BookOpen size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">Mis Monitorías</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Recursos</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLocalRestrictions(prev => ({ ...prev, registrations: !prev.registrations }))}
                    className={`relative w-10 h-6 rounded-full transition-all ${localRestrictions.registrations ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRestrictions.registrations ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            
          </div>

          <div className="flex flex-col gap-4 px-4">
            <button
              onClick={async () => {
                const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
                // If login restriction is OFF, we consider it is_active: true
                const isGloballyActive = !localRestrictions.login;
                
                try {
                  const payload = { 
                    is_active: isGloballyActive ? 1 : 0, 
                    currentUserId: session.id,
                    restrictions: JSON.stringify(localRestrictions) 
                  };
                  await updateUser(statusTarget.id, payload);
                  fetchData();
                  showToast('Cambios de estado guardados', 'success');
                  setIsStatusModalOpen(false);
                } catch (error) {
                  showToast('Error al actualizar el estado del usuario', 'error');
                }
              }}
              className="w-full py-5 bg-brand-blue text-white font-black rounded-3xl shadow-xl hover:bg-brand-dark-blue transition-all active:scale-95 text-sm uppercase tracking-widest"
            >
              Guardar Configuración
            </button>
            <button onClick={() => setIsStatusModalOpen(false)} className="w-full py-5 bg-white text-gray-400 font-black border-2 border-gray-100 rounded-3xl hover:bg-gray-50 transition-all text-xs uppercase tracking-widest">
              Cancelar Operación
            </button>
          </div>
        </div>
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
