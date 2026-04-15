import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Wrench, Shield, Globe, Users, BookOpen, UserPlus, LogIn, Activity, AlertTriangle, Edit3, Trash2, Mail, Lock, PlusCircle, ShieldCheck, UserCheck, MapPin } from 'lucide-react';
import {
  getMaintenanceConfig, setMaintenanceConfig, getAllUsers,
  createUser, updateUser, deleteUser, getSedes, getCuatrimestres,
  resetScans, dbReset, dbPopulate, fixUsernames, getDiagnostics, executeTerminalCommand
} from '../services/api';
import Modal from '../components/Modal';
import { ToastContext } from '../context/ToastContext';
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
  const [shellLogs, setShellLogs] = useState([
    { id: 1, type: 'info', text: 'Terminal Interactiva inicializada. Esperando comandos...', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [serverLogs, setServerLogs] = useState([]);
  const [terminalCwd, setTerminalCwd] = useState('');
  const [activeTermTab, setActiveTermTab] = useState('terminal');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCompMapOpen, setIsCompMapOpen] = useState(false);
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

  const [activeTab, setActiveTab] = useState('config'); // 'config', 'devs', 'utils'
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);

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

    // Hook Frontend console overrides
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    const ingestClientLog = (type, args) => {
      const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      setServerLogs(prev => [...prev, { id: Date.now() + Math.random(), type, text: `[FRNT] ${text}`, timestamp: new Date().toLocaleTimeString() }].slice(-250));
    };

    console.log = (...args) => { ingestClientLog('info', args); originalConsoleLog(...args); };
    console.warn = (...args) => { ingestClientLog('warn', args); originalConsoleWarn(...args); };
    console.error = (...args) => { ingestClientLog('error', args); originalConsoleError(...args); };

    // Setup Socket Connection for Live Logs
    const newSocket = io('http://localhost:3000');
    newSocket.emit('join_dev_console');
    newSocket.on('backend_log', (log) => {
      setServerLogs(prev => {
        const newLogs = [...prev, { id: Date.now() + Math.random(), type: log.type, text: `[BACK] ${log.text}`, timestamp: log.timestamp }];
        return newLogs.slice(-250);
      });
    });

    return () => {
      newSocket.disconnect();
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
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

  const addLog = (text, type = 'info') => {
    setShellLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), type, text, timestamp: new Date().toLocaleTimeString() }
    ]);
  };

  const clearLogs = () => {
    setShellLogs([{ id: Date.now(), type: 'info', text: 'Consola limpiada...', timestamp: new Date().toLocaleTimeString() }]);
  };

  const runUtility = async (func, setLoading, successMsg, actionName) => {
    try {
      setLoading(true);
      addLog(`[INICIO] Ejecutando: ${actionName}...`, 'info');
      const res = await func();
      addLog(`[ÉXITO] ${res.message || successMsg}`, 'success');
      showToast(res.message || successMsg, 'success');
      if (res.status === 'healthy') {
        setDiagnostics(res);
        addLog(`[DIAG] Latencia: ${res.latency} | Usuarios: ${res.stats.users}`, 'info');
      }
    } catch (error) {
      addLog(`[ERROR] ${error.message}`, 'error');
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const LiveTerminal = () => {
    const scrollRef = React.useRef(null);
    const [command, setCommand] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(0);

    const availableCommands = [
      'help', 'clear', 'ping', 'diagnostics',
      'populate', 'fix_users', 'wipe_db',
      'ls', 'tree', 'pwd', 'sysinfo', 'cd'
    ];

    const filteredSuggestions = availableCommands.filter(
      cmd => cmd.toLowerCase().includes(command.toLowerCase())
    );

    useEffect(() => {
      // Hacemos scroll al final instantáneo sin barrido
      if (scrollRef.current) {
        scrollRef.current.style.scrollBehavior = 'auto';
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [shellLogs, serverLogs, activeTermTab]);

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (showSuggestions && filteredSuggestions.length > 0) {
          setCommand(filteredSuggestions[activeSuggestion]);
          setShowSuggestions(false);
        }
      } else if (e.key === 'ArrowDown') {
        if (showSuggestions) {
          e.preventDefault();
          setActiveSuggestion(prev => (prev + 1) % filteredSuggestions.length);
        }
      } else if (e.key === 'ArrowUp') {
        if (showSuggestions) {
          e.preventDefault();
          setActiveSuggestion(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        }
      }
    };

    const handleCommandSubmit = async (e) => {
      e.preventDefault();
      if (!command.trim()) return;

      const fullCommand = command.trim();
      const parts = fullCommand.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');
      
      addLog(`$ ${fullCommand}`, 'info');
      setCommand('');

      switch (cmd) {
        case 'help':
          addLog('Comandos: clear, ping, diagnostics, populate, fix_users, wipe_db, ls, cd, pwd, sysinfo', 'success');
          break;
        case 'clear':
          clearLogs();
          break;
        case 'ping':
          addLog('pong', 'success');
          break;
        case 'diagnostics':
          runUtility(getDiagnostics, setIsFixing, 'Test completado satisfactoriamente', 'Diagnóstico Global');
          break;
        case 'populate':
          runUtility(dbPopulate, setIsPopulating, 'Datos de prueba generados', 'Poblado de Base de Datos');
          break;
        case 'fix_users':
          runUtility(fixUsernames, setIsFixing, 'Nombres de usuario corregidos', 'Reparación de Usernames');
          break;
        case 'wipe_db':
          setIsResetModalOpen(true);
          addLog('Atención: Confirmación de borrado requerida en la interfaz.', 'warn');
          break;
        case 'cd':
        case 'ls':
        case 'tree':
        case 'pwd':
        case 'cwd':
        case 'sysinfo':
          try {
            const res = await executeTerminalCommand(fullCommand, terminalCwd);
            if (res.newCwd) setTerminalCwd(res.newCwd);
            if (res.result) addLog(res.result, 'info');
          } catch (err) {
            addLog(`Error al ejecutar backend: ${err.message}`, 'error');
          }
          break;
        default:
          addLog(`Comando no reconocido: ${cmd}. Escribe 'help' para ver la lista.`, 'error');
      }
    };

    return (
      <div className="w-full space-y-4">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mt-2 animate-fade-in group flex flex-col">
          <div className="bg-gray-50/80 px-4 flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 backdrop-blur-sm gap-2">
            <div className="flex gap-4 pt-4 sm:pt-0">
              <button
                onClick={() => setActiveTermTab('terminal')}
                className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${activeTermTab === 'terminal' ? 'border-violet-500 text-violet-600 bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Terminal
              </button>
              <button
                onClick={() => setActiveTermTab('logs')}
                className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${activeTermTab === 'logs' ? 'border-emerald-500 text-emerald-600 bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Outputs / Logs
              </button>
            </div>
            <div className="flex gap-1.5 pb-3 sm:pb-0 pt-2 sm:pt-0 ml-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm"></div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="p-6 h-[400px] overflow-y-auto font-mono text-[12px] space-y-2 bg-white flex-grow relative"
          >
            {(activeTermTab === 'terminal' ? shellLogs : serverLogs).map(log => (
              <div key={log.id} className="flex gap-3 items-start animate-fade-in border-b border-gray-50 pb-1.5 last:border-0 hover:bg-gray-50/50 rounded-lg p-1 transition-colors">
                <div className="flex items-center gap-2 shrink-0 select-none">
                  <span className="text-gray-400 text-[11px]">[{log.timestamp}]</span>
                  <div className={`w-[2px] h-3 ml-1 ${
                    log.type === 'error' ? 'bg-red-500' :
                    log.type === 'success' ? 'bg-emerald-500' :
                    'bg-blue-400'
                  }`} />
                </div>
                <pre className={`whitespace-pre-wrap font-mono text-[11px] leading-relaxed break-all flex-grow ${
                  log.type === 'error' ? 'text-red-600 font-bold bg-red-50 px-1.5 rounded' : 
                  log.type === 'warn' ? 'text-amber-600 font-bold bg-amber-50 px-1.5 rounded' :
                  log.type === 'success' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded' :
                  'text-gray-700 font-medium'
                }`}>
                  {log.text}
                </pre>
              </div>
            ))}
            {activeTermTab === 'logs' && serverLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center p-10 opacity-30">
                <Activity size={32} className="text-emerald-600 mb-2 animate-pulse" />
                <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Esperando logs de Frontend & Backend...</span>
              </div>
            )}
          </div>

          {/* Form Pinned to Bottom (Only on Terminal tab) */}
          {activeTermTab === 'terminal' && (
            <div className="bg-gray-50 border-t border-gray-100 p-4 relative">
              <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 text-gray-700 bg-white border border-gray-200 p-2.5 rounded-xl focus-within:border-brand-blue/40 focus-within:ring-4 focus-within:ring-brand-blue/10 transition-all shadow-sm">
                <span className="text-violet-500 font-black ml-2">$</span>
                <span className="text-gray-400 font-bold text-[11px] select-none shrink-0 truncate max-w-[120px]" title={terminalCwd || '~/backend'}>{terminalCwd ? terminalCwd.split(/[\\/]/).pop() : '~/bck'}</span>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => {
                    setCommand(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                    setActiveSuggestion(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-grow bg-transparent outline-none font-mono text-[13px] text-gray-900 placeholder-gray-300 font-bold"
                  placeholder="Escribe un comando... (ej. help)"
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                />
              </form>
              {/* Autocomplete Menu Light Theme */}
              {showSuggestions && filteredSuggestions.length > 0 && command.trim() && (
                <div className="absolute bottom-full left-4 mb-2 w-72 bg-white text-gray-900 border border-gray-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden animate-fade-in z-50 py-1">
                  <div className="px-3 py-2 border-b border-gray-100 text-[10px] uppercase font-black tracking-widest text-violet-600 bg-violet-50 flex items-center justify-between">
                    <span>Comandos Sugeridos</span>
                    <span className="bg-violet-200/50 text-violet-700 px-1.5 rounded flex items-center gap-1"><span className="text-[8px]">⌨</span> TAB</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`px-4 py-2.5 cursor-pointer font-mono text-xs transition-colors flex items-center justify-between border-b border-gray-50 last:border-0 ${index === activeSuggestion ? 'bg-violet-50 text-violet-700 font-bold' : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        onClick={() => {
                          setCommand(suggestion);
                          setShowSuggestions(false);
                          document.querySelector('form input').focus();
                        }}
                      >
                        <span>{suggestion}</span>
                        {index === activeSuggestion && <span className="text-[10px] bg-violet-200/50 text-violet-700 font-black px-1.5 py-0.5 rounded shadow-sm">↵</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Available Commands Grid Below Terminal */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="text-violet-500" size={18} />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Catálogo de Comandos del Sistema</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCommands.map(cmd => (
              <div key={cmd} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-600 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-colors cursor-default">
                $ {cmd}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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

  const SwitchCard = ({ id, label, description, icon }) => (
    <div className={`p-6 rounded-[24px] border-2 transition-all flex items-center justify-between ${config[id]
      ? 'bg-red-50/50 border-red-500/20 shadow-lg shadow-red-500/5'
      : 'bg-white border-transparent hover:border-gray-100 shadow-sm'
      }`}>
      <div className="flex gap-4 items-center">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${config[id] ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-gray-100 text-gray-500'
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
        className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out border-2 ${config[id] ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-200'
          }`}
      >
        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${config[id] ? 'translate-x-8' : 'translate-x-0'
          }`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray p-4 sm:p-6 md:p-10 pb-32">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Redesigned Header Dev Console (Premium Compact - Solid Violet) */}
        <div className="bg-violet-700 rounded-[32px] p-4 md:p-7 text-white relative overflow-hidden shadow-[0_20px_40px_rgba(124,58,237,0.2)] flex flex-col items-center justify-between gap-6 transition-all duration-700">
          {/* Enhanced Background Accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-[40px]"></div>

          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-fuchsia-400 rounded-2xl blur opacity-20 transition duration-1000"></div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black overflow-hidden shadow-xl bg-indigo-900/40 backdrop-blur-xl ring-2 ring-white/20 transition-transform duration-500 hover:rotate-3">
                  <Wrench size={36} className="text-indigo-50" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(129,140,248,1)]"></div>
                  <span className="text-indigo-50 text-[9px] font-black uppercase tracking-[0.15em]">Super Admin / Root</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight drop-shadow-sm">
                  Developer Console
                </h1>
                <p className="text-indigo-50 text-xs md:text-sm font-medium opacity-90 max-w-lg leading-snug">
                  Gestión técnica, mantenimiento y herramientas de diagnóstico ROOT.
                </p>
              </div>
            </div>

            {/* Integrated Premium Navigation Bar (Compact) */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="flex p-1 bg-black/10 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-inner overflow-auto max-w-full">
                {[
                  { id: 'config', label: 'Mantenimiento', icon: <Globe size={12} /> },
                  { id: 'devs', label: 'Equipo DEV', icon: <ShieldCheck size={12} /> },
                  { id: 'utils', label: 'Utilidades', icon: <Wrench size={12} /> },
                  { id: 'console', label: 'Terminal', icon: <Activity size={12} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 active:scale-95 whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-white text-violet-900 shadow-md scale-[1.02]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'config' && (

          <div className="space-y-8 animate-slide-up">
            {config.global && (
              <div className="bg-red-50 border-2 border-red-500/20 p-6 rounded-[24px] flex items-start gap-4 animate-scale-in">
                <AlertTriangle className="text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="text-red-800 font-black text-lg">Alerta de Sistema Desconectado</h3>
                  <p className="text-red-600/80 font-medium text-sm mt-1">
                    La plataforma entera está actualmente inaccesible para estudiantes, monitores y administradores.
                  </p>
                </div>
              </div>
            )}

            {/* Global Control */}
            <div className="grid grid-cols-1">
              <SwitchCard
                id="global"
                label="Mantenimiento Global"
                description="Cerrar el acceso a toda la plataforma"
                icon={<Globe size={24} />}
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

          </div>
        )}

        {activeTab === 'devs' && (
          <div className="space-y-8 animate-slide-up">
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
                    className="flex items-center gap-2 bg-violet-600 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-violet-600/20 hover:bg-violet-700 active:scale-95 transition-all text-sm"
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
                              <span className="w-fit text-[8px] font-black uppercase tracking-[2px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mt-1.5">Lead / Principal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {currentUser.is_principal && (
                          <>
                            <button onClick={() => handleOpenEdit(dev)} className="p-2 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50">
                              <Edit3 size={18} />
                            </button>
                            {dev.id !== currentUser.id && (
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
          </div>
        )}

        {activeTab === 'utils' && (
          <div className="space-y-8 animate-slide-up pb-20">
            {/* Diagnostics Summary */}
            <div className="bg-white p-0 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-scale-in">
              <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-30 bg-emerald-50 w-full h-full opacity-50 pointer-events-none rounded-[32px] blur-3xl"></div>
                <div className="flex gap-6 items-center relative z-10 w-full md:w-auto">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Activity size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Estado del Sistema Integrado</h3>
                    <p className="text-sm font-bold text-gray-400 leading-snug">Metrías actualizables manualmente vía Test.</p>
                  </div>
                </div>
                <button
                  onClick={() => runUtility(getDiagnostics, setIsFixing, 'Test completado satisfactoriamente', 'Diagnóstico Global')}
                  className="w-full md:w-auto px-6 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 whitespace-nowrap relative z-10"
                >
                  Ejecutar Test
                </button>
              </div>

              <div className="bg-gray-50/50 p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Latencia DB</p>
                  <p className="text-2xl font-black text-gray-900">{diagnostics ? diagnostics.latency : '-- ms'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Versión MySQL</p>
                  <p className="text-2xl font-black text-gray-900 truncate">{diagnostics ? diagnostics.dbVersion.split('-')[0] : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuarios</p>
                  <p className="text-2xl font-black text-gray-900">{diagnostics ? diagnostics.stats.users : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Registros DB</p>
                  <p className="text-2xl font-black text-gray-900">{diagnostics ? (diagnostics.stats.attendance + diagnostics.stats.scans) : '--'}</p>
                </div>
              </div>
            </div>

            {/* Utility Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reset Utility */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-900">Limpiar Base de Datos</h4>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">Borra asistencias, registros y códigos QR</p>
                </div>
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-md"
                >
                  Wipe Dinámico
                </button>
              </div>

              {/* Populate Utility */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-900">Generar Data Test</h4>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">Crea monitores, módulos y estudiantes</p>
                </div>
                <button
                  onClick={() => runUtility(dbPopulate, setIsPopulating, 'Datos de prueba generados', 'Poblado de Base de Datos')}
                  disabled={isPopulating}
                  className="w-full py-4 bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  {isPopulating ? 'Poblando...' : 'Ejecutar Populate'}
                </button>
              </div>

              {/* Username Fix Utility */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-900">Corregir Usernames</h4>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">Normalizar campos de usuario basados en email</p>
                </div>
                <button
                  onClick={() => runUtility(fixUsernames, setIsFixing, 'Nombres de usuario corregidos', 'Reparación de Usernames')}
                  disabled={isFixing}
                  className="w-full py-4 bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  {isFixing ? 'Fixing...' : 'Reparar Usuarios'}
                </button>
              </div>

              {/* Architecture Map Utility */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-900">Mapa de Componentes</h4>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">Ver todas las funciones y componentes activos del sistema.</p>
                </div>
                <button
                  onClick={() => setIsCompMapOpen(true)}
                  className="w-full py-4 bg-sky-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-sky-700 transition-all shadow-md"
                >
                  Ver Mapa de Plataforma
                </button>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'console' && (
          <div className="space-y-6 animate-slide-up pb-20">
            <LiveTerminal />


          </div>
        )}
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

          <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
            <input
              type="checkbox"
              id="is_principal"
              checked={formData.is_principal}
              onChange={e => setFormData({ ...formData, is_principal: e.target.checked })}
              className="w-5 h-5 accent-violet-600 rounded"
            />
            <label htmlFor="is_principal" className="text-sm font-black text-violet-700 select-none cursor-pointer">Otorgar permisos de Principal / Lider</label>
          </div>

          <button type="submit" className="w-full py-5 bg-violet-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-violet-700 transition-all">
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
              onClick={() => runUtility(dbReset, setIsResettingDb, 'Base de datos reseteada con éxito', 'Wipe de Base de Datos').then(() => setIsResetModalOpen(false))}
              disabled={isResettingDb}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {isResettingDb ? 'Borrando...' : 'Sí, borrar todo permanentemente'}
            </button>
            <button onClick={() => setIsResetModalOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCompMapOpen} onClose={() => setIsCompMapOpen(false)} title="Componentes y Módulos del Sistema">
        <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
          {[
            { name: "Motor de Usuarios DB", desc: "Gestión unificada, control de sesiones, roles cruzados y recuperación de credenciales.", icon: <Users size={20} /> },
            { name: "Asistencias & Track QR", desc: "Generación de IDs dinámicas seguras con JSRQ, escaner y validación de vigencia.", icon: <Activity size={20} /> },
            { name: "Módulo Foros y Red P2P", desc: "Chat sincrónico, envío inteligente, detección de actividad en vivo, reportes rápidos.", icon: <Globe size={20} /> },
            { name: "Boletería de Almuerzos", desc: "Ticket limitados diarios, validación cruzada, historiales unificados por semestre.", icon: <BookOpen size={20} /> },
            { name: "Panel Analíticas Generales", desc: "Dashboard con métricas filtradas, sumatorias instantáneas, gráficos interactivos.", icon: <Activity size={20} /> },
            { name: "Websockets (Socket.IO)", desc: "Manejos de eventos globales y bidireccionales, notificaciones y reportes sin delay.", icon: <Shield size={20} /> },
            { name: "Sistema Toaster UI", desc: "Notificaciones elásticas, context rendering React Framer-Motion.", icon: <Mail size={20} /> }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4 p-5 rounded-[24px] border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow group">
              <div className="mt-1 text-sky-500 bg-sky-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform h-fit">{item.icon}</div>
              <div className="space-y-1">
                <h5 className="font-black text-gray-900 leading-tight tracking-tight text-[15px]">{item.name}</h5>
                <p className="text-[13px] text-gray-500 font-bold leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
export default DevDashboard;
