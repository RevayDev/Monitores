import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Shield, Globe, Users, BookOpen, UserPlus, LogIn, Activity, AlertTriangle } from 'lucide-react';
import { getMaintenanceConfig, setMaintenanceConfig } from '../services/api';
import { ToastContext } from '../App';

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

  useEffect(() => {
    const rawSession = localStorage.getItem('monitores_current_role');
    const session = JSON.parse(rawSession || '{}');
    if (!session || (session.baseRole !== 'dev' && session.role !== 'dev')) {
      showToast(`Acceso denegado. Sesión leída: ${rawSession}`, 'error');
      navigate('/');
      return;
    }
    
    // Prevent crash if getMaintenanceConfig returns null
    const freshConfig = getMaintenanceConfig() || {
      global: false, registro: false, login: false, panelAdmin: false, panelMonitor: false, monitorias: false
    };
    setConfig(freshConfig);
  }, [navigate]);

  const handleToggle = async (key) => {
    const newConfig = { ...config, [key]: !config[key] };
    
    // If turning on global, turn everything else on. If turning off global, turn everything else off.
    if (key === 'global') {
      Object.keys(newConfig).forEach(k => newConfig[k] = newConfig.global);
    } else {
      // If any individual switch is turned off, global should be off.
      // If all individual switches are turned on, global should be on.
      const allOthersOn = Object.keys(newConfig).filter(k => k !== 'global').every(k => newConfig[k]);
      newConfig.global = allOthersOn;
    }

    setConfig(newConfig);
    await setMaintenanceConfig(newConfig);
    showToast(`Estado de mantenimiento actualizado`, 'success');
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
            <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Wrench size={24} className="text-white" />
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
      </div>
    </div>
  );
};

export default DevDashboard;
