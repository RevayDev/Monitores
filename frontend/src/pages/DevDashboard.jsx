import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  Wrench, Shield, Globe, Users, BookOpen, UserPlus, LogIn, Activity, 
  AlertTriangle, Edit3, Trash2, Mail, Lock, PlusCircle, ShieldCheck, 
  UserCheck, MapPin, Check, FileCode, FileJson, FileText as FileTextIcon, 
  Image as ImageIcon, FolderOpen, Send
} from 'lucide-react';
import {
  getMaintenanceConfig, setMaintenanceConfig, getAllUsers,
  createUser, updateUser, deleteUser, getSedes, getCuatrimestres,
  resetScans, dbReset, dbNuke, dbPopulate, dbPopulateVolume, fixUsernames, 
  getDiagnostics, executeTerminalCommand, request,
  rootEnable, rootMemberAction, rootFileAction, getRootLogs
} from '../services/api';
import Modal from '../components/Modal';
import { ToastContext } from '../context/ToastContext';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';

// ─── LiveTerminal extracted as a TOP-LEVEL component ───────────────────────
// CRITICAL: If defined inside DevDashboard, React re-mounts it on every parent
// re-render (e.g. socket log), destroying refs and resetting scroll. Stable
// component identity guarantees refs (scroll, bottomRef) persist across renders.
const COMMANDS_BASE = [
  'help', 'clear', 'ping', 'diagnostics',
  'populate', 'fix_users', 'wipe_db',
  'ls', 'tree', 'pwd', 'sysinfo', 'cd', 'enable'
];
const COMMANDS_ROOT = ['exit', 'userlist', 'useradd', 'userdel', 'userrole', 'suspenduser', 'touch', 'rm', 'read', 'write', 'backup', 'restore'];

const LiveTerminal = ({
  shellLogs, serverLogs, rootLogs, activeTermTab, setActiveTermTab,
  terminalCwd, setTerminalCwd, addLog, clearLogs,
  runUtility, getDiagnostics, setIsFixing, dbPopulate, setIsPopulating,
  fixUsernames, setIsResetModalOpen, executeTerminalCommand, request,
  rootEnable, rootMemberAction, rootFileAction,
  FolderOpen, FileTextIcon, FileCode, FileJson, ImageIcon, Globe, ShieldCheck, Edit3, Send
}) => {
  const scrollRef = React.useRef(null);
  const bottomRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [command, setCommand] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [availableSuggestions, setAvailableSuggestions] = useState([]);

  // Root State
  const [isRoot, setIsRoot] = useState(false);
  const [isPromptingPassword, setIsPromptingPassword] = useState(false);

  const currentLogs = activeTermTab === 'terminal' ? shellLogs : activeTermTab === 'logs' ? serverLogs : rootLogs;

  // Auto-scroll when new logs arrive - restricted to container to prevent whole page jump
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [currentLogs.length]);

  // Instant scroll on tab switch
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTermTab]);

  const selectSuggestion = (s) => {
    const parts = command.split(' ');
    parts[parts.length - 1] = s;
    setCommand(parts.join(' '));
    setShowSuggestions(false);
    setAvailableSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Tab autocompletes: commands (sync, client-side) AND paths (async, backend)
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (showSuggestions && availableSuggestions.length > 0) {
        // Cycle through existing suggestions
        setActiveSuggestion(prev => (prev + 1) % availableSuggestions.length);
      } else {
        const val = command.trim();
        if (!val) return;
        const parts = val.split(' ');
        const lastPart = parts[parts.length - 1].toLowerCase();

        if (parts.length === 1) {
          // Autocomplete command names (synchronous)
          const availableContextCmds = isRoot ? [...COMMANDS_BASE, ...COMMANDS_ROOT] : COMMANDS_BASE;
          const matches = availableContextCmds.filter(c => c.startsWith(lastPart));
          if (matches.length === 1) { selectSuggestion(matches[0]); return; }
          if (matches.length > 1) { setAvailableSuggestions(matches); setShowSuggestions(true); setActiveSuggestion(0); }
        } else {
          // Autocomplete path arguments via backend (async, non-blocking)
          request('/dev/terminal/suggestions', {
            method: 'POST',
            body: JSON.stringify({ query: command, cwd: terminalCwd })
          }).then(suggestions => {
            const results = suggestions || [];
            if (results.length === 1) {
              selectSuggestion(results[0]);
            } else if (results.length > 1) {
              setAvailableSuggestions(results);
              setShowSuggestions(true);
              setActiveSuggestion(0);
            }
          }).catch(() => {});
        }
      }
      return;
    }
    if (e.key === 'ArrowDown' && showSuggestions) { e.preventDefault(); setActiveSuggestion(p => (p + 1) % availableSuggestions.length); return; }
    if (e.key === 'ArrowUp' && showSuggestions) { e.preventDefault(); setActiveSuggestion(p => (p - 1 + availableSuggestions.length) % availableSuggestions.length); return; }
    if (e.key === 'Enter' && showSuggestions && availableSuggestions[activeSuggestion]) { e.preventDefault(); selectSuggestion(availableSuggestions[activeSuggestion]); return; }
    if (e.key === 'Escape') { setShowSuggestions(false); return; }
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    const fullCommand = command.trim();
    const parts = fullCommand.split(' ');
    const cmd = parts[0].toLowerCase();
    
    // Check if we are prompting for ROOT password
    if (isPromptingPassword) {
      setCommand('');
      try {
        const res = await rootEnable(fullCommand);
        setIsRoot(true);
        setIsPromptingPassword(false);
        addLog(res.message, 'success');
      } catch (err) {
        setIsPromptingPassword(false);
        addLog(`Error al habilitar ROOT: ${err.message}`, 'error');
      }
      return;
    }

    setCommand('');
    setShowSuggestions(false);
    setAvailableSuggestions([]);
    addLog(`${isRoot ? '#' : '$'} ${fullCommand}`, 'info');

    // ROOT Interceptor
    if (isRoot) {
      if (cmd === 'exit') {
        setIsRoot(false);
        addLog('Sesión ROOT finalizada.', 'info');
        return;
      }
      
      try {
        // Alias manual routing to existing rootMemberAction
        if (cmd === 'userlist') return await rootMemberAction('list', []).then(res => addLog(JSON.stringify(res.users, null, 2), 'info'));
        if (cmd === 'useradd') {
          if (parts.length < 5) throw new Error("Uso: useradd <nombre> <email> <role> <password>");
          return await rootMemberAction('add', parts.slice(1)).then(res => addLog(res.message, 'success'));
        }
        if (cmd === 'userdel') {
          if (!parts[1]) throw new Error("Uso: userdel <id>");
          return await rootMemberAction('rm', [parts[1]]).then(res => addLog(res.message, 'success'));
        }
        if (cmd === 'userrole') {
          if (!parts[1] || !parts[2]) throw new Error("Uso: userrole <id> <new_role>");
          return await rootMemberAction('role', [parts[1], parts[2]]).then(res => addLog(res.message, 'success'));
        }
        if (cmd === 'suspenduser') {
          if (!parts[1]) throw new Error("Uso: suspenduser <id> (o usar 'userup' para reactivar)");
          return await rootMemberAction('down', [parts[1]]).then(res => addLog(res.message, 'success'));
        }
        if (cmd === 'userup') {
          return await rootMemberAction('up', [parts[1]]).then(res => addLog(res.message, 'success'));
        }

        if (cmd === 'backup') {
          addLog("Iniciando volcado de BD y compresión de binarios...", 'info');
          // TODO call endpoint
          return;
        }

        if (cmd === 'restore') {
          addLog("Iniciando protocolo de restauración destructiva. Arrastra el Backup ZIP a la terminal...", 'warn');
          // TODO UI state
          return;
        }

        if (['read', 'touch', 'write', 'rm'].includes(cmd)) {
          const filePath = parts[1];
          if (!filePath) throw new Error("Uso de comando requiere ruta. Ej: read app.js");
          const res = await rootFileAction(cmd, filePath, terminalCwd);
          if (cmd === 'read') addLog(`[${filePath}]\n${res.content}`, 'info');
          else addLog(res.message, 'success');
          return;
        }
        // If not a ROOT-specific command, let it fallback to standard command handling
      } catch (err) {
        addLog(`[ROOT ERROR] ${err.message}`, 'error');
        return;
      }
    }

    switch (cmd) {
      case 'enable':
        if (isRoot) { addLog('Ya tienes permisos ROOT.', 'warn'); break; }
        setIsPromptingPassword(true);
        addLog('Password:', 'warn');
        break;
      case 'help': addLog('Comandos: enable, member, nano, clear, ping, diagnostics, populate, fix_users, wipe_db, ls, cd, pwd, sysinfo', 'success'); break;
      case 'clear': clearLogs(); break;
      case 'ping': addLog('pong', 'success'); break;
      case 'diagnostics': runUtility(getDiagnostics, setIsFixing, 'Test completado', 'Diagnóstico Global'); break;
      case 'populate': runUtility(dbPopulate, setIsPopulating, 'Datos de prueba generados', 'Poblado de Base de Datos'); break;
      case 'fix_users': runUtility(fixUsernames, setIsFixing, 'Usernames corregidos', 'Reparación de Usernames'); break;
      case 'wipe_db': setIsResetModalOpen(true); addLog('Confirmación requerida en la interfaz.', 'warn'); break;
      case 'cd': case 'ls': case 'tree': case 'pwd': case 'cwd': case 'sysinfo':
        try {
          const res = await executeTerminalCommand(fullCommand, terminalCwd);
          if (res.newCwd) setTerminalCwd(res.newCwd);
          if (res.result) {
            if (res.type === 'ls_output') addLog('LS_DATA', 'ls', { data: res.result });
            else addLog(res.result, 'info');
          }
        } catch (err) { addLog(`Error: ${err.message}`, 'error'); }
        break;
      default: addLog(`Comando no reconocido: ${cmd}. Escribe 'help'.`, 'error');
    }
  };



  return (
    <div className="w-full space-y-4">
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mt-2 animate-fade-in flex flex-col">
        {/* Tab bar */}
        <div className="bg-gray-50/80 px-4 flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 backdrop-blur-sm gap-2">
          <div className="flex gap-4 pt-4 sm:pt-0">
            <button onClick={() => setActiveTermTab('terminal')} className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${activeTermTab === 'terminal' ? 'border-violet-500 text-violet-600 bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Terminal</button>
            <button onClick={() => setActiveTermTab('logs')} className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${activeTermTab === 'logs' ? 'border-emerald-500 text-emerald-600 bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Outputs / Logs</button>
            <button onClick={() => setActiveTermTab('root_audit')} className={`px-4 py-3 font-black text-[11px] uppercase tracking-widest border-b-2 transition-all ${activeTermTab === 'root_audit' ? 'border-orange-500 text-orange-600 bg-white/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Audit ROOT</button>
          </div>
          <div className="flex gap-1.5 pb-3 sm:pb-0 pt-2 sm:pt-0 ml-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
          </div>
        </div>

        {/* Log area */}
        <div ref={scrollRef} className={`p-6 h-[400px] overflow-y-auto font-mono text-[12px] space-y-2 flex-grow relative ${activeTermTab === 'root_audit' ? 'bg-orange-50/10' : 'bg-white text-gray-800'}`}>
          {activeTermTab === 'root_audit' ? (
            <div className="space-y-3 font-sans">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-orange-500" size={18} />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">HISTORIAL DE COMANDOS ROOT</h4>
              </div>
              {currentLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic font-bold">No hay registros ROOT.</div>
              ) : (
                currentLogs.map(log => (
                  <div key={log.id} className="bg-white border border-orange-100 p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded tracking-wider">{log.action || 'SISTEMA'}</span>
                        <p className="text-[10px] text-gray-500 mt-2 font-mono break-all">{JSON.stringify(log.metadata || {})}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-gray-900">{log.user_name}</p>
                        <p className="text-[9px] font-bold text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : currentLogs.map(log => (
            <div key={log.id} className="flex gap-3 items-start border-b border-gray-100 pb-1.5 last:border-0 hover:bg-gray-50 rounded-lg p-1 transition-colors">
              <div className="flex items-center gap-2 shrink-0 select-none">
                <span className="text-gray-500 text-[11px]">[{log.timestamp}]</span>
                <div className={`w-[2px] h-3 ml-1 ${log.type === 'error' ? 'bg-red-500' : log.type === 'success' ? 'bg-emerald-500' : log.type === 'ls' ? 'bg-violet-500' : 'bg-blue-400'}`} />
              </div>
              {log.type === 'ls' ? (
                <div className="flex flex-wrap gap-x-6 gap-y-2 py-1">
                  {(log.data || []).map((item, i) => {
                    if (!item?.name) return null;
                    const ext = item.name.split('.').pop().toLowerCase();
                    let Icon = Globe; let colorClass = 'text-gray-400';
                    if (item.isDirectory) { Icon = FolderOpen; colorClass = 'text-blue-500'; }
                    else if (['js','jsx','ts','tsx','html','css'].includes(ext)) { Icon = FileCode; colorClass = 'text-amber-500'; }
                    else if (ext === 'json') { Icon = FileJson; colorClass = 'text-emerald-500'; }
                    else if (['png','jpg','jpeg','gif','svg'].includes(ext)) { Icon = ImageIcon; colorClass = 'text-violet-500'; }
                    else if (['txt','md','log'].includes(ext)) { Icon = FileTextIcon; colorClass = 'text-gray-500'; }
                    return (
                      <div key={i} className="flex items-center gap-2 min-w-[140px] group/item">
                        <Icon size={14} className={`${colorClass} shrink-0 group-hover/item:scale-110 transition-transform`} />
                        <span className={`${item.isDirectory ? 'font-black text-blue-600' : 'font-medium text-gray-700'} text-[11px]`}>{item.name}{item.isDirectory ? '/' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <pre className={`whitespace-pre-wrap font-mono text-[11px] leading-relaxed break-all flex-grow ${log.type === 'error' ? 'text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100' : log.type === 'warn' ? 'text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100' : log.type === 'success' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100' : 'text-gray-700 font-medium'}`}>{log.text}</pre>
              )}
            </div>
          ))}
          {/* Bottom anchor for auto-scroll - same pattern as forum's repliesEndRef */}
          <div ref={bottomRef} />
        </div>

        {/* Legend */}
        {activeTermTab !== 'root_audit' && (
          <div className="px-6 py-2 bg-gray-50 border-y border-gray-200 flex flex-wrap gap-4 shadow-inner">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Directorios</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Archivos</span></div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Estado ROOT:</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${isRoot ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>{isRoot ? 'Activo' : 'Inactivo'}</span>
            </div>
          </div>
        )}

        {/* Input area */}
        {activeTermTab === 'terminal' && (
          <div className="bg-gray-50 p-4 relative border-t border-gray-200">
            {/* IntelliSense card - above the input */}
            {showSuggestions && availableSuggestions.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">IntelliSense</p>
                  <span className="text-[8px] font-bold text-gray-400">Tab/↑↓ navegar · Enter seleccionar · Esc cerrar</span>
                </div>
                <div className="p-1.5 flex flex-wrap gap-1.5">
                  {availableSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(ev) => { ev.preventDefault(); selectSuggestion(s); }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${idx === activeSuggestion ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {s.endsWith('/') ? <FolderOpen size={12} /> : <FileTextIcon size={12} />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 text-gray-800 bg-white border border-gray-300 p-2.5 rounded-xl focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all shadow-sm">
              <span className={`font-black ml-2 text-lg ${isRoot ? 'text-red-500 shadow-sm' : 'text-emerald-500'}`}>{isRoot ? '#' : '>'}</span>
              <span className="text-gray-400 font-bold text-[11px] select-none shrink-0 truncate max-w-[120px]" title={terminalCwd || '~/backend'}>{terminalCwd ? terminalCwd.split(/[/\\]/).pop() : '~/bck'}</span>
              <input
                ref={inputRef}
                type={isPromptingPassword ? 'password' : 'text'}
                value={command}
                onChange={(ev) => {
                  const val = ev.target.value;
                  setCommand(val);
                  if (!isPromptingPassword && (val === '' || val.includes(' '))) {
                    setShowSuggestions(false);
                    setAvailableSuggestions([]);
                  } else if (!isPromptingPassword) {
                    const availableContextCmds = isRoot ? [...COMMANDS_BASE, ...COMMANDS_ROOT] : COMMANDS_BASE;
                    const matches = availableContextCmds.filter(c => c.startsWith(val.toLowerCase()));
                    if (matches.length > 0 && !(matches.length === 1 && matches[0] === val)) {
                      setAvailableSuggestions(matches); setShowSuggestions(true); setActiveSuggestion(0);
                    } else { setShowSuggestions(false); }
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="flex-grow bg-transparent outline-none font-mono text-[13px] text-gray-900 placeholder-gray-400 font-bold"
                placeholder="Escribe un comando..."
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="submit" 
                className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors shadow-sm ml-1 ${
                  command.trim() 
                    ? 'bg-violet-600 border-violet-500 text-white hover:bg-violet-700' 
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!command.trim()}
                title="Ejecutar (Enter)"
              >
                <Send size={15} className="ml-0.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* COMMANDS REFERENCE CARDS */}
      {activeTermTab === 'terminal' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-4 animate-fade-in">
          {[
            { cmd: 'help', desc: 'Manejo básico' },
            { cmd: 'enable', desc: 'Ser modo ROOT', requireRoot: false },
            { cmd: 'ls', desc: 'Lista archivos local' },
            { cmd: 'pwd', desc: 'Directorio actual' },
            { cmd: 'ping', desc: 'Latencia y red' },
            { cmd: 'diagnostics', desc: 'Salud de la BD' },
            { cmd: 'sysinfo', desc: 'Consumo CPU/RAM' },
            { cmd: 'clear', desc: 'Limpia la terminal' },
            { cmd: 'userlist', desc: 'Listar DB Usuarios', requireRoot: true },
            { cmd: 'useradd', desc: 'Añadir Usuario', requireRoot: true },
            { cmd: 'userdel', desc: 'Borrar Cuentas', requireRoot: true },
            { cmd: 'backup', desc: 'Respaldo DB/Storage', requireRoot: true },
            { cmd: 'restore', desc: 'Poblar desde BKP', requireRoot: true },
            { cmd: 'exit', desc: 'Salir modo [ROOT]', requireRoot: true },
          ].filter(c => isRoot ? true : !c.requireRoot).map(c => (
            <button 
              key={c.cmd} 
              onClick={() => { setCommand(c.cmd + ' '); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="bg-white border text-left border-gray-100 p-3 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-300 transition-all flex flex-col gap-1 group active:scale-95"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-xs font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-colors">{c.cmd}</span>
              </div>
              <span className="text-[10px] text-gray-500 font-bold leading-tight">{c.desc}</span>
            </button>
          ))}
        </div>
      )}


    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

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
  const getColombiaTime = () => new Date().toLocaleTimeString('en-US', { timeZone: 'America/Bogota', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const [shellLogs, setShellLogs] = useState([
    { id: 1, type: 'info', text: 'Terminal Interactiva inicializada. Esperando comandos...', timestamp: getColombiaTime() }
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
  const [testingResult, setTestingResult] = useState(null);
  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);

  // ROOT terminal
  const [rootLogs, setRootLogs] = useState([]);

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
      setServerLogs(prev => [...prev, { id: Date.now() + Math.random(), type, text: `[FRNT] ${text}`, timestamp: getColombiaTime() }].slice(-250));
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

  useEffect(() => {
    if (activeTermTab === 'root_audit') {
      getRootLogs(0, 100).then(setRootLogs).catch(() => {});
    }
  }, [activeTermTab]);

  const addLog = (text, type = 'info', metadata = {}) => {
    setShellLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), type, text, timestamp: getColombiaTime(), ...metadata }
    ]);
  };

  const clearLogs = () => {
    setShellLogs([{ id: Date.now(), type: 'info', text: 'Consola limpiada...', timestamp: getColombiaTime() }]);
  };

  const runUtility = async (func, setLoadingControl, successMsg, actionName) => {
    try {
      if (setLoadingControl) setLoadingControl(true);
      addLog(`[INICIO] Ejecutando: ${actionName}...`, 'info');
      const res = await func();
      addLog(`[ÉXITO] ${res.message || successMsg}`, 'success');
      
      if (actionName === 'NUKE & REBUILD' && res.credentials) {
        setTestingResult(res);
      } else {
        showToast(res.message || successMsg, 'success');
      }

      if (res.status === 'healthy') {
        setDiagnostics(res);
        addLog(`[DIAG] Latencia: ${res.latency} | Usuarios: ${res.stats.users}`, 'info');
      }
    } catch (error) {
      addLog(`[ERROR] ${error.message}`, 'error');
      showToast(error.message, 'error');
    } finally {
      if (setLoadingControl) setLoadingControl(false);
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
      nombre: '', username: '', email: '', password: '',
      sede: dbSedes[0] || '', cuatrimestre: dbCuatrimestres[0] || '',
      foto: '', is_principal: false
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
      <button onClick={() => handleToggle(id)} className={`relative w-16 h-8 rounded-full transition-colors border-2 ${config[id] ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-200'}`}>
        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${config[id] ? 'translate-x-8' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray p-4 sm:p-6 md:p-10 pb-32">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-violet-700 rounded-[32px] p-4 md:p-7 text-white flex flex-col items-center justify-between gap-6">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black bg-violet-600 border border-violet-500">
                <Wrench size={36} className="text-violet-50" />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-violet-600 rounded-full">
                  <div className="w-1.5 h-1.5 bg-violet-300 rounded-full"></div>
                  <span className="text-violet-100 text-[9px] font-black uppercase tracking-[0.15em]">ROOT / Bienvenido, {currentUser.nombre}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-tight">Developer Console</h1>
                <p className="text-violet-100 text-xs md:text-sm font-medium opacity-90 max-w-lg leading-snug">Gestión técnica, mantenimiento y herramientas de diagnóstico ROOT.</p>
              </div>
            </div>
            <div className="flex p-1 bg-violet-800 rounded-2xl">
              {[
                { id: 'config', label: 'Mantenimiento', icon: <Globe size={12} /> },
                { id: 'devs', label: 'Equipo DEV', icon: <ShieldCheck size={12} /> },
                { id: 'utils', label: 'Utilidades', icon: <Wrench size={12} /> },
                { id: 'console', label: 'Terminal', icon: <Activity size={12} /> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-violet-900 shadow-md scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'config' && (
          <div className="space-y-8 animate-slide-up">
            <SwitchCard id="global" label="Mantenimiento Global" description="Cerrar el acceso a toda la plataforma" icon={<Globe size={24} />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SwitchCard id="login" label="Inicio de Sesión" description="Bloquear acceso a cuentas" icon={<LogIn size={24} />} />
              <SwitchCard id="registro" label="Registro Estudiantil" description="Suspender creación de cuentas" icon={<UserPlus size={24} />} />
              <SwitchCard id="monitorias" label="Sistema de Monitorías" description="Búsqueda e inscripción a clases" icon={<BookOpen size={24} />} />
              <SwitchCard id="panelAdmin" label="Panel de Administración" description="Acceso a gestionar reportes y usuarios" icon={<Shield size={24} />} />
            </div>
          </div>
        )}

        {activeTab === 'devs' && (
          <div className="space-y-8 animate-slide-up">
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
                    <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-violet-600 text-white px-5 py-3 rounded-2xl font-black shadow-lg hover:bg-violet-700 transition-all text-sm">
                      <PlusCircle size={18} /> <span>Nuevo Developer</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {devs.map(dev => (
                    <div key={dev.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-xl">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <UserAvatar user={dev} size="md" />
                          <div>
                            <h4 className="font-bold text-gray-900 leading-tight mb-1">{dev.nombre}</h4>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate block max-w-[120px]">{dev.email}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {currentUser.is_principal && (
                            <>
                              <button onClick={() => handleOpenEdit(dev)} className="p-2 text-gray-400 hover:text-violet-600">
                                <Edit3 size={18} />
                              </button>
                              {dev.id !== currentUser.id && (
                                <button onClick={() => { setSelectedDev(dev); setIsDeleteOpen(true); }} className="p-2 text-gray-400 hover:text-red-500">
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
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex gap-6 items-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Activity size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Analíticas de Salud</h3>
                    <p className="text-sm font-bold text-gray-400">Estado de latencia y volumen de datos.</p>
                  </div>
                </div>
                <button onClick={() => runUtility(getDiagnostics, setIsFixing, 'Diagnóstico completado', 'Diagnóstico')} className="px-6 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg">Ejecutar Test</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Latencia DB</p>
                <p className="text-2xl font-black text-gray-900">{diagnostics ? diagnostics.latency : '-- ms'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MySQL Ver</p>
                <p className="text-2xl font-black text-gray-900 truncate">{diagnostics ? diagnostics.dbVersion.split('-')[0] : '--'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Usuarios</p>
                <p className="text-2xl font-black text-gray-900">{diagnostics ? diagnostics.stats.users : '--'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Registros</p>
                <p className="text-2xl font-black text-gray-900">{diagnostics ? (diagnostics.stats.attendance + diagnostics.stats.scans) : '--'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center"><Trash2 size={24} /></div>
                    <h4 className="font-black text-gray-900">Wipe de Actividad</h4>
                    <button onClick={() => setIsResetModalOpen(true)} className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all">Limpiar Logs</button>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center"><UserCheck size={24} /></div>
                    <h4 className="font-black text-gray-900">Normalizar Datos</h4>
                    <button onClick={() => runUtility(fixUsernames, setIsFixing, 'Usernames corregidos', 'Normalización')} className="w-full py-4 bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all">Ejecutar Fix</button>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center"><MapPin size={24} /></div>
                    <h4 className="font-black text-gray-900">Mapa de Plataforma</h4>
                    <button onClick={() => setIsCompMapOpen(true)} className="w-full py-4 bg-sky-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-sky-700 transition-all">Ver Arquitectura</button>
                </div>
            </div>

            {/* Testing Laboratory (ALTO RIESGO) */}
            <div className={`p-8 rounded-[32px] border-2 border-dashed transition-all space-y-8 bg-gray-50/30 border-gray-200 mt-12`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Shield className="text-violet-600" size={22} /> Laboratorio de Testing (ALTO RIESGO)
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Solo para entornos de desarrollo y staging</p>
                </div>
                <div className="px-3 py-1 bg-violet-100 text-violet-600 rounded-full text-[9px] font-black uppercase">Test Suite v3.2</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><AlertTriangle size={24} /></div>
                    <div>
                      <h4 className="font-extrabold text-gray-900">NUKE & REBUILD</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mt-1">Reset Total + Cuentas Root</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">Elimina todos los datos y recrea automáticamente las cuentas maestras de Administración y Desarrollo.</p>
                  <button onClick={() => setIsNukeModalOpen(true)} className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-lg">Nuclear Sistema</button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl"><PlusCircle size={24} /></div>
                    <div>
                      <h4 className="font-extrabold text-gray-900">GENERAR VOLUMEN</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mt-1">Poblado masivo (35 registros)</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">Genera 20 estudiantes, 10 monitores, foros, hilos y actividad de asistencia masiva para pruebas de carga.</p>
                  <button onClick={() => runUtility(dbPopulateVolume, setIsPopulating, 'Volumen generado', 'POBLAR VOLUMEN')} disabled={isPopulating} className="w-full py-4 bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all disabled:opacity-50">
                    {isPopulating ? 'Poblando...' : 'Poblar Volumen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="animate-slide-up pb-20">
            <LiveTerminal
              shellLogs={shellLogs}
              serverLogs={serverLogs}
              rootLogs={rootLogs}
              activeTermTab={activeTermTab}
              setActiveTermTab={setActiveTermTab}
              terminalCwd={terminalCwd}
              setTerminalCwd={setTerminalCwd}
              addLog={addLog}
              clearLogs={clearLogs}
              runUtility={runUtility}
              getDiagnostics={getDiagnostics}
              setIsFixing={setIsFixing}
              dbPopulate={dbPopulate}
              setIsPopulating={setIsPopulating}
              fixUsernames={fixUsernames}
              setIsResetModalOpen={setIsResetModalOpen}
              executeTerminalCommand={executeTerminalCommand}
              request={request}
              rootEnable={rootEnable}
              rootMemberAction={rootMemberAction}
              rootFileAction={rootFileAction}
              FolderOpen={FolderOpen}
              FileTextIcon={FileTextIcon}
              FileCode={FileCode}
              FileJson={FileJson}
              ImageIcon={ImageIcon}
              Globe={Globe}
              ShieldCheck={ShieldCheck}
              Edit3={Edit3}
              Send={Send}
            />
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Perfil de Desarrollador">
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <InputField label="Nombre Completo" icon={<Users />} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
          <InputField label="Username" icon={<UserCheck />} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          <InputField label="Email Institucional" icon={<Mail />} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <InputField label="Contraseña" icon={<Lock />} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-100">
            <input type="checkbox" id="is_principal_check" checked={formData.is_principal} onChange={e => setFormData({ ...formData, is_principal: e.target.checked })} className="w-5 h-5 accent-violet-600 rounded" />
            <label htmlFor="is_principal_check" className="text-sm font-black text-violet-700 cursor-pointer">Otorgar permisos Lead</label>
          </div>
          <button type="submit" className="w-full py-5 bg-violet-600 text-white font-black rounded-2xl shadow-xl hover:bg-violet-700 transition-all">Guardar Developer</button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="¿Confirmar Eliminación?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-2xl inline-block text-red-600"><AlertTriangle size={64} /></div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">Eliminar a <br /><span className="text-red-600">{selectedDev?.nombre}</span></p>
            <p className="text-gray-500 font-medium">Esta acción deshabilitará el acceso permanentemente.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleDelete} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700">Confirmar Eliminación</button>
            <button onClick={() => setIsDeleteOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl">Cancelar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Limpieza de Registros">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-600 p-6 rounded-2xl inline-block text-white shadow-2xl shadow-red-600/30"><AlertTriangle size={64} /></div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 uppercase">ATENCIÓN: WIPE TOTAL</p>
            <p className="text-gray-500 font-medium">Se borrarán todas las asistencias, almuerzos y logs de escaneo. El software quedará en blanco operativo.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => runUtility(dbReset, setIsResettingDb, 'Limpieza completada', 'Wipe').then(() => setIsResetModalOpen(false))} disabled={isResettingDb} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-all">{isResettingDb ? 'Borrando...' : 'Sí, borrar permanentemente'}</button>
            <button onClick={() => setIsResetModalOpen(false)} className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl">Cancelar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCompMapOpen} onClose={() => setIsCompMapOpen(false)} title="Arquitectura del Sistema">
        <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
          {[
            { name: "Motor de Usuarios DB", desc: "Gestión unificada, roles y sesiones.", icon: <Users size={20} /> },
            { name: "Asistencias & Track QR", desc: "Generación de IDs dinámicas y validación.", icon: <Activity size={20} /> },
            { name: "Módulo Foros y Red P2P", desc: "Chat sincrónico y reportes rápidos.", icon: <Globe size={20} /> },
            { name: "Boletería de Almuerzos", desc: "Tickets limitados y validación diaria.", icon: <BookOpen size={20} /> }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4 p-5 rounded-[24px] border border-gray-100 bg-white shadow-sm">
              <div className="text-sky-500 bg-sky-50 p-2.5 rounded-xl h-fit">{item.icon}</div>
              <div><h5 className="font-black text-gray-900 text-[15px]">{item.name}</h5><p className="text-[13px] text-gray-500 font-bold">{item.desc}</p></div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={isNukeModalOpen} onClose={() => setIsNukeModalOpen(false)} title="RECONSTRUCCIÓN NUCLEAR">
        <div className="p-2 space-y-6 text-center">
            <div className="p-6 bg-red-50 text-red-600 rounded-3xl flex flex-col items-center gap-4">
                <AlertTriangle size={48} className="animate-bounce" />
                <h3 className="text-xl font-black uppercase">¿NUCLEAR SISTEMA?</h3>
                <p className="text-sm font-bold opacity-80 leading-relaxed">Esta acción borrará ABSOLUTAMENTE TODO y reinstalará las cuentas raíz.</p>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={async () => { setIsNukeModalOpen(false); await runUtility(dbNuke, setIsResettingDb, 'Sistema reconstruido', 'NUKE & REBUILD'); }} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all">SI, NUCLEAR Y RECONSTRUIR</button>
                <button onClick={() => setIsNukeModalOpen(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={!!testingResult} onClose={() => { setTestingResult(null); window.location.reload(); }} title="Credenciales Institucionales">
        <div className="p-2 space-y-6">
            <div className="p-6 bg-emerald-50 text-emerald-600 rounded-3xl flex flex-col items-center gap-2">
                <ShieldCheck size={40} /><h3 className="text-lg font-black uppercase">Sistema Reconstruido</h3><p className="text-xs font-bold text-center">Guarda estas credenciales (Cierre automático tras aceptar).</p>
            </div>
            <div className="space-y-3">
                <div className="p-4 bg-white border-2 border-emerald-100 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Dev Root</p>
                    <div className="grid grid-cols-2 gap-4 font-mono text-[11px]">
                        <div><span className="text-gray-400">User:</span> <span className="font-bold text-gray-900">{testingResult?.credentials?.dev?.user}</span></div>
                        <div><span className="text-gray-400">Pass:</span> <span className="font-bold text-gray-900">{testingResult?.credentials?.dev?.pass}</span></div>
                    </div>
                </div>
                <div className="p-4 bg-white border-2 border-brand-blue/10 rounded-2xl">
                    <p className="text-[10px] font-black text-brand-blue uppercase mb-2">Admin Master</p>
                    <div className="grid grid-cols-2 gap-4 font-mono text-[11px]">
                        <div><span className="text-gray-400">User:</span> <span className="font-bold text-gray-900">{testingResult?.credentials?.admin?.user}</span></div>
                        <div><span className="text-gray-400">Pass:</span> <span className="font-bold text-gray-900">{testingResult?.credentials?.admin?.pass}</span></div>
                    </div>
                </div>
            </div>
            <button onClick={() => { setTestingResult(null); window.location.reload(); }} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700">Aceptar y Cerrar Sesión</button>
        </div>
      </Modal>
    </div>
  );
};

export default DevDashboard;
