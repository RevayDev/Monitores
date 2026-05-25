import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send, Bot, User, Minimize2, Loader2, Shield, Clock, Headphones, Key, XCircle } from 'lucide-react';
import { submitSupportRequest, getSupportTicketMessages, sendSupportTicketMessage } from '../services/api';
import { getSocketUrl } from '../utils/socketUrl';
import { ToastContext } from '../context/ToastContext';
import UserAvatar from './UserAvatar';

// RevayBot responses bank
const REVAYBOT_RESPONSES = [
  "Hola, soy **RevayBot** 🤖. He recibido tu mensaje y ya lo estoy procesando. Un asesor técnico revisará tu caso muy pronto.",
  "Entiendo tu consulta. Por favor **espera un momento**, nuestro equipo de soporte está siendo notificado ahora mismo.",
  "Gracias por contactarnos. Tu mensaje ha sido registrado. Un especialista del equipo de Monitores Hub te atenderá en breve ⏱️.",
  "¡He tomado nota de tu mensaje! Nuestros asesores suelen responder en menos de 24 horas. Si es urgente, también puedes abrir un **ticket de soporte** desde el formulario de ayuda.",
];

const REVAYBOT_WAITING = [
  "Mientras esperas, ¿hay algo más en lo que pueda ayudarte? 💬",
  "Nuestro equipo ha sido notificado. ¿Quieres saber algo sobre la plataforma mientras tanto?",
  "Tu solicitud está en cola. ¿Puedo ayudarte con alguna pregunta frecuente? 📋",
];

// FAQ quick replies
const QUICK_SUGGESTIONS = [
  { label: '🔑 Olvidé mi contraseña', message: 'Olvidé mi contraseña y no puedo acceder a mi cuenta.' },
  { label: '📋 Estado de mi registro', message: '¿Cómo puedo verificar el estado de mi inscripción a una monitoría?' },
  { label: '🐛 Reportar un error', message: 'Encontré un error en la plataforma y quiero reportarlo.' },
  { label: '👤 Hablar con un asesor', message: 'asesor' },
];

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}-${Date.now()}`;

const SupportChat = () => {
  const { showToast } = useContext(ToastContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: newId(),
      from: 'bot',
      sender_name: 'RevayBot',
      sender_role: 'bot',
      text: '¡Hola! Soy **RevayBot** 🤖, el asistente virtual de **Monitores Hub**.\n\nEstoy aquí para ayudarte o conectarte con nuestro equipo de soporte. ¿En qué puedo ayudarte hoy?',
      time: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showQuick, setShowQuick] = useState(true);

  // Live chat state
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [chatMode, setChatMode] = useState('bot'); // 'bot' | 'waiting' | 'live' | 'closed'
  const [advisorName, setAdvisorName] = useState('');
  const [advisorTyping, setAdvisorTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    } catch { return {}; }
  })();

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, advisorTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Show unread badge if closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasUnread(true);
    }
  }, [messages]);

  // Restore active chat session from localStorage
  useEffect(() => {
    const savedTicketId = localStorage.getItem('support_chat_ticket_id');
    if (savedTicketId) {
      setActiveTicketId(Number(savedTicketId));
      setChatMode('live');
      connectSocket(Number(savedTicketId));
      loadChatHistory(Number(savedTicketId));
    }
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const connectSocket = (ticketId) => {
    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
    }

    const socket = io(getSocketUrl(), { path: '/api/socket.io' });
    socketRef.current = socket;

    console.log('🔌 SupportChat: Connecting to socket for ticket:', ticketId);
    socket.emit('join_support_chat', ticketId);
    console.log('🔌 SupportChat: Emitted join_support_chat event');

    socket.on('ticket_message_received', (msg) => {
      console.log('📨 SupportChat: Received ticket_message_received event:', msg);
      const localMsg = {
        id: msg.id || newId(),
        from: msg.sender_role === 'user' ? 'user' : (msg.sender_role === 'bot' ? 'bot' : 'advisor'),
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        sender_avatar: msg.sender_avatar,
        text: msg.message,
        time: new Date(msg.created_at),
      };
      
      setMessages(prev => {
        if (prev.some(m => m.id === localMsg.id)) return prev;
        return [...prev, localMsg];
      });

      if (!isOpen) setHasUnread(true);

      if (chatMode !== 'live' && msg.sender_role !== 'user' && msg.sender_role !== 'bot') {
        setChatMode('live');
      }
    });

    socket.on('advisor_joined', (data) => {
      setChatMode('live');
      setAdvisorName(data.advisorName || 'Asesor');
      showToast(`El asesor ${data.advisorName || 'Asesor'} se ha unido al chat para ayudarte.`, 'success');
      if (data.systemMessage) {
        const localMsg = {
          id: data.systemMessage.id || `sys-${Date.now()}`,
          from: 'bot',
          sender_name: 'Sistema',
          sender_role: 'bot',
          text: data.systemMessage.message,
          time: new Date(data.systemMessage.created_at || Date.now()),
        };
        setMessages(prev => {
          if (prev.some(m => m.id === localMsg.id)) return prev;
          return [...prev, localMsg];
        });
      }
    });

    socket.on('support_user_typing', () => {
      setAdvisorTyping(true);
    });

    socket.on('support_user_stop_typing', () => {
      setAdvisorTyping(false);
    });

    socket.on('ticket_status_changed', (data) => {
      if (data.status === 'closed') {
        setChatMode('closed');
        localStorage.removeItem('support_chat_ticket_id');
        const systemMsg = {
          id: `sys-closed-${Date.now()}`,
          from: 'bot',
          sender_name: 'Sistema',
          sender_role: 'bot',
          text: 'Este chat ha sido cerrado. Si necesitas más ayuda, crea un nuevo ticket o inicia un nuevo chat.',
          time: new Date(),
        };
        setMessages(prev => {
          if (prev.some(m => m.id === systemMsg.id)) return prev;
          return [...prev, systemMsg];
        });
      }
    });

    socket.on('disconnect', () => {
      setAdvisorTyping(false);
    });
  };

  const loadChatHistory = async (ticketId) => {
    try {
      const history = await getSupportTicketMessages(ticketId);
      if (Array.isArray(history) && history.length > 0) {
        const converted = history.map(msg => ({
          id: msg.id,
          from: msg.sender_role === 'user' ? 'user' : (msg.sender_role === 'bot' ? 'bot' : 'advisor'),
          sender_name: msg.sender_name,
          sender_role: msg.sender_role,
          sender_avatar: msg.sender_avatar,
          text: msg.message,
          time: new Date(msg.created_at),
        }));
        setMessages(prev => {
          // Merge: keep the intro bot message, then add history
          const introMsg = prev[0];
          const merged = [introMsg, ...converted];
          // Dedup
          const seen = new Set();
          return merged.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        });
      }
    } catch {
      // silent
    }
  };

  const addLocalBotMessage = (text, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: newId(),
        from: 'bot',
        sender_name: 'RevayBot',
        sender_role: 'bot',
        text,
        time: new Date(),
      }]);
      if (!isOpen) setHasUnread(true);
    }, delay);
  };

  const requestAdvisor = async (userMessage) => {
    setChatMode('waiting');
    addLocalBotMessage('Conectando con un asesor en vivo... 🔄 Te notificaré cuando alguien se una al chat. Mientras tanto, ¿hay algo más en lo que pueda ayudarte?', 800);

    try {
      const result = await submitSupportRequest({
        name: currentUser.nombre || currentUser.username || 'Usuario',
        email: currentUser.email || 'soporte@monitores.hub',
        subject: `[Chat en Vivo] ${userMessage.substring(0, 60)}`,
        message: userMessage,
        category: 'chat',
      });

      if (result?.ticketId) {
        setActiveTicketId(result.ticketId);
        localStorage.setItem('support_chat_ticket_id', String(result.ticketId));
        connectSocket(result.ticketId);
        
        addLocalBotMessage(`Tu chat de soporte ha sido registrado como **Ticket #${result.ticketId}**. Un asesor será asignado en breve. ⏳`, 2000);
      }
    } catch (err) {
      addLocalBotMessage('No se pudo crear el ticket de soporte en este momento. Por favor intenta nuevamente más tarde.', 1000);
      setChatMode('bot');
    }
  };

  const handleSend = async (text = inputValue) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputValue('');
    setShowQuick(false);

    // Check if user wants an advisor
    const wantsAdvisor = trimmed.toLowerCase().includes('asesor') || trimmed.toLowerCase().includes('agente') || trimmed.toLowerCase().includes('humano');

    if (chatMode === 'live' && activeTicketId) {
      // LIVE MODE — send through API (which broadcasts via socket)
      const userMsg = {
        id: newId(),
        from: 'user',
        sender_name: currentUser.nombre || 'Usuario',
        sender_role: 'user',
        sender_avatar: currentUser.foto || null,
        text: trimmed,
        time: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        await sendSupportTicketMessage(activeTicketId, { message: trimmed });
      } catch {
        // silent — local message already shown
      }

      // Typing indicator to socket
      socketRef.current?.emit('support_typing', { ticketId: activeTicketId, user: currentUser.nombre });
      setTimeout(() => {
        socketRef.current?.emit('support_stop_typing', { ticketId: activeTicketId, userId: currentUser.id });
      }, 500);

    } else if (chatMode === 'waiting') {
      // Waiting mode — messages go to the ticket if it exists
      const userMsg = {
        id: newId(),
        from: 'user',
        sender_name: currentUser.nombre || 'Usuario',
        sender_role: 'user',
        sender_avatar: currentUser.foto || null,
        text: trimmed,
        time: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      if (activeTicketId) {
        try {
          console.log('📤 SupportChat: Sending message in waiting mode, ticketId:', activeTicketId, 'message:', trimmed);
          await sendSupportTicketMessage(activeTicketId, { message: trimmed });
          console.log('✅ SupportChat: Message sent successfully in waiting mode');
          // Emit typing indicators to socket even in waiting mode
          socketRef.current?.emit('support_typing', { ticketId: activeTicketId, user: currentUser.nombre });
          setTimeout(() => {
            socketRef.current?.emit('support_stop_typing', { ticketId: activeTicketId, userId: currentUser.id });
          }, 500);
        } catch (err) {
          console.error('❌ SupportChat: Error sending message in waiting mode:', err);
        }
      }

      // Bot helper while waiting
      const waitMsg = REVAYBOT_WAITING[Math.floor(Math.random() * REVAYBOT_WAITING.length)];
      addLocalBotMessage(waitMsg, 1500);

    } else if (wantsAdvisor && chatMode === 'bot') {
      // User wants escalation
      const userMsg = { id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario', sender_role: 'user', text: trimmed, time: new Date() };
      setMessages(prev => [...prev, userMsg]);
      await requestAdvisor(trimmed);

    } else {
      // BOT mode — normal auto-reply
      const userMsg = { id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario', sender_role: 'user', text: trimmed, time: new Date() };
      setMessages(prev => [...prev, userMsg]);

      const botResponse = REVAYBOT_RESPONSES[Math.floor(Math.random() * REVAYBOT_RESPONSES.length)];
      addLocalBotMessage(botResponse, 1200);

      // Silent ticket creation for tracking
      try {
        await submitSupportRequest({
          name: currentUser.nombre || currentUser.username || 'Usuario Anónimo',
          email: currentUser.email || 'soporte@monitores.hub',
          subject: `[RevayBot Chat] ${trimmed.substring(0, 60)}`,
          message: trimmed,
          category: 'chat',
        });
      } catch { /* Silent */ }

      // Follow-up after first interaction
      if (messages.length <= 2) {
        addLocalBotMessage('Si necesitas hablar directamente con un asesor, escribe **"asesor"** o pulsa el botón de **Hablar con un asesor** para que alguien del equipo te atienda en vivo. 👤', 3500);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartNewChat = () => {
    localStorage.removeItem('support_chat_ticket_id');
    setActiveTicketId(null);
    setChatMode('bot');
    setAdvisorName('');
    socketRef.current?.disconnect();
    setMessages([{
      id: newId(),
      from: 'bot',
      sender_name: 'RevayBot',
      sender_role: 'bot',
      text: '¡Hola de nuevo! 🤖 Soy **RevayBot**. ¿En qué puedo ayudarte?',
      time: new Date(),
    }]);
    setShowQuick(true);
  };

  const formatBotText = (text) => {
    const value = String(text || '');
    if (value.includes('[Restablecer Contraseña](/forgot-password)')) {
      const parts = value.split('[Restablecer Contraseña](/forgot-password)');
      return (
        <div className="space-y-2">
          <div>{formatBotText(parts[0])}</div>
          <a
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 border-none cursor-pointer"
          >
            <Key size={11} /> Restablecer Contraseña
          </a>
          {parts[1] && <div>{formatBotText(parts[1])}</div>}
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

  const formatTime = (date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const isClosed = chatMode === 'closed';

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[9990]">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setIsOpen(true); setHasUnread(false); setIsMinimized(false); }}
              className="relative w-14 h-14 rounded-full bg-brand-blue hover:bg-brand-blue-dark text-white shadow-2xl shadow-brand-blue/30 flex items-center justify-center border-none"
              aria-label="Abrir chat de soporte"
            >
              <MessageCircle size={24} />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white animate-bounce">
                  !
                </span>
              )}
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-full bg-brand-blue/30 animate-ping" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Chat Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed right-0 bottom-0 z-[9999] max-w-[100vw] w-full sm:w-[380px] sm:absolute sm:bottom-0 sm:right-0 bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden flex flex-col ${isMinimized ? 'h-auto' : 'h-[80vh] sm:h-[520px]'}`}
            >
              {/* Header */}
              <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-3 shadow-sm text-slate-800 animate-fade-in">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                    {chatMode === 'live' ? <Headphones size={20} className="text-brand-blue" /> : <Bot size={20} className="text-brand-blue" />}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isClosed ? 'bg-slate-400' : chatMode === 'live' ? 'bg-emerald-400' : chatMode === 'waiting' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm leading-tight uppercase">
                    {chatMode === 'live' ? advisorName || 'Asesor' : 'RevayBot'}
                  </p>
                  <p className="text-brand-blue text-[9px] font-black mt-0.5">
                    {isClosed ? 'Chat finalizado' : chatMode === 'live' ? 'Asesor en vivo' : chatMode === 'waiting' ? 'Buscando asesor...' : 'Soporte Técnico'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(v => !v)}
                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200 transition-all"
                    title="Minimizar"
                  >
                    <Minimize2 size={12} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200 transition-all"
                    title="Cerrar"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Online status bar */}
              {!isMinimized && (
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                  <Shield size={12} className="text-brand-blue" />
                  <span className="text-[10px] font-bold text-slate-700">Soporte seguro y privado</span>
                  <span className="ml-auto text-[9px] text-slate-500 font-bold flex items-center gap-1">
                    {chatMode === 'live' ? (
                      <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" /> En vivo</>
                    ) : chatMode === 'waiting' ? (
                      <><Loader2 size={9} className="animate-spin" /> Conectando...</>
                    ) : (
                      <><Clock size={9} /> Respuesta en &lt; 24h</>
                    )}
                  </span>
                </div>
              )}

              {/* Messages */}
              {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
                  {messages.map((msg) => {
                    const isSystem = msg.from === 'bot' && msg.sender_name === 'Sistema';
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
                            <Shield size={9} />
                            {formatBotText(msg.text)}
                          </span>
                        </div>
                      );
                    }

                    const isMe = msg.from === 'user';
                    
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {msg.sender_avatar || msg.from === 'advisor' ? (
                          <UserAvatar 
                            user={{ nombre: msg.sender_name, foto: msg.sender_avatar, role: msg.sender_role || (msg.from === 'advisor' ? 'admin' : 'student') }} 
                            size="xs" 
                            className="mb-4 shrink-0"
                          />
                        ) : msg.from === 'bot' ? (
                          <div className="w-7 h-7 rounded-xl bg-brand-blue flex items-center justify-center shrink-0 mb-4 border-none">
                            <Bot size={14} className="text-white" />
                          </div>
                        ) : isMe && currentUser.foto ? (
                          <UserAvatar 
                            user={{ nombre: currentUser.nombre, foto: currentUser.foto, role: currentUser.role || 'student' }} 
                            size="xs" 
                            className="mb-4 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mb-4">
                            <User size={14} className="text-slate-500" />
                          </div>
                        )}
                        {/* Bubble */}
                        <div className="max-w-[75%] space-y-0.5">
                          {/* Sender name for advisor messages */}
                          {msg.from === 'advisor' && (
                            <span className="text-[9px] font-black text-indigo-600 px-1 block">{msg.sender_name}</span>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-brand-blue text-white rounded-tr-sm border-none'
                              : msg.from === 'advisor'
                                ? 'bg-indigo-50/50 border border-indigo-200 text-slate-700 rounded-tl-sm'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                          }`}>
                            {isMe ? msg.text : formatBotText(msg.text)}
                          </div>
                          <p className={`text-[9px] font-bold px-1 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                            {formatTime(msg.time)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {(isTyping || advisorTyping) && (
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-xl bg-brand-blue flex items-center justify-center shrink-0 border-none">
                        {advisorTyping ? <Headphones size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1.5 items-center">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick suggestions */}
                  {showQuick && messages.length === 1 && chatMode === 'bot' && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Consultas frecuentes</p>
                      {QUICK_SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s.message)}
                          className="w-full text-left px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 border-none"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat closed banner */}
                  {isClosed && (
                    <div className="mt-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <XCircle size={16} className="text-slate-500" />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Chat Finalizado</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Este chat ha sido cerrado. Gracias por contactarnos.</p>
                      <button
                        onClick={handleStartNewChat}
                        className="px-4 py-2 bg-brand-blue text-white text-xs font-black rounded-xl shadow-md shadow-brand-blue/20 hover:bg-brand-blue-dark transition-all active:scale-95 border-none"
                      >
                        Iniciar nuevo chat
                      </button>
                    </div>
                  )}

                  {/* "Call Advisor" button when in bot mode */}
                  {chatMode === 'bot' && messages.length > 1 && !isClosed && (
                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={() => requestAdvisor('Solicito hablar con un asesor en vivo.')}
                        className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-[11px] font-black rounded-xl shadow-lg shadow-brand-blue/20 flex items-center gap-2 transition-all active:scale-95 border-none"
                      >
                        <Headphones size={14} /> Hablar con un asesor
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input */}
              {!isMinimized && (
                <div className="p-3 bg-white border-t border-slate-100">
                  {!isClosed ? (
                    <>
                      <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 pr-2 pl-4 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                        <textarea
                          ref={inputRef}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={chatMode === 'live' ? 'Escribe al asesor...' : 'Escribe tu consulta aquí...'}
                          rows={1}
                          className="flex-1 bg-none text-xs text-slate-800 placeholder-slate-400 resize-none outline-none font-medium max-h-20 py-1 leading-relaxed border-none"
                          style={{ minHeight: '24px', background: 'none' }}
                        />
                        <button
                          onClick={() => handleSend()}
                          disabled={!inputValue.trim() || isTyping}
                          className="w-8 h-8 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-blue-dark active:scale-90 transition-all shadow-md shadow-brand-blue/20 shrink-0 border-none"
                        >
                          {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 text-center mt-1.5 font-medium">
                        {chatMode === 'live' ? `En vivo con ${advisorName || 'Asesor'} · Monitores Hub` : 'Powered by RevayBot · Monitores Hub'}
                      </p>
                    </>
                  ) : (
                    <p className="text-[9px] text-slate-400 text-center py-1 font-medium">
                      Sesión cerrada · Monitores Hub
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default SupportChat;
