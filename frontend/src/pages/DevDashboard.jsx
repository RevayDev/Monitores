import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Shield, Globe, Users, BookOpen, UserPlus, LogIn, Activity, AlertTriangle, Edit3, Trash2, Mail, Lock, PlusCircle, ShieldCheck, UserCheck, MapPin } from 'lucide-react';
import { 
  getMaintenanceConfig, setMaintenanceConfig, getAllUsers, 
  createUser, updateUser, deleteUser, getSedes, getCuatrimestres,
  resetScans
} from '../services/api';
import Modal from '../components/Modal';
import { ToastContext } from '../App';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';

const DevDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [config, setConfig] = useState({
    global: false,
    registro: false,
    login: false,
    panelAdmin: false,
    panelMonitor: false,
    monitorias: false
  });
  const [devs, setDevs] = useState([]);
  const [currentUser, setCurrentUser] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedDev, setSelectedDev] = useState(null);
  
  // DB Data
  const [dbSedes, setDbSedes] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);

  // Form
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    sede: '',
    cuatrimestre: '',
    foto: '',
    is_principal: false
  });

  useEffect(() => {
    const rawSession = localStorage.getItem('monitores_current_role');
    const session = JSON.parse(rawSession || '{}');
    if (!session || (session.baseRole !== 'dev' && session.role !== 'dev')) {
      showToast(`Acceso denegado`, 'error');
      navigate('/');
      return;
    }
    setCurrentUser(session);
    
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [freshConfig, users, sedes, cuats] = await Promise.all([
        getMaintenanceConfig(),
        getAllUsers(),
        getSedes(),
        getCuatrimestres()
      ]);
      if (freshConfig) setConfig(freshConfig);
      setDevs(users.filter(u => u.baseRole === 'dev' || u.role === 'dev'));
      setDbSedes(sedes || []);
      setDbCuatrimestres(cuats || []);
    } catch (error) {
      console.error("Error fetching dev data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      await resetScans();
      showToast('Todos los registros QR han sido eliminados correctamente', 'success');
      setIsResetModalOpen(false);
    } catch (error) {
      showToast(error.message || 'Error al resetear datos', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggle = async (key) => {
    const newConfig = { ...config, [key]: !config[key] };
    
    if (key === 'global') {
      Object.keys(newConfig).forEach(k => newConfig[k] = newConfig.global);
    } else {
      const allOthersOn = Object.keys(newConfig).filter(k => k !== 'global').every(k => newConfig[k]);
      newConfig.global = allOthersOn;
    }

    setConfig(newConfig);
    await setMaintenanceConfig(newConfig);
    showToast(`Estado de mantenimiento actualizado`, 'success');
  };

  const handleOpenAdd = () => {
    setSelectedDev(null);
    setFormData({
      nombre: '',
      username: '',
      email: '',
      password: '',
      sede: dbSedes[0] || '',
      cuatrimestre: dbCuatrimestres[0] || '',
      foto: '',
      is_principal: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dev) => {
    setSelectedDev(dev);
    setFormData({
      nombre: dev.nombre,
      username: dev.username,
      email: dev.email,
      password: '',
      sede: dev.sede || dbSedes[0] || '',
      cuatrimestre: dev.cuatrimestre || dbCuatrimestres[0] || '',
      foto: dev.foto || '',
      is_principal: dev.is_principal
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDev) {
        const payload = { ...formData, currentUserId: currentUser.id };
        if (!payload.password) delete payload.password;
        await updateUser(selectedDev.id, payload);
        showToast('Desarrollador actualizado', 'success');
      } else {
        await createUser({ ...formData, role: 'dev', baseRole: 'dev', currentUserId: currentUser.id });
        showToast('Desarrollador creado', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(selectedDev.id, { currentUserId: currentUser.id });
      showToast('Desarrollador eliminado', 'success');
      setIsDeleteOpen(false);
      fetchData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const SwitchCard = ({ id, label, description, icon, isGlobal = false }) => (
    <div className={`p-6 rounded-[24px] border-2 transition-all flex items-center justify-between ${
      config[id] 
        ? 'bg-red-50/50 border-red-500/20 shadow-lg shadow-red-500/5' 
        : 'bg-white border-transparent hover:border-gray-100 shadow-sm'
    }`}>
      <div className="flex gap-4 items-center">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
          config[id] ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-gray-100 text-gray-500'
        }`}>
          {icon}
        </div>
        <div>
          <h3 className={`font-black text-lg ${config[id] ? 'text-red-700' : 'text-gray-900'}`}>
            {label}
          </h3>
          <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{description}</p>
        </div>
      </div>
      
      <button 
        onClick={() => handleToggle(id)}
        className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out border-2 ${
          config[id] ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-200'
        }`}
      >
        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
          config[id] ? 'translate-x-8' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="bg-purple-600 rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-900/40 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10 flex gap-5 items-center w-full">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-black overflow-hidden shadow-2xl bg-purple-700/50 backdrop-blur-md ring-4 ring-white/20`}>
              <Wrench size={48} className="text-purple-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 backdrop-blur-sm border border-white/10">
                <Activity size={10} className="text-purple-200" />
                <span className="text-purple-100">Centro de Control</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-none mb-1.5">
                Panel de Desarrollador
              </h1>
              <p className="text-purple-200 text-sm font-medium max-w-lg leading-snug">
                Administra el estado de la aplicación. Bloquea el acceso a secciones específicas durante mantenimientos o actualizaciones. Como DEV, los bloqueos no te afectarán.
              </p>
            </div>
          </div>
        </div>

        {/* Global Control */}
        <div className="grid grid-cols-1">
          <SwitchCard 
            id="global" 
            label="Mantenimiento Global" 
            description="Cerrar el acceso a toda la plataforma" 
            icon={<Globe size={24} />}
            isGlobal={true}
          />
        </div>

        {/* Modular Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SwitchCard 
            id="login" 
            label="Inicio de Sesión" 
            description="Bloquear acceso a cuentas" 
            icon={<LogIn size={24} />}
          />
          <SwitchCard 
            id="registro" 
            label="Registro Estudiantil" 
            description="Suspender creación de cuentas" 
            icon={<UserPlus size={24} />}
          />
          <SwitchCard 
            id="monitorias" 
            label="Sistema de Monitorías" 
            description="Búsqueda e inscripción a clases" 
            icon={<BookOpen size={24} />}
          />
          <SwitchCard 
            id="panelAdmin" 
            label="Panel de Administración" 
            description="Acceso a gestionar reportes y usuarios" 
            icon={<Shield size={24} />}
          />
          <SwitchCard 
            id="panelMonitor" 
            label="Panel de Monitores" 
            description="Gestión de clases y asistencias" 
            icon={<Users size={24} />}
          />
        </div>

        {config.global && (
          <div className="bg-red-50 border-2 border-red-500/20 p-6 rounded-[24px] flex items-start gap-4 animate-scale-in">
            <AlertTriangle className="text-red-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-red-800 font-black text-lg">Alerta de Sistema Desconectado</h3>
              <p className="text-red-600/80 font-medium text-sm mt-1">
                La plataforma entera está actualmente inaccesible para estudiantes, monitores y administradores. 
                Cualquier intento de navegación los devolverá a la página de inicio.
              </p>
            </div>
          </div>
        )}

        {/* Developer Management Section */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gestión de Desarrolladores</h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Control de acceso nivel ROOT</p>
              </div>
            </div>
            {currentUser.is_principal && (
              <button 
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-purple-600/20 hover:bg-purple-700 active:scale-95 transition-all text-sm"
              >
                <PlusCircle size={18} /> <span>Nuevo Developer</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devs.map(dev => (
              <div key={dev.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-purple-500/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar user={dev} size="md" />
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight mb-1">{dev.nombre}</h4>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">{dev.email}</span>
                        {dev.is_principal && (
                          <span className="w-fit text-[8px] font-black uppercase tracking-[2px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1.5">Lead / Principal</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {currentUser.is_principal && (
                      <>
                        <button onClick={() => handleOpenEdit(dev)} className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50">
                          <Edit3 size={18} />
                        </button>
                        {!dev.is_principal && dev.id !== currentUser.id && (
                          <button onClick={() => { setSelectedDev(dev); setIsDeleteOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Reset Utility (Dev Only) */}
        <div className="bg-red-50/50 border-2 border-dashed border-red-200 rounded-[32px] p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Trash2 size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-red-900">Utilidad de Limpieza</h2>
            <p className="text-sm font-medium text-red-600/70 max-w-md mx-auto">
              Borra todos los registros de asistencia, almuerzos y logs de escaneo. 
              Esta acción es permanente y se usa principalmente para pruebas.
            </p>
          </div>
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="px-8 py-3 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-500/20"
          >
            Borrar Todos los Registros QR
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDev ? "Editar Developer" : "Registrar Developer"}>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Nombre Completo" icon={<Users />} value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <InputField label="Username" icon={<UserCheck />} value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <InputField label="Email Institucional" icon={<Mail />} type="email" value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })} />
          
          <InputField label="Contraseña (Mín. 6 carc.)" icon={<Lock />} type="password" value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 font-bold">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sede</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-gray-900 font-bold" 
                value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })}>
                {dbSedes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 font-bold">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuatrimestre</label>
              <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-gray-900 font-bold"
                value={formData.cuatrimestre} onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}>
                {dbCuatrimestres.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <input 
              type="checkbox" 
              id="is_principal"
              checked={formData.is_principal} 
              onChange={e => setFormData({...formData, is_principal: e.target.checked})}
              className="w-5 h-5 accent-purple-600 rounded"
            />
            <label htmlFor="is_principal" className="text-sm font-black text-purple-700 select-none cursor-pointer">Otorgar permisos de Principal / Lider</label>
          </div>

          <button type="submit" className="w-full py-5 bg-purple-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-purple-700 transition-all">
            {selectedDev ? "Guardar Cambios" : "Crear Developer"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="¿Confirmar Eliminación?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-2xl inline-block text-red-600 animate-pulse">
            <AlertTriangle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">Eliminar a <br /><span className="text-red-600 font-black">{selectedDev?.nombre}</span></p>
            <p className="text-gray-500 font-medium">Esta acción deshabilitará el acceso de este desarrollador permanentemente.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleDelete} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-all text-sm uppercase tracking-widest">
              Confirmar Eliminación
            </button>
            <button onClick={() => setIsDeleteOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="¿BORRAR TODOS LOS DATOS?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-600 p-6 rounded-2xl inline-block text-white shadow-2xl shadow-red-600/30">
            <AlertTriangle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight tracking-tighter uppercase">ATENCIÓN: ELIMINACIÓN MASIVA</p>
            <p className="text-gray-500 font-medium">Se borrarán permanentemente todas las asistencias, almuerzos y logs de escaneo del sistema. Esta acción NO se puede deshacer.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleResetData}
              disabled={isResetting}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {isResetting ? 'Borrando...' : 'Sí, borrar todo permanentemente'}
            </button>
            <button onClick={() => setIsResetModalOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default DevDashboard;
