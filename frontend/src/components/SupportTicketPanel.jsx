import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import {
  X, Send, Bot, Loader2, Shield, Clock, Key, Check,
  MessageSquare, AlertCircle, ChevronDown, Search,
  ArrowLeft, Inbox, Phone, Mail, ChevronRight, Trash2, UserCheck, Lock
} from 'lucide-react';
import { getSocketUrl } from '../utils/socketUrl';
import {
  getSupportTicketMessages, sendSupportTicketMessage,
  assignSupportTicket, updateSupportTicketStatus, deleteSupportTicket
} from '../services/api';
import UserAvatar from './UserAvatar';
import { ToastContext } from '../context/ToastContext';

const STATUS_META = {
  new: { label: 'Nuevo', icon: '🆕', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  open: { label: 'Abierto', icon: '📂', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  in_progress: { label: 'En Progreso', icon: '⏳', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  answered: { label: 'Respondido', icon: '✅', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Cerrado', icon: '🔒', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
};

const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.open;

const SupportTicketPanel = ({ tickets = [], onStatusUpdated }) => {
  const { showToast } = useContext(ToastContext);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSendingStatus, setIsSendingStatus] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userIsTyping, setUserIsTyping] = useState(false);
  const [userTypingName, setUserTypingName] = useState('');
  const [ticketStatus, setTicketStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isSendingRef = useRef(false);
  const receivedIdsRef = useRef(new Set());
  const currentUser = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;

  useEffect(() => {
    if (!selectedTicketId) { socketRef.current?.disconnect(); return; }
    receivedIdsRef.current = new Set();
    const socket = io(getSocketUrl(), { path: '/api/socket.io' });
    socketRef.current = socket;
    socket.emit('join_support_chat', selectedTicketId);
    socket.on('ticket_message_received', (msg) => {
      if (!msg.id || receivedIdsRef.current.has(msg.id)) return;
      receivedIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
    });
    socket.on('advisor_joined', (data) => {
      setIsAssigned(true);
      if (data.systemMessage && data.systemMessage.id && !receivedIdsRef.current.has(data.systemMessage.id)) {
        receivedIdsRef.current.add(data.systemMessage.id);
        setMessages(prev => [...prev, data.systemMessage]);
      }
    });
    socket.on('support_user_typing', (data) => {
      setUserIsTyping(true);
      setUserTypingName(data?.user || selectedTicket?.requester_name || 'Usuario');
    });
    socket.on('support_user_stop_typing', () => { setUserIsTyping(false); setUserTypingName(''); });
    socket.on('ticket_status_changed', (data) => { setTicketStatus(data.status); });
    return () => { socket.disconnect(); };
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) { setMessages([]); return; }
    (async () => {
      try {
        setLoadingHistory(true);
        const data = await getSupportTicketMessages(selectedTicketId);
        const msgs = Array.isArray(data) ? data : [];
        msgs.forEach(m => { if (m.id) receivedIdsRef.current.add(m.id); });
        setMessages(msgs);
      } catch { showToast('Error al cargar historial', 'error'); }
      finally { setLoadingHistory(false); }
    })();
    const ticket = tickets.find(t => t.id === selectedTicketId);
    setIsAssigned(ticket?.assigned_to !== null);
    setTicketStatus(ticket?.status);
  }, [selectedTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userIsTyping]);

  const handleSend = async (customText = null) => {
    const textToSend = customText !== null ? customText : inputValue;
    const trimmed = textToSend.trim();
    if (!trimmed || isSendingRef.current) return;
    isSendingRef.current = true;
    try {
      if (customText === null) setInputValue('');
      const sent = await sendSupportTicketMessage(selectedTicketId, { message: trimmed });
      if (sent && sent.id) receivedIdsRef.current.add(sent.id);
      socketRef.current?.emit('support_stop_typing', { ticketId: selectedTicketId, userId: currentUser.id });
      setIsTyping(false);
    } catch (err) { showToast('Error al enviar: ' + err.message, 'error'); }
    finally { setTimeout(() => { isSendingRef.current = false; }, 300); }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      socketRef.current?.emit('support_typing', { ticketId: selectedTicketId, user: currentUser.nombre });
    } else if (isTyping && !e.target.value.trim()) {
      setIsTyping(false);
      socketRef.current?.emit('support_stop_typing', { ticketId: selectedTicketId, userId: currentUser.id });
    }
  };

  const handleTakeControl = async () => {
    try {
      setIsAssigning(true);
      await assignSupportTicket(selectedTicketId);
      setIsAssigned(true);
      setTicketStatus('in_progress');
      showToast('Te has hecho cargo del chat.', 'success');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setIsAssigning(false); }
  };

  const handleFinalizeChat = async () => {
    try {
      setIsSendingStatus(true);
      await updateSupportTicketStatus(selectedTicketId, 'closed');
      setTicketStatus('closed');
      showToast('Chat finalizado.', 'success');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setIsSendingStatus(false); }
  };

  const handleStatusChange = async (status) => {
    try {
      setIsSendingStatus(true);
      await updateSupportTicketStatus(selectedTicketId, status);
      setTicketStatus(status);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setIsSendingStatus(false); }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicketId) return;
    try {
      setDeletingId(selectedTicketId);
      await deleteSupportTicket(selectedTicketId);
      showToast('Ticket eliminado.', 'success');
      setSelectedTicketId(null);
      setMessages([]);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setDeletingId(null); }
  };

  const handleSendTemplate = (type) => {
    let msg = '';
    if (type === 'welcome') msg = `Hola! Soy **${currentUser.nombre}**, tu asesor tecnico hoy. He revisado tu solicitud sobre: "${selectedTicket?.subject}". En que puedo ayudarte?`;
    else if (type === 'reset') msg = `Para restablecer tu contrasena, haz clic en el siguiente enlace:\n[Restablecer Contrasena](/forgot-password)`;
    else if (type === 'goodbye') msg = `Espero haber solucionado todas tus dudas. Ha sido un placer atenderte. Que tengas un gran dia!`;
    else if (type === 'wait') msg = `Gracias por tu paciencia. Estoy revisando tu caso, dame un momento.`;
    else if (type === 'escalate') msg = `He escalado tu caso al equipo tecnico especializado. Recibiras respuesta en las proximas horas.`;
    else if (type === 'qr') msg = `Para el problema con el QR: asegurate que el monitor tenga el codigo activo. Si expiro, pidele que genere uno nuevo. Sigue sin funcionar?`;
    else if (type === 'resolved') msg = `El problema ha sido resuelto. Si tienes otra consulta, no dudes en contactarnos.`;
    if (msg) handleSend(msg);
  };

  const TEMPLATES = [
    { key: 'welcome', label: '👋 Bienvenida' },
    { key: 'wait', label: '⏳ Espera' },
    { key: 'goodbye', label: '👋 Despedida' },
    { key: 'reset', label: '🔑 Password' },
    { key: 'escalate', label: '📈 Escalar' },
    { key: 'qr', label: '📱 QR' },
    { key: 'resolved', label: '✅ Resuelto' },
  ];

  const formatMsgText = (text) => {
    const value = String(text || '');
    if (value.includes('[Restablecer Contrasena](/forgot-password)')) {
      const parts = value.split('[Restablecer Contrasena](/forgot-password)');
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-[11px]">{parts[0]}</p>
          <div className="my-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex flex-col items-center text-center gap-2">
            <Key className="text-indigo-600" size={18} />
            <a href="/forgot-password" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl transition-all shadow-md">
              Restablecer Contrasena
            </a>
          </div>
          {parts[1] && <p className="whitespace-pre-wrap text-[11px]">{parts[1]}</p>}
        </div>
      );
    }
    const regex = /(\*\*[^*]+\*\*|@[^#\s\n]+#\d+)/g;
    const parts = value.split(regex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      if (part.startsWith('@') && part.includes('#')) {
        const m = part.match(/^@([^#]+)#(\d+)$/);
        if (m) {
          const isMe = Number(currentUser?.id) === Number(m[2]);
          return (
            <span key={i}
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black mx-0.5 leading-none ${
                isMe ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>@{m[1]}</span>
          );
        }
      }
      return part.split('\n').map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
      ));
    });
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  };

  const filteredTickets = tickets.filter(ticket => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s || String(ticket.requester_name || '').toLowerCase().includes(s)
      || String(ticket.requester_email || '').toLowerCase().includes(s)
      || String(ticket.subject || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isClosed = selectedTicket && (ticketStatus === 'closed' || selectedTicket.status === 'closed');

  const bubbleByRole = (role, isMe) => {
    if (isMe) {
      if (role === 'admin' || role === 'dev') return 'bg-indigo-100 border-indigo-300 text-slate-900';
      if (['monitor_academico', 'monitor_administrativo'].includes(role)) return 'bg-emerald-100 border-emerald-300 text-slate-900';
      return 'bg-blue-100 border-blue-300 text-slate-900';
    }
    if (role === 'admin' || role === 'dev') return 'bg-indigo-50 border-indigo-200 text-slate-800';
    if (['monitor_academico', 'monitor_administrativo'].includes(role)) return 'bg-emerald-50 border-emerald-200 text-slate-800';
    return 'bg-white/95 border-blue-100 text-slate-800';
  };

  const renderChatDetail = () => {
    if (!selectedTicket) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <Inbox size={48} className="text-slate-200 mb-4" />
          <p className="text-sm font-black text-slate-500">Selecciona un ticket</p>
          <p className="text-xs text-slate-400 mt-1">Elige un ticket de la lista para ver y gestionar la conversacion.</p>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-3 bg-white border-b border-slate-100 lg:hidden shrink-0">
          <button onClick={() => { setSelectedTicketId(null); }}
            className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-700">#{selectedTicket.id}</span>
            {isClosed && (
              <button onClick={handleDeleteTicket} disabled={deletingId === selectedTicketId}
                className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                {deletingId === selectedTicketId ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />}
              </button>
            )}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] font-black text-indigo-700 shrink-0">#{selectedTicket.id}</span>
            {selectedTicket.assigned_to === null && !isClosed && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-black shrink-0">Sin asignar</span>
            )}
            {selectedTicket.assigned_to !== null && !isClosed && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-black shrink-0">👤 Atendiendo</span>
            )}
            {isClosed && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-black shrink-0">🔒 Cerrado</span>
            )}
            <p className="text-xs font-black text-gray-800 truncate">{selectedTicket.subject}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isClosed && (
              <button onClick={() => handleStatusChange('open')} disabled={isSendingStatus}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-[9px] font-black border-none disabled:opacity-50 flex items-center gap-1">
                📂 Abrir
              </button>
            )}
            {!isAssigned && !isClosed && (
              <button onClick={handleTakeControl} disabled={isAssigning}
                className="px-2.5 py-1.5 rounded-xl bg-brand-blue text-white text-[9px] font-black border-none disabled:opacity-50 flex items-center gap-1">
                {isAssigning ? <Loader2 className="animate-spin" size={10} /> : '🖐️'} Tomar control
              </button>
            )}
            {isAssigned && !isClosed && (
              <button onClick={handleFinalizeChat} disabled={isSendingStatus}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-[9px] font-black border-none disabled:opacity-50 flex items-center gap-1">
                🔒 Cerrar
              </button>
            )}
            {isClosed && (
              <button onClick={handleDeleteTicket} disabled={deletingId === selectedTicketId}
                className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 text-[9px] font-black border border-red-200 disabled:opacity-50 flex items-center gap-1">
                {deletingId === selectedTicketId ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />} Eliminar
              </button>
            )}
          </div>
        </div>

        {/* Quick templates as collapsible details */}
        {isAssigned && !isClosed && messages.length > 0 && (
          <details className="bg-gray-50 border-b border-gray-200 shrink-0 group">
            <summary className="px-4 py-2 text-[9px] font-black uppercase text-brand-blue tracking-wider cursor-pointer flex items-center gap-1 list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown size={10} className="transition-transform group-open:rotate-180" /> 📋 Plantillas
            </summary>
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {TEMPLATES.map(t => (
                <button key={t.key} onClick={() => handleSendTemplate(t.key)}
                  className="px-2 py-1 bg-white hover:bg-gray-50 text-slate-700 border border-gray-200 text-[9px] font-black rounded-lg transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </details>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-gray-50/30" style={{ scrollbarWidth: 'thin' }}>
          {loadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-brand-blue" size={20} />
              <p className="text-xs font-black">Cargando...</p>
            </div>
          ) : messages.length === 0 && !isClosed ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 gap-2">
              <Bot size={32} className="text-slate-300" />
              <p className="text-sm font-black text-slate-600">Esperando consulta del usuario</p>
              <p className="text-[11px] text-slate-400 max-w-xs">El usuario aun no ha escrito nada. Cuando escriba su duda, aparecera aqui.</p>
            </div>
          ) : messages.length === 0 && isClosed ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 gap-2">
              <Inbox size={32} className="text-slate-300" />
              <p className="text-sm font-black text-slate-600">No hay mensajes</p>
              <p className="text-[11px] text-slate-400">Este chat no tiene mensajes registrados.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSystem = msg.sender_role === 'bot' && msg.sender_name === 'Sistema';
              const isMe = msg.sender_id === currentUser.id;
              if (isSystem) {
                return (
                  <div key={`msg-${msg.id}`} className="flex justify-center my-1.5">
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full border border-slate-200 shadow-sm flex items-center gap-1">
                      🛡️ {msg.message}
                    </span>
                  </div>
                );
              }
              const bubbleCls = bubbleByRole(msg.sender_role, isMe);
              return (
                <div key={`msg-${msg.id}`} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <UserAvatar user={{ nombre: msg.sender_name, foto: msg.sender_avatar, role: msg.sender_role }} size="xs" className="mb-4 shrink-0" />
                  <div className="max-w-[85%] sm:max-w-[75%] space-y-0.5">
                    <span className={`text-[9px] font-black px-1.5 ${isMe ? 'text-right block text-indigo-600' : 'text-slate-500'}`}>{msg.sender_name}</span>
                    <div className={`px-3.5 py-2 rounded-2xl border shadow-sm text-[11px] leading-relaxed font-medium ${bubbleCls} ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                      {formatMsgText(msg.message)}
                    </div>
                    <p className={`text-[8px] font-bold px-1.5 flex items-center gap-1 ${isMe ? 'text-right justify-end text-slate-400' : 'text-slate-400'}`}>
                      <Clock size={8} /> {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {userIsTyping && (
            <div className="flex items-end gap-2">
              <UserAvatar user={{ nombre: selectedTicket.requester_name, role: 'student' }} size="xs" />
              <div className="max-w-[85%] sm:max-w-[75%] space-y-0.5">
                <span className="text-[9px] font-black text-slate-500 px-1 block">{userTypingName} esta escribiendo...</span>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 space-y-2 shrink-0">
          {selectedTicket.assigned_to === null && !isClosed && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <MessageSquare className="text-brand-blue shrink-0" size={14} />
              <p className="text-[10px] font-bold text-brand-blue leading-normal flex-1">Espera a que el usuario escriba su consulta.</p>
              <button onClick={handleTakeControl} disabled={isAssigning}
                className="px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-[10px] font-black rounded-xl shadow-md flex items-center gap-1 border-none shrink-0">
                {isAssigning ? <Loader2 className="animate-spin" size={10} /> : '🖐️'} Tomar control
              </button>
            </div>
          )}
          {isClosed && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl">
              <Lock className="text-slate-500 shrink-0" size={14} />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex-1">🔒 Chat cerrado</p>
              <button onClick={handleDeleteTicket} disabled={deletingId === selectedTicketId}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-xl shadow-md flex items-center gap-1 border-none shrink-0">
                {deletingId === selectedTicketId ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />} Eliminar
              </button>
            </div>
          )}
          {isAssigned && !isClosed && (
            <div className="flex items-end gap-2 bg-white rounded-xl sm:rounded-2xl border border-gray-200 pr-2 pl-4 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all shadow-sm">
              <textarea value={inputValue} onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Escribe tu mensaje..." rows={1}
                className="flex-1 resize-none outline-none font-medium max-h-20 py-1.5 leading-relaxed border-none text-[11px]"
                style={{ minHeight: '24px', background: 'transparent', color: '#111827' }} />
              <button onClick={() => handleSend()} disabled={!inputValue.trim()}
                className="w-8 h-8 rounded-xl bg-gray-900 hover:bg-black text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shrink-0 border-none">
                <Send size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-4">
      {/* Left Panel: Ticket List */}
      <div className={`${selectedTicketId ? 'hidden lg:block' : 'block'} lg:col-span-1 bg-white p-3 sm:p-4 rounded-none sm:rounded-3xl border-b sm:border border-gray-100 flex flex-col overflow-hidden`}>
        {/* Search */}
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar tickets..."
            className="w-full pl-9 pr-8 py-2.5 text-[11px] font-bold border border-gray-200 rounded-xl outline-none focus:border-brand-blue transition-all bg-gray-50/50 hover:bg-white" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400 border-none">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status filter pills with emojis */}
        <div className="flex flex-wrap gap-1.5 shrink-0 mt-4">
          <button onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${
              statusFilter === 'all' ? 'bg-brand-blue text-white border-brand-blue shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>Todos</button>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${
                statusFilter === key ? 'bg-brand-blue text-white border-brand-blue shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-1">
              <Inbox size={24} className="text-gray-300" />
              <p className="text-xs font-black text-gray-500">📭 No hay tickets</p>
              <p className="text-[10px] text-gray-400">Con los filtros actuales.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const meta = getStatusMeta(ticket.status);
              const isSelected = selectedTicketId === ticket.id;
              return (
                <button key={ticket.id} onClick={() => { setSelectedTicketId(ticket.id); }}
                  className={`w-full text-left rounded-xl sm:rounded-2xl p-3 border transition-all ${
                    isSelected ? 'border-brand-blue bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-gray-50 hover:bg-gray-100/50'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black ${isSelected ? 'text-brand-blue' : 'text-indigo-600'}`}>#{ticket.id}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-black ${meta.cls}`}>{meta.icon} {meta.label}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-black truncate">{ticket.subject}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{ticket.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar user={{ nombre: ticket.requester_name, role: 'student' }} size="xs" />
                      <span className="text-[10px] font-bold text-gray-600 truncate max-w-[100px]">{ticket.requester_name}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 flex items-center gap-1">
                      <Clock size={8} /> {formatDate(ticket.created_at)}
                    </span>
                  </div>
                  {ticket.status !== 'closed' && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-brand-blue">
                      <span>Atender</span> <ChevronRight size={10} />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: Chat Detail */}
      <section className={`${selectedTicketId ? 'flex' : 'hidden lg:flex'} lg:col-span-2 bg-white p-0 sm:p-5 rounded-none sm:rounded-3xl border-b sm:border border-gray-100 flex-col overflow-hidden`}>
        {renderChatDetail()}
      </section>
    </div>
  );
};

export default SupportTicketPanel;
