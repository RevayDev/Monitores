import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { X, Send, Bot, User, Loader2, Shield, Clock, Key, Check, Smile, LogOut, MessageSquare, AlertCircle } from 'lucide-react';
import { getSocketUrl } from '../utils/socketUrl';
import { getSupportTicketMessages, sendSupportTicketMessage, assignSupportTicket, updateSupportTicketStatus } from '../services/api';
import UserAvatar from './UserAvatar';
import { ToastContext } from '../context/ToastContext';

const SupportChatModal = ({ ticket, onClose, onStatusUpdated }) => {
  const { showToast } = useContext(ToastContext);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userIsTyping, setUserIsTyping] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(ticket.status);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  // Load message history
  const loadMessages = async () => {
    try {
      setLoadingHistory(true);
      const data = await getSupportTicketMessages(ticket.id);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error al cargar historial de chat', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadMessages();
    setIsAssigned(ticket.assigned_to !== null);
    setTicketStatus(ticket.status);
    
    // Connect socket
    const socket = io(getSocketUrl(), { path: '/api/socket.io' });
    socketRef.current = socket;

    console.log('🔌 SupportChatModal: Connecting to socket for ticket:', ticket.id);
    socket.emit('join_support_chat', ticket.id);
    console.log('🔌 SupportChatModal: Emitted join_support_chat event');

    socket.on('ticket_message_received', (msg) => {
      console.log('📨 SupportChatModal: Received ticket_message_received event:', msg);
      setMessages((prev) => {
        // Prevent duplicate messages in state
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('advisor_joined', (data) => {
      setIsAssigned(true);
      if (data.systemMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.systemMessage.id)) return prev;
          return [...prev, data.systemMessage];
        });
      }
    });

    socket.on('support_user_typing', () => {
      setUserIsTyping(true);
    });

    socket.on('support_user_stop_typing', () => {
      setUserIsTyping(false);
    });

    socket.on('ticket_status_changed', (data) => {
      setTicketStatus(data.status);
      if (data.status === 'closed') {
        showToast('El chat ha sido finalizado por el sistema.', 'info');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticket]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userIsTyping]);

  // Handle send message
  const handleSend = async (customText = null) => {
    const textToSend = customText !== null ? customText : inputValue;
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    try {
      if (customText === null) {
        setInputValue('');
      }
      
      // Send message to backend (it will automatically emit to socket room)
      await sendSupportTicketMessage(ticket.id, { message: trimmed });
      
      // Stop typing emitter
      socketRef.current?.emit('support_stop_typing', { ticketId: ticket.id, userId: currentUser.id });
      setIsTyping(false);
    } catch (err) {
      showToast('Error al enviar mensaje: ' + err.message, 'error');
    }
  };

  // Typing indicators
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      socketRef.current?.emit('support_typing', { ticketId: ticket.id, user: currentUser.nombre });
    } else if (isTyping && !e.target.value.trim()) {
      setIsTyping(false);
      socketRef.current?.emit('support_stop_typing', { ticketId: ticket.id, userId: currentUser.id });
    }
  };

  // Take charge ("Hacerse cargo")
  const handleTakeControl = async () => {
    try {
      setIsAssigning(true);
      await assignSupportTicket(ticket.id);
      setIsAssigned(true);
      setTicketStatus('in_progress');
      showToast('Te has hecho cargo del chat exitosamente.', 'success');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      showToast('Error al tomar control del chat: ' + err.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Finalize chat
  const handleFinalizeChat = async () => {
    try {
      setIsSubmittingStatus(true);
      await updateSupportTicketStatus(ticket.id, 'closed');
      setTicketStatus('closed');
      showToast('Chat finalizado y ticket cerrado.', 'success');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      showToast('Error al finalizar el chat: ' + err.message, 'error');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Templates
  const handleSendTemplate = (type) => {
    let message = '';
    if (type === 'welcome') {
      message = `¡Hola! Soy **${currentUser.nombre}**, tu asesor técnico hoy. He revisado tu solicitud sobre: "${ticket.subject}". ¿En qué puedo ayudarte?`;
    } else if (type === 'reset') {
      message = `Para restablecer tu contraseña de forma segura, haz clic en el siguiente enlace y sigue las instrucciones:\n\n[Restablecer Contraseña](/forgot-password)`;
    } else if (type === 'goodbye') {
      message = `Espero haber solucionado todas tus dudas de forma excelente. Ha sido un placer atenderte. Finalizaré esta sesión. ¡Que tengas un gran día! ✨`;
    }
    
    handleSend(message);
  };

  const formatMessageText = (text) => {
    const value = String(text || '');
    if (value.includes('[Restablecer Contraseña](/forgot-password)')) {
      const parts = value.split('[Restablecer Contraseña](/forgot-password)');
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap">{parts[0]}</p>
          <div className="my-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex flex-col items-center text-center gap-2">
            <Key className="text-indigo-600 animate-pulse" size={20} />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Acción Requerida</span>
            <a 
              href="/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-500/20"
            >
              Restablecer Contraseña
            </a>
          </div>
          {parts[1] && <p className="whitespace-pre-wrap">{parts[1]}</p>}
        </div>
      );
    }

    const regex = /(\*\*[^*]+\*\*|@[^#\s\n]+#\d+)/g;
    const parts = value.split(regex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('@') && part.includes('#')) {
        const match = part.match(/^@([^#]+)#(\d+)$/);
        if (match) {
          const name = match[1];
          const id = Number(match[2]);
          const isMe = Number(currentUser?.id) === id;
          return (
            <span 
              key={i} 
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black mx-0.5 leading-none ${
                isMe 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse' 
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              @{name}
            </span>
          );
        }
      }
      return part.split('\n').map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </React.Fragment>
      ));
    });
  };


  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isClosed = ticketStatus === 'closed';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9995] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-full md:max-w-4xl h-[100vh] md:h-[650px] bg-white rounded-b-[0] md:rounded-[32px] shadow-2xl border-t md:border border-slate-200 overflow-hidden flex flex-col md:flex-row"
        >
          {/* Sidebar / Ticket Information */}
          <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-6 flex flex-col shrink-0 max-h-[30vh] md:max-h-full overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="text-indigo-600" size={20} />
              <h3 className="font-black text-slate-800 text-sm tracking-tight">Consola de Soporte</h3>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Usuario Solicitante</span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <UserAvatar user={{ nombre: ticket.requester_name, role: 'student' }} size="sm" />
                    <div className="min-w-0">
                      <p className="font-black text-xs text-slate-800 truncate">{ticket.requester_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{ticket.requester_email}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400">Asunto del Soporte</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 leading-relaxed">{ticket.subject}</p>
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[9px] font-black uppercase text-slate-400">Mensaje de Inicio</span>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 max-h-32 overflow-y-auto leading-relaxed">
                    {ticket.message}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="rounded-2xl p-4 border flex items-center justify-between shadow-sm bg-white border-slate-200">
                <span className="text-xs font-black text-slate-800">Estado</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    isClosed ? 'bg-rose-500' : ticketStatus === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-brand-blue'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    {isClosed ? 'Cerrado' : ticketStatus === 'in_progress' ? 'En Progreso' : 'Abierto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Take Control / Actions */}
            <div className="pt-4 mt-auto border-t border-slate-200/60 space-y-2">
              {!isAssigned && !isClosed && (
                <button
                  onClick={handleTakeControl}
                  disabled={isAssigning}
                  className="w-full py-3 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-black rounded-xl transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 border-none"
                >
                  {isAssigning ? <Loader2 className="animate-spin" size={14} /> : 'Tomar Control (Hacerse Cargo)'}
                </button>
              )}

              {isAssigned && !isClosed && (
                <button
                  onClick={handleFinalizeChat}
                  disabled={isSubmittingStatus}
                  className="w-full py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 border-none"
                >
                  {isSubmittingStatus ? <Loader2 className="animate-spin" size={14} /> : (
                    <>
                      <LogOut size={13} />
                      Finalizar Chat y Cerrar Ticket
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all text-center border-none"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>

          {/* Main Chat Feed */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between text-slate-800 shrink-0 shadow-sm">
              <div>
                <h4 className="font-black text-sm tracking-tight text-slate-900 uppercase">Conversación en Tiempo Real</h4>
                <p className="text-[10px] text-brand-blue font-black mt-0.5">Ticket #{ticket.id} · Asesoría Segura</p>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Suggestions / Advisor Templates Panel */}
            {isAssigned && !isClosed && (
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap gap-2 items-center">
                <span className="text-[9px] font-black uppercase text-brand-blue tracking-wider flex items-center gap-1">
                  <Smile size={10} /> Plantillas Rápidas:
                </span>
                <button 
                  onClick={() => handleSendTemplate('welcome')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm border-none"
                >
                  👋 Saludo (Bienvenida)
                </button>
                <button 
                  onClick={() => handleSendTemplate('reset')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm flex items-center gap-1 border-none"
                >
                  <Key size={9} /> Reset Contraseña
                </button>
                <button 
                  onClick={() => handleSendTemplate('goodbye')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm border-none"
                >
                  ✨ Despedida (Cerrar)
                </button>
              </div>
            )}

            {/* Message History Feed */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
              {loadingHistory ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin text-brand-blue" size={24} />
                  <p className="text-xs font-bold">Cargando conversación...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 gap-3">
                  <Bot size={36} className="text-slate-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-600">No hay mensajes anteriores en este chat.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Envía el primer saludo o hazte cargo para iniciar.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSystem = msg.sender_role === 'bot' && msg.sender_name === 'Sistema';
                  const isMe = msg.sender_id === currentUser.id;
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5 animate-fade-in">
                          <Shield size={10} />
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <UserAvatar 
                        user={{ nombre: msg.sender_name, foto: msg.sender_avatar, role: msg.sender_role }} 
                        size="sm" 
                        className="mb-4 shrink-0 shadow-sm"
                      />
                      
                      {/* Bubble */}
                      <div className="max-w-[70%] space-y-0.5">
                        <span className={`text-[9px] font-black px-1.5 ${isMe ? 'text-right block text-indigo-600' : 'text-slate-500'}`}>
                          {msg.sender_name}
                        </span>
                        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm font-medium ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                        }`}>
                          {formatMessageText(msg.message)}
                        </div>
                        <p className={`text-[9px] font-bold px-1.5 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {userIsTyping && (
                <div className="flex items-end gap-2.5">
                  <UserAvatar user={{ nombre: ticket.requester_name, role: 'student' }} size="sm" />
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Panel */}
            <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
              {!isAssigned && !isClosed && (
                <div className="p-2.5 md:p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="text-amber-600 shrink-0" size={16} />
                  <p className="text-[10px] font-extrabold text-amber-800 leading-normal">
                    Debes "Tomar control" del chat antes de poder escribir o usar plantillas rápidas.
                  </p>
                </div>
              )}

              {isClosed && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-2">
                  <Shield className="text-slate-500 shrink-0" size={16} />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    Este chat está cerrado. El ticket se ha resuelto.
                  </p>
                </div>
              )}

              {isAssigned && !isClosed && (
                <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 pr-2 pl-4 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Escribe tu mensaje en tiempo real aquí..."
                    rows={1}
                    className="flex-1 bg-none text-xs text-slate-800 placeholder-slate-400 resize-none outline-none font-medium max-h-20 py-1.5 leading-relaxed border-none"
                    style={{ minHeight: '24px', background: 'none' }}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                    className="w-8.5 h-8.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shadow-brand-blue/20 shrink-0 border-none"
                  >
                    <Send size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SupportChatModal;
