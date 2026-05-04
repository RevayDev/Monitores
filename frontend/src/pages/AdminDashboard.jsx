import React, { useState, useEffect } from 'react';
import { splitHighlightedText } from '../utils/forumSearchHelpers';
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
  getAdminUserFullStats,
  adminGetModules,
  adminUpdateModule,
  adminDeleteModule,
  getForumReports,
  resolveForumReport,
  getModerationLogs,
  request
} from '../services/api';
import { ToastContext } from '../context/ToastContext';
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
  Check,
  BarChart3,
  PieChart,
  GraduationCap,
  UtensilsCrossed,
  MessageSquare,
  FileCode,
  FileJson,
  FileText as FileTextIcon,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import StatCard from '../components/StatCard';
import { getRoleColors } from '../utils/roleHelpers';
import { getPageItems, getPageNumbers, parseLogMetadata } from '../utils/adminDashboardHelpers';

const MaintToggle = ({ id, title, subtitle, icon: Icon, active, onToggle }) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
    <div className="flex items-center gap-5">
      <div className={`p-4 rounded-2xl ${active ? 'bg-slate-50 text-slate-500' : 'bg-gray-50 text-gray-400'} transition-colors`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className="text-lg font-black text-gray-900 tracking-tight">{title}</h4>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{subtitle}</p>
      </div>
    </div>
    <button
      onClick={() => onToggle(id)}
      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${active ? 'bg-slate-500' : 'bg-gray-200'}`}
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
  const [activeTab, setActiveTab] = useState('users');
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
  const [userStatsTab, setUserStatsTab] = useState('personal');

  // Toggles
  const [isNewMonitorOpen, setIsNewMonitorOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [memberSubTab, setMemberSubTab] = useState('student');
  const [reportSubTab, setReportSubTab] = useState('pending');
  const [reports, setReports] = useState([]);
  const [moderationLogs, setModerationLogs] = useState([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [isConfirmDeleteModuleOpen, setIsConfirmDeleteModuleOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [selectedStatsUserId, setSelectedStatsUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const renderSearchHighlight = (value) => (
    <>
      {splitHighlightedText(String(value || ''), searchTerm).map((part, index) => (
        part.match
          ? <mark key={index} className="rounded bg-yellow-200 px-0.5 text-gray-950">{part.text}</mark>
          : <React.Fragment key={index}>{part.text}</React.Fragment>
      ))}
    </>
  );
  const [academicModules, setAcademicModules] = useState([]);
  const [selectedAcademicModuleId, setSelectedAcademicModuleId] = useState('');
  const [academicStats, setAcademicStats] = useState(null);
  const [loadingAcademic, setLoadingAcademic] = useState(false);

  // Config data
  const [dbSedes, setDbSedes] = useState([]);
  const [dbProgramas, setDbProgramas] = useState([]);
  const [dbModalidades, setDbModalidades] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);
  const [maintenance, setMaintenance] = useState({
    login: false, signup: false, monitorias: false, adminPanel: false, monitorPanel: false, global: false
  });
  const [localRestrictions, setLocalRestrictions] = useState({
    login: false, dashboards: false, modules: false, profile: false
  });

  // Forms
  const [formData, setFormData] = useState({
    nombre: '', username: '', email: '', role: 'monitor_academico', sede: '', cuatrimestre: '', foto: '', password: ''
  });
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [moduleFormData, setModuleFormData] = useState({
    modulo: '', monitor: '', monitorId: '', sede: '', cuatrimestre: ''
  });

  const fetchUsersByRole = async (role) => {
    try {
      setLoading(true);
      const users = await getAllUsers(role);
      if (role === 'student') setStudents(users);
      else if (role === 'staff') {
        const [adm, dv] = await Promise.all([getAllUsers('admin'), getAllUsers('dev')]);
        setAdmins(adm);
        setDevs(dv);
      }
    } catch (error) {
      showToast('Error al filtrar miembros', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modules, sedesList, progsList, modsList, cuatsList, adminModules, academicMods] = await Promise.all([
        getMonitorias(),
        getSedes(),
        getProgramas(),
        getModalidades(),
        getCuatrimestres(),
        adminGetModules(),
        request('/academic/modules')
      ]);

      // Initial loads for counts
      const [allU] = await Promise.all([getAllUsers()]);
      setMonitors(allU.filter(u => ['monitor_academico', 'monitor_administrativo'].includes(String(u.role || ''))));
      setAdmins(allU.filter(u => u.role === 'admin'));
      setStudents(allU.filter(u => ['student'].includes(String(u.role || ''))));
      setDevs(allU.filter(u => u.role === 'dev'));

      setMonitorModules(modules || []);
      setAllAdminModules(adminModules || []);
      setDbSedes(sedesList || []);
      setDbProgramas(progsList || []);
      setDbModalidades(modsList || []);
      setDbCuatrimestres(cuatsList || []);
      setAcademicModules(academicMods || []);

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
    if (activeTab === 'users') {
      fetchUsersByRole(memberSubTab);
    }
  }, [memberSubTab, activeTab]);

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
          dashboards: parsed.dashboards || false,
          modules: parsed.modules || false,
          profile: parsed.profile || false
        });
      } catch {
        setLocalRestrictions({ login: false, search: false, dashboards: false, registrations: false });
      }
    }
  }, [statusTarget]);

  const resetForm = () => {
    setFormData({ nombre: '', username: '', email: '', role: 'monitor_academico', sede: dbSedes[0] || '', cuatrimestre: dbCuatrimestres[0] || '', foto: '', password: '' });
    setPasswordData({ password: '', confirmPassword: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      const payload = { ...formData, currentUserId: session.id };
      const isMonitor = ['monitor_academico', 'monitor_administrativo'].includes(formData.role);
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
      role: user.role || 'monitor_academico',
      sede: user.sede || '',
      cuatrimestre: user.cuatrimestre || '',
      foto: user.foto || '',
      password: ''
    });
    setIsEditUserOpen(true);
  };

  useEffect(() => {
    if (activeTab === 'reports' || activeTab === 'log') {
      fetchReportsData();
    }
  }, [activeTab]);

  const fetchReportsData = async () => {
    if (!session?.id) return;
    try {
      const [pending, logs] = await Promise.all([
        getForumReports(),
        getModerationLogs()
      ]);
      setReports(pending || []);
      setModerationLogs(logs || []);
      setReportsPage(1);
      setActivityLogPage(1);
    } catch (error) {
      if (session?.id) {
        showToast(error.message || 'Error al cargar datos de moderación', 'error');
      }
    }
  };

  const handleResolveReport = async (reportId, note) => {
    setResolvingReportId(reportId);
    try {
      await resolveForumReport(reportId, note);
      showToast('Reporte resuelto correctamente', 'success');
      setResolveTarget(null);
      setResolveNote('');
      fetchReportsData();
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
      if (['monitor_academico', 'monitor_administrativo'].includes(deleteTarget.type)) {
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

  const handleDeleteModule = (id) => {
    setModuleToDelete(id);
    setIsConfirmDeleteModuleOpen(true);
  };

  const executeDeleteModule = async () => {
    try {
      await adminDeleteModule(moduleToDelete);
      setIsConfirmDeleteModuleOpen(false);
      fetchData();
      showToast('Modulo eliminado correctamente', 'success');
    } catch (error) {
      showToast('Error al eliminar modulo', 'error');
    }
  };

  const openUserStatsModal = async (user) => {
    const targetId = Number(user?.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      showToast('ID de usuario invalido', 'error');
      return;
    }
    try {
      const data = await getAdminUserFullStats(targetId);
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

  useEffect(() => {
    const loadAcademicStats = async () => {
      if (!selectedAcademicModuleId) {
        setAcademicStats(null);
        return;
      }
      try {
        setLoadingAcademic(true);
        const res = await request(`/academic/modules/${selectedAcademicModuleId}/stats`);
        setAcademicStats(res);
      } catch (error) {
        showToast('Error al cargar métricas académicas', 'error');
      } finally {
        setLoadingAcademic(false);
      }
    };
    loadAcademicStats();
  }, [selectedAcademicModuleId]);

  const REPORTS_PER_PAGE = 4;
  const LOGS_PER_PAGE = 20;
  const visibleReports = getPageItems(reports, reportsPage, REPORTS_PER_PAGE);
  const reportPageNumbers = getPageNumbers(reports.length, REPORTS_PER_PAGE);
  const reportHistoryLogs = moderationLogs.filter((log) => String(log.action || "").toLowerCase().includes("report"));
  const visibleActivityLogs = getPageItems(reportHistoryLogs, activityLogPage, LOGS_PER_PAGE);
  const activityLogPageNumbers = getPageNumbers(reportHistoryLogs.length, LOGS_PER_PAGE);

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-blue-600 rounded-[32px] p-6 md:p-8 text-white flex flex-col items-center justify-between gap-6">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black bg-blue-600 border border-blue-500">
                <ShieldCheck size={36} className="text-blue-50" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-600 rounded-full">
                  <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-50">Bienvenido(a), {JSON.parse(localStorage.getItem('monitores_current_role') || '{}')?.nombre || 'Administrador'}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                  Panel Administrativo
                </h1>
                <p className="text-blue-100 text-xs font-medium opacity-90 max-w-md leading-snug">
                  Gestión centralizada de privilegios, Estadísticas y auditoría institucional.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-blue-700 rounded-2xl">
              {[
                { id: 'users', label: 'Miembros', icon: <Users size={16} /> },
                { id: 'modules', label: 'Monitorías', icon: <BookOpen size={16} /> },
                { id: 'reports', label: 'Reportes', icon: <MessageSquare size={16} /> },
                { id: 'log', label: 'Log', icon: <FileText size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activeTab === tab.id
                    ? 'bg-white text-blue-700 shadow-xl'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {activeTab === 'stats_disabled' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={<GraduationCap />} title="Estudiantes" value={students.length} role="student" />
              <StatCard icon={<Users />} title="Monitores" value={monitors.length} role="monitor" />
              <StatCard icon={<ShieldCheck />} title="Administradores" value={admins.length} role="admin" />
              <StatCard icon={<Activity />} title="Developers" value={devs.length} role="dev" />
            </div>

            <section className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Activity className="text-blue-600" /> Estadísticas Globales
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
                    <p className="text-3xl font-black text-blue-600">{globalStats.totals?.total_assistances || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Reportes de Moderación</p>
                    <p className="text-3xl font-black text-blue-600">{reports.length || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Estudiantes Activos</p>
                    <p className="text-3xl font-black text-blue-600">{globalStats.totals?.unique_students || 0}</p>
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
                        <p className="text-2xl font-black text-blue-600">{value ?? 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="text-emerald-500" size={18} /> Auditoría Académica
                  </h4>
                  <select
                    value={selectedAcademicModuleId}
                    onChange={e => setSelectedAcademicModuleId(e.target.value)}
                    className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none"
                  >
                    <option value="">Seleccionar Módulo Académico...</option>
                    {academicModules.map(m => (
                      <option key={m.id} value={m.id}>{m.modulo} ({m.monitor})</option>
                    ))}
                  </select>
                </div>

                {loadingAcademic ? (
                  <div className="h-20 flex items-center justify-center text-[10px] font-black text-emerald-600 animate-pulse uppercase tracking-widest">Calculando métricas Académicas...</div>
                ) : academicStats ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="rounded-xl border border-emerald-50 p-3 bg-emerald-50/30 text-center"><p className="text-[9px] font-black uppercase text-emerald-600 mb-1">Rating Avg</p><p className="text-lg font-black text-emerald-700">{academicStats?.totals?.avg_rating || 0}</p></div>
                      <div className="rounded-xl border border-gray-50 p-3 bg-gray-50/50 text-center"><p className="text-[9px] font-black uppercase text-gray-500 mb-1">Presentes</p><p className="text-lg font-black text-gray-900">{academicStats?.totals?.present_count || 0}</p></div>
                      <div className="rounded-xl border border-gray-50 p-3 bg-gray-50/50 text-center"><p className="text-[9px] font-black uppercase text-gray-500 mb-1">Ausentes</p><p className="text-lg font-black text-gray-900">{academicStats?.totals?.absent_count || 0}</p></div>
                      <div className="rounded-xl border border-gray-50 p-3 bg-gray-50/50 text-center"><p className="text-[9px] font-black uppercase text-gray-500 mb-1">Excusas</p><p className="text-lg font-black text-gray-900">{academicStats?.totals?.excuse_count || 0}</p></div>
                      <div className="rounded-xl border border-gray-50 p-3 bg-gray-50/50 text-center"><p className="text-[9px] font-black uppercase text-gray-500 mb-1">Horas Mon.</p><p className="text-lg font-black text-gray-900">{academicStats?.totals?.total_monitor_hours || 0}</p></div>
                      <div className="rounded-xl border border-gray-50 p-3 bg-gray-50/50 text-center"><p className="text-[9px] font-black uppercase text-gray-500 mb-1">Sesiones</p><p className="text-lg font-black text-gray-900">{academicStats?.totals?.total_sessions || 0}</p></div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead className="bg-gray-50 sticky top-0 text-[9px] uppercase font-black text-gray-400 border-b border-gray-100">
                            <tr>
                              <th className="px-5 py-3 text-left">Alumno</th>
                              <th className="px-5 py-3 text-center">Asistencia %</th>
                              <th className="px-5 py-3 text-center">P</th>
                              <th className="px-5 py-3 text-center">A</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-gray-600 font-bold">
                            {(academicStats?.students || []).map(st => (
                              <tr key={st.student_key}>
                                <td className="px-5 py-2.5 text-gray-900">{st.student_name}</td>
                                <td className="px-5 py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full ${st.attendance_percent > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                    {st.attendance_percent}%
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-center">{st.present_count}</td>
                                <td className="px-5 py-2.5 text-center">{st.absent_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-8 text-center">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Selecciona un módulo para iniciar la auditoría de rendimiento</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab !== 'stats' && (
          <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  {activeTab === 'users' ? <><Users className="text-blue-600" /> Directorio Institucional</> :
                    activeTab === 'modules' ? <><BookOpen className="text-blue-600" /> Módulos Académicos</> :
                      activeTab === 'reports' ? <><AlertTriangle className="text-blue-600" /> Centro de Reportes</> :
                        activeTab === 'log' ? <><FileText className="text-blue-600" /> Log General</> : null}
                </h3>
              </div>

              {!(['reports', 'log'].includes(activeTab)) && <button
                onClick={() => {
                  resetForm();
                  const roleMap = { users: 'student', modules: 'monitor_academico' };
                  setFormData(prev => ({ ...prev, role: roleMap[activeTab] || 'student' }));
                  setIsNewMonitorOpen(true);
                }}
                className="flex items-center gap-2 px-8 py-3.5 bg-brand-blue text-white rounded-2xl font-black text-xs shadow-lg hover:bg-brand-dark-blue hover:shadow-xl active:scale-95 transition-all text-nowrap"
              >
                <PlusCircle size={16} /> Registrar Miembro
              </button>}
            </div>

            {activeTab === 'users' && (
              <div className="px-8 py-3 bg-white border-b border-gray-100 flex items-center gap-2">
                {[
                  { id: 'student', label: 'Estudiantes' },
                  { id: 'monitor', label: 'Monitores' },
                  { id: 'staff', label: 'Staff (Admin/Dev)' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setMemberSubTab(sub.id)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${memberSubTab === sub.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
            
            {activeTab === 'reports' && (
              <div className="px-8 py-3 bg-white border-b border-gray-100 flex items-center gap-2">
                {[
                  { id: 'pending', label: 'Registros Pendientes' },
                  { id: 'history', label: 'Historial de Soluciones' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setReportSubTab(sub.id)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportSubTab === sub.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

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
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                {activeTab === 'modules' ? (
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
                      {allAdminModules.sort((a, b) => {
                        const aOrph = !(a.monitorId && monitors.some(m => m.id === a.monitorId));
                        const bOrph = !(b.monitorId && monitors.some(m => m.id === b.monitorId));
                        return aOrph - bOrph;
                      }).filter(mod => {
                        const search = searchTerm.toLowerCase();
                        return mod.modulo?.toLowerCase().includes(search) || mod.monitor?.toLowerCase().includes(search) || mod.sede?.toLowerCase().includes(search);
                      }).map(mod => {
                        const monitorExists = mod.monitorId && monitors.some(m => m.id === mod.monitorId);
                        return (
                          <tr key={mod.id} className={`hover:bg-gray-50 transition-all group border-b border-gray-50 ${!monitorExists ? 'opacity-40 grayscale bg-gray-100/50 cursor-not-allowed' : ''}`}>
                            <td className="px-8 py-6">
                              <p className="font-extrabold text-gray-900 group-hover:text-brand-blue transition-colors flex items-center gap-2">
                                {renderSearchHighlight(mod.modulo)}
                                {!monitorExists && <span className="text-[7px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded uppercase font-black">Módulo Huérfano</span>}
                              </p>
                              <p className="text-[9px] text-gray-400 font-black">REF: #{mod.id}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                {monitorExists ? (
                                  <>
                                    <UserAvatar user={{ nombre: mod.monitor, role: 'monitor' }} size="sm" />
                                    <div><p className="text-xs font-black text-gray-700">{renderSearchHighlight(mod.monitor)}</p><p className="text-[9px] text-brand-blue font-bold uppercase italic">Activo</p></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400"><AlertTriangle size={16} /></div>
                                    <div><p className="text-xs font-black text-gray-500">----</p><p className="text-[8px] text-gray-400 font-black uppercase italic">Requiere reasignación</p></div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="space-y-1">
                                <span className="block w-fit px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-black rounded uppercase">{renderSearchHighlight(mod.sede)}</span>
                                <span className="block w-fit px-2 py-0.5 bg-blue-50 text-brand-blue text-[9px] font-black rounded uppercase">{mod.cuatrimestre}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditModule(mod)} className="p-2.5 rounded-xl transition-all text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5"><Edit3 size={18} /></button>
                                <button onClick={() => handleDeleteModule(mod.id)} className="p-2.5 rounded-xl transition-all text-gray-400 hover:text-slate-500 hover:bg-slate-50"><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : activeTab === 'reports' ? (
                  <div className="p-8 space-y-8 animate-slide-up bg-gray-50/30">
                    {/* Header Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pendientes de Revisión</p>
                          <p className="text-3xl font-black text-gray-900">{reports.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                          <AlertTriangle size={24} />
                        </div>
                      </div>
                      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Eventos de reportes</p>
                          <p className="text-3xl font-black text-gray-900">{reportHistoryLogs.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                          <ShieldCheck size={24} />
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      {reportSubTab === 'pending' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="text-blue-500" size={18} /> Casos Reportados
                          </h4>
                          <button onClick={fetchReportsData} className="p-2 text-gray-400 hover:text-brand-blue transition-colors bg-white rounded-xl shadow-sm border border-gray-100">
                            <Clock size={16} />
                          </button>
                        </div>

                        {reports.length === 0 ? (
                          <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-16 text-center shadow-sm">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Check size={32} />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Todo en orden</h3>
                            <p className="text-xs font-bold text-gray-400">No hay reportes pendientes de revisión.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {visibleReports.map(rep => (
                              <div key={rep.id} className="rounded-2xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col bg-white group">
                                {/* Colored header bar */}
                                <div className="bg-gray-800 group-hover:bg-gray-900 px-5 py-3.5 flex justify-between items-center text-white transition-colors duration-300">
                                  <div className="flex items-center gap-2.5">
                                    <AlertTriangle size={16} className="text-blue-400" />
                                    <span className="font-black text-[12px] uppercase tracking-tight">Caso #{rep.id}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${rep.type === 'thread' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-violet-500/30 text-violet-200'}`}>
                                      {rep.type === 'thread' ? 'HILO' : 'MENSAJE'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {rep.modulo_id && rep.chat_id && (
                                      <a
                                        href={`/modules/${rep.modulo_id}/forum?forumId=${rep.chat_id}&reportType=${rep.type}&targetId=${rep.target_id}`}
                                        target="_blank" rel="noreferrer"
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                                        title="Ver en el foro"
                                      >
                                        <MessageSquare size={14} />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Card body */}
                                <div className="p-5 flex flex-col flex-grow space-y-4">
                                  {/* Topic & date */}
                                  <div>
                                    <h5 className="text-sm font-black text-gray-900 line-clamp-1 mb-1">{rep.chat_topic || 'Sin tema'}</h5>
                                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                      <Clock size={10} /> {new Date(rep.created_at).toLocaleString()}
                                    </p>
                                  </div>

                                  {/* Snippet */}
                                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                    <p className="text-[11px] text-gray-500 italic leading-relaxed line-clamp-2">"{rep.content_snippet}"</p>
                                  </div>

                                  {/* Accused & Reporter - prominent section */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-100/80">
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1">
                                        <AlertTriangle size={9} /> Acusado
                                      </p>
                                      <div className="flex items-center gap-2.5">
                                        {rep.reported_photo ? (
                                          <img src={rep.reported_photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 shrink-0" />
                                        ) : (
                                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0 border-2 border-slate-200">
                                            {String(rep.reported_name || 'U').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-[12px] font-black text-gray-900 truncate leading-tight">{rep.reported_name}</p>
                                          <p className="text-[9px] font-bold text-gray-500 uppercase">{rep.reported_role}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100/80">
                                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1">
                                        <ShieldCheck size={9} /> Denunciante
                                      </p>
                                      <div className="flex items-center gap-2.5">
                                        {rep.reporter_photo ? (
                                          <img src={rep.reporter_photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-blue-200 shrink-0" />
                                        ) : (
                                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs shrink-0 border-2 border-blue-200">
                                            {String(rep.reporter_name || 'U').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-[12px] font-black text-gray-900 truncate leading-tight">{rep.reporter_name}</p>
                                          <p className="text-[9px] font-black text-blue-500 uppercase truncate" title={rep.reason}>{rep.reason}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action buttons at bottom */}
                                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                                    {rep.modulo_id && rep.chat_id && (
                                      <a
                                        href={`/modules/${rep.modulo_id}/forum?forumId=${rep.chat_id}&reportType=${rep.type}&targetId=${rep.target_id}`}
                                        target="_blank" rel="noreferrer"
                                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
                                      >
                                        <MessageSquare size={13} /> Ver Foro
                                      </a>
                                    )}
                                    <button
                                      disabled={resolvingReportId === rep.id}
                                      onClick={() => { setResolveTarget(rep); setResolveNote(''); }}
                                      className="flex-1 py-2.5 bg-brand-blue text-white text-[10px] font-black uppercase rounded-xl hover:bg-brand-dark-blue transition-all shadow-md shadow-brand-blue/20 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      {resolvingReportId === rep.id ? '...' : 'Resolver'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {reportPageNumbers.length > 1 && (
                              <div className="col-span-1 lg:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página {reportsPage} de {reportPageNumbers.length}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {reportPageNumbers.map(page => (
                                    <button key={page} onClick={() => setReportsPage(page)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${reportsPage === page ? 'bg-brand-blue text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{page}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      )}

                      {reportSubTab === 'history' && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="text-emerald-500" size={18} /> Historial de Resoluciones
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            {reportHistoryLogs.length} registros
                          </span>
                        </div>

                        {reportHistoryLogs.length === 0 ? (
                          <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-16 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FileText size={32} />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Sin historial</h3>
                            <p className="text-xs font-bold text-gray-400">No hay resoluciones registradas aún.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-h-[700px] overflow-y-auto pr-1">
                            {visibleActivityLogs.map(log => {
                              const meta = parseLogMetadata(log.metadata);
                              const actionLabel = String(log.action || 'REPORTE').replace(/_/g, ' ');
                              const resolvedBy = meta.resolved_by || log.user_name || 'Desconocido';
                              const dateObj = new Date(log.created_at);
                              const dateStr = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
                              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                              return (
                                <div key={log.id} className="rounded-2xl shadow-sm overflow-hidden border border-gray-100 bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col group">
                                  {/* Card header */}
                                  <div className="bg-emerald-600 group-hover:bg-emerald-700 px-4 py-3 flex items-center justify-between text-white transition-colors duration-300">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck size={14} className="text-emerald-200" />
                                      <span className="text-[10px] font-black uppercase tracking-tight">Caso #{log.entity_id || '-'}</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-md">
                                      Resuelto
                                    </span>
                                  </div>

                                  {/* Card body */}
                                  <div className="p-4 flex flex-col flex-grow space-y-3">
                                    {/* Action type */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-black uppercase rounded-md tracking-widest">
                                        {actionLabel}
                                      </span>
                                    </div>

                                    {/* Resolved by & date */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs border-2 border-emerald-200 shrink-0">
                                          {String(resolvedBy).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Resuelto por</p>
                                          <p className="text-[12px] font-black text-gray-900 truncate leading-tight">{resolvedBy}</p>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-[11px] font-black text-gray-700">{dateStr}</p>
                                        <p className="text-[9px] font-bold text-gray-400 flex items-center justify-end gap-1">
                                          <Clock size={9} /> {timeStr}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Resolution note */}
                                    {meta.resolution_note ? (
                                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Nota de resolución</p>
                                        <p className="text-[11px] text-gray-600 leading-relaxed">{meta.resolution_note}</p>
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50/50 p-2.5 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-[10px] text-gray-400 italic text-center">Sin nota de resolución</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {activityLogPageNumbers.length > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página {activityLogPage} de {activityLogPageNumbers.length}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {activityLogPageNumbers.map(page => (
                                <button key={page} onClick={() => setActivityLogPage(page)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${activityLogPage === page ? 'bg-brand-blue text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{page}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'log' ? (
                  <div className="p-8 space-y-6 animate-slide-up">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Auditoria completa</p>
                        <p className="text-sm font-bold text-gray-500">Historial real de acciones sobre reportes y moderacion.</p>
                      </div>
                      <button onClick={fetchReportsData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Clock size={18} /></button>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="divide-y divide-gray-50">
                        {reportHistoryLogs.length === 0 ? (
                          <div className="p-12 text-center text-gray-400 italic text-[10px] font-bold tracking-widest">SIN HISTORIAL DE REPORTES</div>
                        ) : (
                          visibleActivityLogs.map(log => {
                            const meta = parseLogMetadata(log.metadata);
                            const metaText = Object.entries(meta).slice(0, 4).map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : value)).join(' | ');
                            return (
                              <div key={log.id} className="p-5 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <p className="text-[11px] font-black text-gray-900 uppercase">{log.action || 'ACCION'} #{log.entity_id || '-'}</p>
                                    <p className="text-[10px] font-bold text-gray-500">{log.user_name || 'Sistema'} <span className="text-gray-300">/</span> {log.user_role || 'sin rol'} <span className="text-gray-300">/</span> {log.entity_type || '-'}</p>
                                    {metaText && <p className="text-[10px] text-gray-500 truncate" title={metaText}>{renderSearchHighlight(metaText)}</p>}
                                  </div>
                                  <time className="text-[9px] font-black text-gray-400 uppercase whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    {activityLogPageNumbers.length > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagina {activityLogPage} de {activityLogPageNumbers.length}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activityLogPageNumbers.map(page => (<button key={page} onClick={() => setActivityLogPage(page)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${activityLogPage === page ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{page}</button>))}
                        </div>
                      </div>
                    )}
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
                      {(memberSubTab === 'student' ? students : memberSubTab === 'monitor' ? monitors : [...admins, ...devs]).filter(u => {
                        const search = searchTerm.toLowerCase();
                        return u.nombre?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search) || u.username?.toLowerCase().includes(search);
                      }).map(user => {
                        const isBlocked = user.is_active === 0;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50 transition-all">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <UserAvatar user={user} size="md" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-extrabold text-gray-900">{renderSearchHighlight(user.nombre)}</p>
                                    {session.id === user.id ? (
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded">Tu perfil</span>
                                    ) : user.role === 'dev' ? (
                                      <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[8px] font-black uppercase rounded">Protegido</span>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase italic">ID: {user.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6"><span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider italic">@{user.username}</span></td>
                            <td className="px-8 py-6">
                              {isBlocked ? (
                                <span className="w-fit px-3 py-1 bg-slate-50 text-slate-600 text-[9px] font-black rounded-lg uppercase flex items-center gap-1.5"><Lock size={10} /> Suspendido</span>
                              ) : (
                                <span className="w-fit px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-lg uppercase flex items-center gap-1.5"><Check size={10} /> Certificado</span>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {session.id === user.id ? (
                                  <span className="px-3 py-1.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-xl border border-blue-200 shadow-sm">Tu Perfil Actual</span>
                                ) : user.role === 'dev' ? (
                                  <>
                                    <button onClick={() => openUserStatsModal(user)} title="Ver Estadísticas" className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-brand-blue bg-white shadow-sm mr-2 hover:shadow"><BarChart3 size={16} /></button>
                                    <span className="px-3 py-1.5 bg-violet-100 text-violet-600 text-[10px] font-black uppercase rounded-xl border border-violet-200 shadow-sm">Desarrollador Protegido</span>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => openUserStatsModal(user)} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-brand-blue"><BarChart3 size={16} /></button>
                                    <button onClick={() => handleEditUser(user)} className="p-2.5 text-gray-400 hover:text-brand-blue rounded-xl"><Edit3 size={18} /></button>
                                    <button onClick={() => { setStatusTarget(user); setIsStatusModalOpen(true); }} className={`p-2.5 rounded-xl ${isBlocked ? 'text-slate-500 bg-slate-50' : 'text-green-500 bg-green-50'}`}>{isBlocked ? <Lock size={18} /> : <Unlock size={18} />}</button>
                                    <button onClick={() => openDeleteConfirm(user, user.role)} className="p-2.5 text-gray-400 hover:text-slate-500 rounded-xl"><Trash2 size={18} /></button>
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
        )}
      </div>

      {/* Modals placed outside main container for clarity and to avoid nesting errors */}

      {/* Resolve Report Modal */}
      <Modal isOpen={!!resolveTarget} onClose={() => { setResolveTarget(null); setResolveNote(''); }} title="Resolver Reporte">
        {resolveTarget && (
          <div className="space-y-5 py-2">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-widest ${resolveTarget.type === 'thread' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600'}`}>
                  {resolveTarget.type === 'thread' ? 'Hilo' : 'Mensaje'}
                </span>
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[8px] font-black uppercase rounded-md tracking-widest">
                  Caso #{resolveTarget.id}
                </span>
              </div>
              <p className="text-sm font-black text-gray-900">{resolveTarget.chat_topic || 'Sin tema'}</p>
              {resolveTarget.content_snippet && (
                <p className="text-xs text-gray-500 italic line-clamp-2 bg-white p-3 rounded-xl border border-gray-100">"{resolveTarget.content_snippet}"</p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[9px] border border-slate-200 shrink-0">
                    {String(resolveTarget.reported_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Acusado</p>
                    <p className="text-[10px] font-black text-gray-900 truncate">{resolveTarget.reported_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[9px] border border-blue-200 shrink-0">
                    {String(resolveTarget.reporter_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Denunciante</p>
                    <p className="text-[10px] font-black text-gray-900 truncate">{resolveTarget.reporter_name}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Motivo de Resolución *</label>
              <textarea
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                placeholder="Describe la acción tomada y el motivo de la resolución..."
                className="w-full h-28 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/30 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setResolveTarget(null); setResolveNote(''); }}
                className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={!resolveNote.trim() || resolvingReportId === resolveTarget.id}
                onClick={() => handleResolveReport(resolveTarget.id, resolveNote)}
                className="flex-1 py-4 bg-brand-blue text-white font-black rounded-2xl shadow-lg shadow-brand-blue/20 hover:bg-brand-dark-blue transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolvingReportId === resolveTarget.id ? 'Resolviendo...' : 'Confirmar Resolución'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isNewMonitorOpen} onClose={() => { setIsNewMonitorOpen(false); resetForm(); }} title="Registrar en Sistema Central">
        <form onSubmit={handleCreate} className="space-y-5 py-2">
          <InputField label="Cargo Institucional" type="select" value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            options={[{ value: 'student', label: 'Estudiante' }, { value: 'monitor_academico', label: 'Monitor Académico' }, { value: 'admin', label: 'Administrador' }]} />
          <InputField label="Nombre" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
          <InputField label="Usuario ID" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          <InputField label="Correo Institucional" icon={<Mail />} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <InputField label="Contraseña" icon={<Lock />} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          <button type="submit" className="w-full py-5 bg-brand-blue text-white font-black rounded-2xl shadow-xl">Sincronizar Datos</button>
        </form>
      </Modal>

      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Modificar Entidad">
        <form onSubmit={confirmUpdateUser} className="space-y-5 py-2">
          {session.id === selectedUser?.id ? (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] font-bold text-blue-700 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="shrink-0 mt-0.5" size={14} />
              No puedes editar tu propio perfil desde el panel administrativo. Por favor usa la sección Mi Perfil.
            </div>
          ) : (
            <>
              {(session.role === 'dev' && selectedUser?.role === 'dev') && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                  <Lock className="shrink-0 mt-0.5" size={14} />
                  No tienes autorización para editar otros perfiles de desarrollador.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nombre" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                <InputField label="Usuario" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <InputField label="Correo Institucional" icon={<Mail />} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Cargo" type="select" options={[{ value: 'student', label: 'Estudiante' }, { value: 'monitor_academico', label: 'Monitor' }, { value: 'admin', label: 'Admin' }, { value: 'dev', label: 'Developer' }]} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} />
                <InputField label="Sede" type="select" options={dbSedes.map(s => ({ value: s, label: s }))} value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })} />
              </div>
              <InputField label="Ciclo" type="select" options={dbCuatrimestres.map(c => ({ value: c, label: c }))} value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })} />
              <InputField label="Restablecer Contraseña" icon={<Lock />} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Dejar Vacío para mantener actual" />

              <button
                type="submit"
                disabled={session.role === 'dev' && selectedUser?.role === 'dev'}
                className={`w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl transition-all ${session.role === 'dev' && selectedUser?.role === 'dev' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'}`}
              >
                Actualizar Registro Permanente
              </button>
            </>
          )}
        </form>
      </Modal>

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Seguridad Institucional">
        <div className="space-y-6 py-4">
          <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
            <UserAvatar user={statusTarget} size="md" />
            <div>
              <p className="text-sm font-black text-gray-900">{statusTarget?.nombre}</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{statusTarget?.role}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Restricciones de Operación</p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'login', label: 'Bloquear Inicio de Sesión', icon: Lock, color: 'text-slate-600', bg: 'bg-slate-50' },
                { id: 'dashboards', label: 'Restringir Paneles (Admin/Mon)', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'modules', label: 'Bloquear Gestión de Módulos', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'profile', label: 'Bloquear Edición de Perfil', icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setLocalRestrictions(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${localRestrictions[item.id] ? `border-${item.color.split('-')[1]}-200 ${item.bg}` : 'border-gray-50 bg-gray-50/50 hover:border-gray-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className={localRestrictions[item.id] ? item.color : 'text-gray-400'} />
                    <span className={`text-xs font-black ${localRestrictions[item.id] ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${localRestrictions[item.id] ? `bg-${item.color.split('-')[1]}-600 border-transparent` : 'border-gray-200'}`}>
                    {localRestrictions[item.id] && <Check size={12} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={async () => {
                try {
                  const payload = {
                    is_active: localRestrictions.login ? 0 : 1,
                    restrictions: JSON.stringify(localRestrictions),
                    currentUserId: session.id
                  };
                  await updateUser(statusTarget.id, payload);
                  fetchData();
                  setIsStatusModalOpen(false);
                  showToast('Seguridad actualizada', 'success');
                } catch (err) {
                  showToast(err.message || 'Error al guardar', 'error');
                }
              }}
              className="w-full py-5 bg-brand-blue text-white font-black rounded-[24px] shadow-2xl hover:bg-brand-dark-blue active:scale-95 transition-all"
            >
              Aplicar Restricciones
            </button>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="w-full py-4 text-gray-400 font-black text-xs uppercase"
            >
              Descartar
            </button>
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
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${userStatsTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="bg-slate-50 rounded-3xl p-6 border border-gray-200 space-y-6">
              <StatMetricCard icon={UserCheck} label="Usuario" value={userStatsModal.user.nombre || 'N/A'} color="text-gray-900" />
              {userStatsTab === 'personal' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><BookOpen size={12} /> Actividad académica</p>
                      <div className="grid grid-cols-2 gap-3">
                        <StatMetricCard icon={Check} label="Asistencias" value={num(userStatsModal.data?.academic?.total_assistances)} color="text-emerald-600" />
                        <StatMetricCard icon={AlertTriangle} label="Ausencias" value={num(userStatsModal.data?.academic?.total_absences)} color="text-slate-600" />
                        <StatMetricCard icon={Info} label="Excusas" value={num(userStatsModal.data?.academic?.total_excuses)} color="text-blue-600" />
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
          <div className="bg-slate-50 p-10 rounded-[40px] inline-block text-slate-600 animate-bounce">
            <AlertTriangle size={80} />
          </div>
          <div className="space-y-3">
            <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">¿Expulsar a {deleteTarget?.user.nombre}?</p>
            <p className="text-gray-400 font-bold text-sm max-w-xs mx-auto">Esta acción revoca todos los permisos y borra el historial de forma irreversible.</p>
          </div>
          {(deleteTarget?.user.role === 'admin' || deleteTarget?.user.role === 'dev' || deleteTarget?.user.is_principal) && !session?.is_principal ? (
            <div className="px-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 font-bold text-xs leading-relaxed">
              Este usuario tiene un rol protegido. Solo el administrador principal puede eliminar cuentas administrativas o de desarrollo.
            </div>
          ) : (
            <div className="px-6 flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full py-5 bg-slate-600 text-white font-black rounded-3xl shadow-2xl hover:bg-slate-700">Confirmar Expulsión Permanente</button>
              <button onClick={() => setIsConfirmDeleteOpen(false)} className="w-full py-5 bg-white text-gray-400 font-black border-2 border-gray-100 rounded-3xl">Desistir</button>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isEditModuleOpen} onClose={() => setIsEditModuleOpen(false)} title="Gobernanza de Módulo">
        <form onSubmit={confirmUpdateModule} className="space-y-5 py-2">
          <div className="bg-brand-blue/5 p-5 rounded-3xl border border-brand-blue/10">
            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShieldCheck size={12} /> Seguridad Administrativa</p>
            <p className="text-[11px] text-brand-blue/80 font-bold leading-relaxed italic">Reasignar titularidad de Monitoría en caso de deserción o error.</p>
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
      <Modal isOpen={isConfirmDeleteModuleOpen} onClose={() => setIsConfirmDeleteModuleOpen(false)} title="Confirmar Eliminación de Módulo">
        <div className="space-y-4 py-2">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0 mt-0.5"><Lock size={18} /></div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900">¿Estás absolutamente seguro?</p>
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                Esta acción eliminará permanentemente el módulo y desvinculará a los estudiantes. No se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsConfirmDeleteModuleOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all">Cancelar</button>
            <button onClick={executeDeleteModule} className="flex-1 py-4 bg-slate-600 text-white font-black rounded-2xl shadow-lg shadow-red-200 hover:bg-slate-700 transition-all">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;


