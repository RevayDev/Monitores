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
  setMaintenanceConfig,
  getGlobalStats,
  getUserStats,
  getUserStatsById,
  adminGetModules,
  adminUpdateModule,
  adminDeleteModule,
  getForumReports,
  resolveForumReport
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
  Check,
  BarChart3,
  PieChart,
  UtensilsCrossed
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

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const StatMetricCard = ({ icon: Icon, label, value, color = 'text-brand-blue' }) => (
  <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1 flex items-center gap-1.5">
      <Icon size={12} /> {label}
    </p>
    <p className={`text-lg font-bold ${color} break-all`}>{value}</p>
  </div>
);

const HorizontalBars = ({ rows = [], max = 1, color = 'bg-brand-blue' }) => (
  <div className="space-y-2">
    {rows.map((row) => (
      <div key={row.label}>
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.round((num(row.value) / Math.max(1, max)) * 100))}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const Donut = ({ percent = 0, size = 120, color = '#2563EB', track = '#E5E7EB', centerLabel = '0%' }) => {
  const safe = Math.max(0, Math.min(100, num(percent)));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(${color} ${safe}%, ${track} ${safe}% 100%)`
        }}
      />
      <div className="absolute inset-[14%] rounded-full bg-white border border-gray-100 flex items-center justify-center">
        <span className="text-xs font-black text-gray-700">{centerLabel}</span>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
  const [activeTab, setActiveTab] = useState('students');
  const { showToast } = React.useContext(ToastContext);

  // Users data
  const [monitors, setMonitors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [students, setStudents] = useState([]);
  const [devs, setDevs] = useState([]);

  // Modules data
  const [allAdminModules, setAllAdminModules] = useState([]);
  const [monitorModules, setMonitorModules] = useState([]);

  // Selection/Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [userStatsModal, setUserStatsModal] = useState(null);

  // Toggles
  const [isNewMonitorOpen, setIsNewMonitorOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);

  // UI State
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [selectedStatsUserId, setSelectedStatsUserId] = useState('');
  const [userStatsTab, setUserStatsTab] = useState('personal');
  const [searchTerm, setSearchTerm] = useState('');

  // Config data
  const [dbSedes, setDbSedes] = useState([]);
  const [dbProgramas, setDbProgramas] = useState([]);
  const [dbModalidades, setDbModalidades] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);
  const [maintenance, setMaintenance] = useState({
    login: false, signup: false, monitorias: false, adminPanel: false, monitorPanel: false, global: false
  });
  const [localRestrictions, setLocalRestrictions] = useState({
    login: false, search: false, dashboards: false, registrations: false
  });

  // Forms
  const [formData, setFormData] = useState({
    nombre: '', username: '', email: '', role: 'monitor', sede: '', cuatrimestre: '', foto: '', password: ''
  });
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [moduleFormData, setModuleFormData] = useState({
    modulo: '', monitor: '', monitorId: '', sede: '', cuatrimestre: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [users, modules, sedesList, progsList, modsList, cuatsList, adminModules] = await Promise.all([
        getAllUsers(),
        getMonitorias(),
        getSedes(),
        getProgramas(),
        getModalidades(),
        getCuatrimestres(),
        adminGetModules()
      ]);

      setMonitors(users.filter(u => ['monitor', 'monitor_academico', 'monitor_administrativo'].includes(String(u.role || ''))));
      setAdmins(users.filter(u => u.role === 'admin'));
      setStudents(users.filter(u => ['student', 'estudiante'].includes(String(u.role || ''))));
      setDevs(users.filter(u => u.role === 'dev'));

      setMonitorModules(modules || []);
      setAllAdminModules(adminModules || []);
      setDbSedes(sedesList || []);
      setDbProgramas(progsList || []);
      setDbModalidades(modsList || []);
      setDbCuatrimestres(cuatsList || []);

      try {
        const gStats = await getGlobalStats();
        setGlobalStats(gStats || null);
      } catch {
        setGlobalStats(null);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const config = await getMaintenanceConfig();
        const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
        if (session?.role !== 'admin' && session?.baseRole !== 'admin' && session?.role !== 'dev' && session?.baseRole !== 'dev') {
          showToast('No tienes permisos de Administrador', 'error');
          navigate('/');
          return;
        }
        setMaintenance(config || maintenance);
        fetchData();
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    checkAccess();
    window.addEventListener('data-updated', fetchData);
    return () => window.removeEventListener('data-updated', fetchData);
  }, []);

  useEffect(() => {
    if (statusTarget) {
      try {
        const parsed = typeof statusTarget.restrictions === 'string' ? JSON.parse(statusTarget.restrictions) : (statusTarget.restrictions || {});
        setLocalRestrictions({
          login: parsed.login || false,
          search: parsed.search || false,
          dashboards: parsed.dashboards || false,
          registrations: parsed.registrations || false
        });
      } catch {
        setLocalRestrictions({ login: false, search: false, dashboards: false, registrations: false });
      }
    }
  }, [statusTarget]);

  const resetForm = () => {
    setFormData({ nombre: '', username: '', email: '', role: 'monitor', sede: dbSedes[0] || '', cuatrimestre: dbCuatrimestres[0] || '', foto: '', password: '' });
    setPasswordData({ password: '', confirmPassword: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      const payload = { ...formData, currentUserId: session.id };
      const isMonitor = ['monitor', 'monitor_academico', 'monitor_administrativo'].includes(formData.role);
      if (isMonitor) await createMonitor(payload);
      else await createUser(payload);
      setIsNewMonitorOpen(false);
      resetForm();
      fetchData();
      showToast('Usuario creado correctamente', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Error al crear', 'error');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      nombre: user.nombre || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'monitor',
      sede: user.sede || '',
      cuatrimestre: user.cuatrimestre || '',
      foto: user.foto || '',
      password: ''
    });
    setIsEditUserOpen(true);
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab]);

  const loadReports = async () => {
    try {
      const data = await getForumReports();
      setReports(data || []);
    } catch (error) {
      showToast(error.message || 'Error al cargar reportes', 'error');
    }
  };

  const handleResolveReport = async (reportId) => {
    setResolvingReportId(reportId);
    try {
      await resolveForumReport(reportId);
      showToast('Reporte marcado como resuelto', 'success');
      loadReports();
    } catch (error) {
      showToast(error.message || 'Error al resolver reporte', 'error');
    } finally {
      setResolvingReportId(null);
    }
  };

  const confirmUpdateUser = async (e) => {
    e.preventDefault();
    if (passwordData.password && passwordData.password !== passwordData.confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    try {
      const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      const payload = { ...formData, currentUserId: session.id };
      if (passwordData.password) payload.password = passwordData.password;
      await updateUser(selectedUser.id, payload);
      setIsEditUserOpen(false);
      resetForm();
      fetchData();
      showToast('Usuario actualizado', 'success');
    } catch (error) {
      showToast('Error al actualizar', 'error');
    }
  };

  const openDeleteConfirm = (user, type) => {
    setDeleteTarget({ user, type });
    setIsConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    try {
      if (['monitor', 'monitor_academico', 'monitor_administrativo'].includes(deleteTarget.type)) {
        await deleteMonitor(deleteTarget.user.id);
      } else {
        await deleteUser(deleteTarget.user.id);
      }
      setIsConfirmDeleteOpen(false);
      fetchData();
      showToast('Eliminado correctamente', 'success');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleToggleMaintenance = async (key) => {
    const newMaint = { ...maintenance, [key]: !maintenance[key] };
    try {
      await setMaintenanceConfig(newMaint);
      setMaintenance(newMaint);
      showToast('Configuración actualizada', 'success');
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleEditModule = (mod) => {
    setSelectedModule(mod);
    setModuleFormData({
      modulo: mod.modulo || '', monitor: mod.monitor || '', monitorId: mod.monitorId || '',
      sede: mod.sede || '', cuatrimestre: mod.cuatrimestre || ''
    });
    setIsEditModuleOpen(true);
  };

  const confirmUpdateModule = async (e) => {
    e.preventDefault();
    try {
      await adminUpdateModule(selectedModule.id, moduleFormData);
      setIsEditModuleOpen(false);
      fetchData();
      showToast('Modulo actualizado', 'success');
    } catch (error) {
      showToast('Error al actualizar modulo', 'error');
    }
  };

  const handleDeleteModule = async (id) => {
    if (!window.confirm('¿Eliminar módulo permanentemente?')) return;
    try {
      await adminDeleteModule(id);
      fetchData();
      showToast('Modulo eliminado', 'success');
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const openUserStatsModal = async (user) => {
    const targetId = Number(user?.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      showToast('ID de usuario invalido', 'error');
      return;
    }
    try {
      const data = await getUserStatsById(targetId);
      setUserStatsModal({ user, data });
      setUserStatsTab('personal');
    } catch (error) {
      showToast(error.message || 'Error al cargar stats', 'error');
    }
  };

  useEffect(() => {
    let active = true;
    const loadMemberStats = async () => {
      if (!selectedStatsUserId) {
        setMemberStats(null);
        return;
      }
      const id = Number(selectedStatsUserId);
      if (!Number.isInteger(id) || id <= 0) {
        setMemberStats(null);
        return;
      }
      try {
        const data = await getUserStats(id);
        if (active) setMemberStats(data || null);
      } catch (error) {
        if (active) {
          setMemberStats(null);
          showToast(error.message || 'Error al cargar estadisticas del usuario', 'error');
        }
      }
    };
    loadMemberStats();
    return () => { active = false; };
  }, [selectedStatsUserId]);


  if (loading && !monitors.length) return <div className="min-h-screen flex items-center justify-center bg-brand-gray font-black text-brand-blue animate-pulse">Cargando Panel Central...</div>;

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-amber-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border-b-8 border-amber-700/30">
          <div className="relative z-10 flex gap-6 items-center w-full">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-4 ring-white/20 shadow-2xl">
              <ShieldCheck size={56} className="text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 backdrop-blur-sm">
                <ShieldCheck size={12} /> Institutional Central System
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1.5">Panel Administrativo</h1>
              <p className="text-amber-50 text-sm font-bold opacity-90 max-w-2xl">Gestión institucional de usuarios, monitorías y auditoría de asistencia.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<GraduationCap />} title="Estudiantes" value={students.length} role="student" />
          <StatCard icon={<Users />} title="Monitores" value={monitors.length} role="monitor" />
          <StatCard icon={<ShieldCheck />} title="Administradores" value={admins.length} role="admin" />
          <StatCard icon={<Activity />} title="Developers" value={devs.length} role="dev" />
        </div>

        {/* Global Monitoring Section */}
        <section className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Activity className="text-brand-blue" /> Estadísticas Globales
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedStatsUserId}
                onChange={(e) => setSelectedStatsUserId(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="">Analizar Usuario...</option>
                {[...students, ...monitors, ...admins, ...devs].map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.role})</option>)}
              </select>
            </div>
          </div>

          {globalStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Asistencias Totales</p>
                <p className="text-3xl font-black text-brand-blue">{globalStats.totals?.total_assistances || 0}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Rating Promedio</p>
                <p className="text-3xl font-black text-brand-blue">{globalStats.totals?.average_rating || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Estudiantes Activos</p>
                <p className="text-3xl font-black text-brand-blue">{globalStats.totals?.unique_students || 0}</p>
              </div>
            </div>
          )}

          {memberStats && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest flex items-center gap-1.5">
                <BarChart3 size={12} /> Vista por usuario seleccionado
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(memberStats.totals || {}).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{key.replaceAll('_', ' ')}</p>
                    <p className="text-2xl font-black text-brand-blue">{value ?? 0}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Main Management Tabs */}
        <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-auto max-w-full lg:max-w-none">
              {['students', 'monitors', 'admins', 'devs', 'modules', 'reports', 'config'].map((tab) => {
                const labelMap = {
                  students: 'Estudiantes', monitors: 'Monitores', admins: 'Admins',
                  devs: 'Devs', modules: 'Módulos', reports: 'Reportes', config: 'Config'
                };
                const IconMap = {
                  students: GraduationCap, monitors: Users, admins: ShieldCheck,
                  devs: Activity, modules: BookOpen, reports: AlertTriangle, config: Settings
                };
                const Icon = IconMap[tab];
                if (tab === 'config' && session.role !== 'dev' && session.baseRole !== 'dev') return null;

                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                    className={`px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 active:scale-95 ${activeTab === tab ? 'bg-brand-blue text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
                  >
                    <Icon size={16} className={tab === 'reports' && activeTab === 'reports' ? 'text-amber-400' : ''} />
                    <span>{labelMap[tab]}</span>
                  </button>
                );
              })}
            </div>

            {activeTab !== 'config' && (
              <button
                onClick={() => {
                  resetForm();
                  const roleMap = { students: 'student', monitors: 'monitor_academico', admins: 'admin', devs: 'dev' };
                  setFormData(prev => ({ ...prev, role: roleMap[activeTab] || 'student' }));
                  setIsNewMonitorOpen(true);
                }}
                className="flex items-center gap-2 px-8 py-3.5 bg-brand-blue text-white rounded-2xl font-black text-xs shadow-lg hover:bg-brand-dark-blue hover:shadow-xl active:scale-95 transition-all text-nowrap"
              >
                <PlusCircle size={16} /> Registrar Miembro
              </button>
            )}
          </div>

          {activeTab !== 'config' && (
            <div className="px-8 py-5 bg-white border-b border-gray-50 flex items-center gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-blue transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Buscar en esta sección por nombre, correo, usuario o sede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20 transition-all placeholder:text-gray-400 shadow-inner"
                />
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                <Info size={12} />
                <span>Resultados Filtrados</span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-x-auto"
            >
              {activeTab === 'config' ? (
                <div className="p-10 space-y-10">
                  <div className="flex items-center gap-4 bg-brand-blue/5 p-6 rounded-[24px] border border-brand-blue/10">
                    <Info className="text-brand-blue shrink-0" size={24} />
                    <p className="text-sm font-bold text-brand-blue leading-relaxed">Configuración global del sistema. Cambia el estado de mantenimiento de los módulos principales aquí.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(maintenance).map(([key, val]) => (
                      <MaintToggle key={key} id={key} title={key.charAt(0).toUpperCase() + key.slice(1)} subtitle="Estado de Servicio" icon={Settings} active={val} onToggle={handleToggleMaintenance} />
                    ))}
                  </div>
                </div>
              ) : activeTab === 'modules' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-50 bg-gray-50/50">
                      <th className="px-8 py-6">Módulo Académico</th>
                      <th className="px-8 py-6">Responsable (Monitor)</th>
                      <th className="px-8 py-6">Sede / Ciclo</th>
                      <th className="px-8 py-6 text-right">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allAdminModules.filter(mod => {
                      const search = searchTerm.toLowerCase();
                      return mod.modulo?.toLowerCase().includes(search) || mod.monitor?.toLowerCase().includes(search) || mod.sede?.toLowerCase().includes(search);
                    }).map(mod => {
                      const monitorExists = monitors.some(m => m.id === mod.monitorId);
                      return (
                        <tr key={mod.id} className="hover:bg-gray-50 transition-all group">
                          <td className="px-8 py-6">
                            <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors">{mod.modulo}</p>
                            <p className="text-[9px] text-gray-400 font-black">REF: #{mod.id}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              {monitorExists ? (
                                <>
                                  <UserAvatar user={{ nombre: mod.monitor, role: 'monitor' }} size="sm" />
                                  <div><p className="text-xs font-black text-gray-700">{mod.monitor}</p><p className="text-[9px] text-brand-blue font-bold uppercase italic">Activo</p></div>
                                </>
                              ) : (
                                <>
                                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500"><AlertTriangle size={16} /></div>
                                  <div><p className="text-xs font-black text-red-600">INACTIVO / HUÉRFANO</p><p className="text-[9px] text-red-400 font-black uppercase italic">⚠️ Requiere Atención</p></div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <span className="block w-fit px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-black rounded uppercase">{mod.sede}</span>
                              <span className="block w-fit px-2 py-0.5 bg-blue-50 text-brand-blue text-[9px] font-black rounded uppercase">{mod.cuatrimestre}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditModule(mod)} className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all active:scale-90"><Edit3 size={18} /></button>
                              <button onClick={() => handleDeleteModule(mod.id)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : activeTab === 'reports' ? (
                <div className="bg-white overflow-hidden">
                  <div className="p-8 border-b border-gray-100 bg-amber-50/30 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-amber-900 tracking-tight">Reportes de Moderación</h3>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Revisión de contenido reportado por la comunidad</p>
                    </div>
                    <button onClick={loadReports} className="p-3 bg-white text-amber-600 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all active:scale-90">
                      <Clock size={20} />
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase font-black text-gray-400 border-b border-gray-50 bg-gray-50/50">
                        <th className="px-8 py-6">Autor Reportado</th>
                        <th className="px-8 py-6">Evidencia / Motivo</th>
                        <th className="px-8 py-6">Ubicación</th>
                        <th className="px-8 py-6 text-right">Moderación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-8 py-20 text-center italic text-gray-400 font-bold">Excelente trabajo, no hay reportes pendientes.</td>
                        </tr>
                      ) : (
                        reports.filter(rep => {
                          const search = searchTerm.toLowerCase();
                          return rep.reported_name?.toLowerCase().includes(search) || rep.reporter_name?.toLowerCase().includes(search) || rep.reason?.toLowerCase().includes(search);
                        }).map(rep => (
                          <tr key={rep.id} className="hover:bg-gray-50 transition-all group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4 text-left">
                                <UserAvatar user={{ nombre: rep.reported_name, foto: rep.reported_photo, role: 'student' }} size="sm" />
                                <div>
                                  <p className="font-extrabold text-gray-900 truncate max-w-[150px]">{rep.reported_name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Reportado por: {rep.reporter_name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="max-w-md">
                                <p className="text-sm font-bold text-gray-700 leading-tight">"{rep.reason}"</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">{new Date(rep.created_at).toLocaleString()}</p>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <button
                                onClick={() => navigate(`/modules/${rep.modulo_id || 0}/forum?forumId=${rep.target_id}`)}
                                className="px-4 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-xl uppercase border border-amber-200 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                              >
                                {rep.target_type === 'thread' ? 'Ir al Foro' : 'Ir al Mensaje'}
                              </button>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                disabled={resolvingReportId === rep.id}
                                onClick={() => handleResolveReport(rep.id)}
                                className="px-6 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {resolvingReportId === rep.id ? '...' : 'Marcar Resuelto'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-black text-gray-400 border-b border-gray-50 bg-gray-50/50">
                      <th className="px-8 py-6">Perfil Institucional</th>
                      <th className="px-8 py-6">Identidad</th>
                      <th className="px-8 py-6">Estado Institucional</th>
                      <th className="px-8 py-6 text-right">Operaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(activeTab === 'monitors' ? monitors : activeTab === 'admins' ? admins : activeTab === 'devs' ? devs : students).filter(u => {
                      const search = searchTerm.toLowerCase();
                      return u.nombre?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search) || u.username?.toLowerCase().includes(search) || u.sede?.toLowerCase().includes(search);
                    }).map(user => {
                      const isBlocked = user.is_active === 0 || (user.restrictions && JSON.parse(user.restrictions).login);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <UserAvatar user={user} size="md" />
                              <div>
                                <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors truncate max-w-[180px]">{user.nombre}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase italic tracking-tighter">ID: {user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider italic">@{user.username}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1.5">
                              {isBlocked ? (
                                <span className="w-fit px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-lg uppercase flex items-center gap-1.5"><Lock size={10} /> Suspendido</span>
                              ) : (
                                <span className="w-fit px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-lg uppercase flex items-center gap-1.5"><Check size={10} /> Certificado</span>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black rounded uppercase">{(user.role || 'User').replace('_', ' ')}</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase truncate max-w-[80px]">{user.sede || 'Global Access'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {session.id !== user.id && (
                                <>
                                  <button
                                    onClick={() => openUserStatsModal(user)}
                                    className="p-2.5 rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all active:scale-95"
                                    title="Estadisticas"
                                    aria-label="Ver estadisticas"
                                  >
                                    <BarChart3 size={16} />
                                  </button>
                                  <button onClick={() => handleEditUser(user)} className="p-2.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all active:scale-90"><Edit3 size={18} /></button>
                                  <button onClick={() => { setStatusTarget(user); setIsStatusModalOpen(true); }} className={`p-2.5 rounded-xl transition-all active:scale-90 ${isBlocked ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-green-500 bg-green-50 hover:bg-green-100'}`}>{isBlocked ? <Lock size={18} /> : <Unlock size={18} />}</button>
                                  <button onClick={() => openDeleteConfirm(user, user.role)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                                </>
                              )}
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

      {/* Modals Section */}
      <Modal isOpen={isNewMonitorOpen} onClose={() => { setIsNewMonitorOpen(false); resetForm(); }} title="Registrar en Sistema Central">
        <form onSubmit={handleCreate} className="space-y-5 py-2">
          <InputField label="Cargo Institucional" type="select" value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'student', label: 'Estudiante' },
              { value: 'monitor_academico', label: 'Monitor Académico' },
              { value: 'monitor_administrativo', label: 'Monitor Administrativo' },
              { value: 'admin', label: 'Administrador' }
            ]} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nombre" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Usuario ID" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Correo Institucional" icon={<Mail />} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <InputField label="Contraseña Temporal" icon={<Lock />} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Sede" type="select" options={dbSedes.map(s => ({ value: s, label: s }))} value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })} />
            <InputField label="Ciclo" type="select" options={dbCuatrimestres.map(c => ({ value: c, label: c }))} value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })} />
          </div>
          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black rounded-2xl shadow-xl hover:bg-brand-dark-blue hover:shadow-2xl active:scale-[0.98] transition-all">Sincronizar Datos</button>
        </form>
      </Modal>

      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Modificar Entidad Institucional">
        <form onSubmit={confirmUpdateUser} className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nombre" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Usuario" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Rol Académico" type="select" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'student', label: 'Estudiante' },
              { value: 'monitor_academico', label: 'Monitor Académico' },
              { value: 'monitor_administrativo', label: 'Monitor Administrativo' },
              { value: 'admin', label: 'Admin' }
            ]} />
          <InputField label="Correo" icon={<Mail />} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Sede" type="select" options={dbSedes.map(s => ({ value: s, label: s }))} value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })} />
            <InputField label="Ciclo" type="select" options={dbCuatrimestres.map(c => ({ value: c, label: c }))} value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })} />
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Nuevas Credenciales (Opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Contraseña" icon={<Lock />} type="password" value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })} />
              <InputField label="Confirmar" icon={<Lock />} type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black rounded-[24px] shadow-2xl hover:bg-brand-dark-blue transition-all">Actualizar Registro</button>
        </form>
      </Modal>

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Seguridad Institucional">
        <div className="space-y-8 text-center py-6">
          <div className={`p-10 rounded-[20px] inline-block shadow-2xl ${localRestrictions.login ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} animate-pulse`}>
            {localRestrictions.login ? <Lock size={30} /> : <Unlock size={30} />}
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-gray-900 leading-none">{statusTarget?.nombre}</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Control de Privilegios y Restricciones</p>
          </div>
          <div className="grid grid-cols-2 gap-4 px-6">
            {Object.entries(localRestrictions).map(([k, v]) => (
              <div key={k} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500">{k}</span>
                <button onClick={() => setLocalRestrictions(p => ({ ...p, [k]: !p[k] }))} className={`w-10 h-6 rounded-full relative transition-all ${v ? 'bg-red-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${v ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-6 space-y-3">
            <button onClick={async () => {
              try {
                await updateUser(statusTarget.id, { is_active: !localRestrictions.login ? 1 : 0, restrictions: JSON.stringify(localRestrictions), currentUserId: session.id });
                fetchData(); setIsStatusModalOpen(false); showToast('Sincronizado', 'success');
              } catch { showToast('Error', 'error'); }
            }} className="w-full py-5 bg-brand-blue text-white font-black rounded-3xl shadow-xl">Aplicar Cambios Institucionales</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!userStatsModal} onClose={() => setUserStatsModal(null)} title="Reporte de Auditoria">
        {userStatsModal && (
          <div className="space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
              {[{ id: 'personal', label: 'Personal' }, { id: 'role', label: 'Rol' }].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setUserStatsTab(tab.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${userStatsTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="bg-slate-50 rounded-3xl p-6 border border-gray-200 min-h-[200px] space-y-6 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatMetricCard icon={UserCheck} label="Usuario" value={userStatsModal.user.nombre || 'N/A'} color="text-gray-900" />
                <StatMetricCard icon={Mail} label="Correo" value={userStatsModal.user.email || 'N/A'} color="text-gray-900" />
              </div>

              {userStatsTab === 'personal' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><BookOpen size={12} /> Actividad académica</p>
                      <div className="grid grid-cols-2 gap-3">
                        <StatMetricCard icon={Check} label="Asistencias" value={num(userStatsModal.data?.academic?.total_assistances)} color="text-emerald-600" />
                        <StatMetricCard icon={AlertTriangle} label="Ausencias" value={num(userStatsModal.data?.academic?.total_absences)} color="text-red-600" />
                        <StatMetricCard icon={Info} label="Excusas" value={num(userStatsModal.data?.academic?.total_excuses)} color="text-amber-600" />
                        <StatMetricCard icon={PieChart} label="Frecuencia %" value={num(userStatsModal.data?.academic?.attendance_frequency)} color="text-brand-blue" />
                      </div>
                      <HorizontalBars
                        rows={[
                          { label: 'Asistencias', value: num(userStatsModal.data?.academic?.total_assistances) },
                          { label: 'Ausencias', value: num(userStatsModal.data?.academic?.total_absences) },
                          { label: 'Excusas', value: num(userStatsModal.data?.academic?.total_excuses) }
                        ]}
                        max={Math.max(
                          num(userStatsModal.data?.academic?.total_assistances),
                          num(userStatsModal.data?.academic?.total_absences),
                          num(userStatsModal.data?.academic?.total_excuses),
                          1
                        )}
                        color="bg-brand-blue"
                      />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><UtensilsCrossed size={12} /> Actividad comedor</p>
                      <div className="grid grid-cols-2 gap-3">
                        <StatMetricCard icon={Check} label="Total comidas" value={num(userStatsModal.data?.meals?.total_meals)} color="text-emerald-600" />
                        <StatMetricCard icon={Clock} label="Dias activos" value={num(userStatsModal.data?.meals?.active_days)} color="text-indigo-600" />
                        <StatMetricCard icon={Activity} label="Uso semanal" value={num(userStatsModal.data?.meals?.usage_frequency)} color="text-brand-blue" />
                        <StatMetricCard icon={PieChart} label="Ultima comida" value={userStatsModal.data?.meals?.last_meal_at ? new Date(userStatsModal.data.meals.last_meal_at).toLocaleDateString() : 'N/A'} color="text-gray-900" />
                      </div>
                      <div className="flex items-center justify-center">
                        <Donut
                          percent={Math.min(100, num(userStatsModal.data?.meals?.usage_frequency) * 10)}
                          centerLabel={`${Math.min(100, Math.round(num(userStatsModal.data?.meals?.usage_frequency) * 10))}%`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Historial académico reciente</p>
                      <div className="overflow-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] uppercase text-gray-400">
                              <th className="py-2">Fecha</th>
                              <th className="py-2">Modulo</th>
                              <th className="py-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userStatsModal.data?.academic?.session_history || []).slice(0, 6).map((row) => (
                              <tr key={row.id} className="border-t border-gray-100 text-xs font-bold text-gray-700">
                                <td className="py-2">{row.start_time ? new Date(row.start_time).toLocaleDateString() : 'N/A'}</td>
                                <td className="py-2">{row.module_name || 'N/A'}</td>
                                <td className="py-2">{row.status || 'N/A'}</td>
                              </tr>
                            ))}
                            {(userStatsModal.data?.academic?.session_history || []).length === 0 && (
                              <tr><td colSpan="3" className="py-3 text-xs font-bold text-gray-400 italic">Sin datos</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Historial comedor reciente</p>
                      <div className="overflow-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] uppercase text-gray-400">
                              <th className="py-2">Fecha</th>
                              <th className="py-2">Escaneado por</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(userStatsModal.data?.meals?.consumption_history || []).slice(0, 6).map((row) => (
                              <tr key={row.id} className="border-t border-gray-100 text-xs font-bold text-gray-700">
                                <td className="py-2">{row.created_at ? new Date(row.created_at).toLocaleDateString() : (row.date || 'N/A')}</td>
                                <td className="py-2">{row.scanner_name || 'N/A'}</td>
                              </tr>
                            ))}
                            {(userStatsModal.data?.meals?.consumption_history || []).length === 0 && (
                              <tr><td colSpan="2" className="py-3 text-xs font-bold text-gray-400 italic">Sin datos</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Activity size={12} /> Estadisticas por rol
                    </p>
                    {userStatsModal.data?.monitor_activity ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {Object.entries(userStatsModal.data.monitor_activity).filter(([k]) => k !== 'type').map(([key, value]) => (
                            <div key={key} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{key.replaceAll('_', ' ')}</p>
                              <p className="text-2xl font-black text-brand-blue">{value ?? 0}</p>
                            </div>
                          ))}
                        </div>
                        <HorizontalBars
                          rows={Object.entries(userStatsModal.data.monitor_activity)
                            .filter(([k, v]) => k !== 'type' && typeof v === 'number')
                            .map(([k, v]) => ({ label: k.replaceAll('_', ' '), value: v }))}
                          max={Math.max(...Object.entries(userStatsModal.data.monitor_activity)
                            .filter(([k, v]) => k !== 'type' && typeof v === 'number')
                            .map(([, v]) => Number(v)), 1)}
                          color="bg-emerald-600"
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-gray-500 italic">Este rol no tiene metricas especificas de actividad.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="Eliminación Crítica">
        <div className="space-y-8 text-center py-6">
          <div className="bg-red-50 p-10 rounded-[40px] inline-block text-red-600 animate-bounce">
            <AlertTriangle size={80} />
          </div>
          <div className="space-y-3">
            <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">¿Expulsar a {deleteTarget?.user.nombre}?</p>
            <p className="text-gray-400 font-bold text-sm max-w-xs mx-auto">Esta acción revoca todos los permisos y borra el historial de forma irreversible.</p>
          </div>
          <div className="px-6 flex flex-col gap-3">
            <button onClick={executeDelete} className="w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-2xl hover:bg-red-700">Confirmar Expulsión Permanente</button>
            <button onClick={() => setIsConfirmDeleteOpen(false)} className="w-full py-5 bg-white text-gray-400 font-black border-2 border-gray-100 rounded-3xl">Desistir</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditModuleOpen} onClose={() => setIsEditModuleOpen(false)} title="Gobernanza de Módulo">
        <form onSubmit={confirmUpdateModule} className="space-y-5 py-2">
          <div className="bg-brand-blue/5 p-5 rounded-3xl border border-brand-blue/10">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShieldCheck size={12} /> Seguridad Administrativa</p>
            <p className="text-[11px] text-brand-blue/80 font-bold leading-relaxed italic">Reasignar titularidad de monitoría en caso de deserción o error.</p>
          </div>
          <InputField label="Asignatura/Módulo" icon={<BookOpen />} value={moduleFormData.modulo} onChange={e => setModuleFormData({ ...moduleFormData, modulo: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Sede" type="select" options={dbSedes.map(s => ({ value: s, label: s }))} value={moduleFormData.sede} onChange={e => setModuleFormData({ ...moduleFormData, sede: e.target.value })} />
            <InputField label="Ciclo" type="select" options={dbCuatrimestres.map(c => ({ value: c, label: c }))} value={moduleFormData.cuatrimestre} onChange={e => setModuleFormData({ ...moduleFormData, cuatrimestre: e.target.value })} />
          </div>
          <div className="pt-2">
            <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Vincular Nuevo Titular (Monitor)</label>
            <select
              value={moduleFormData.monitorId}
              onChange={e => {
                const mon = monitors.find(m => m.id === Number(e.target.value));
                setModuleFormData({ ...moduleFormData, monitorId: e.target.value, monitor: mon?.nombre || '' });
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded-[20px] px-5 py-4 text-sm font-black text-gray-900 outline-none focus:ring-4 focus:ring-brand-blue/10"
            >
              <option value="">Seleccionar Monitor Activo...</option>
              {monitors.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.email})</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black rounded-[24px] shadow-2xl hover:bg-brand-dark-blue">Ejecutar Cambios Institucionales</button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;

