import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send, Bot, User, Minimize2, Loader2, Shield, Clock, Headphones, Key, XCircle, Paperclip, Image as ImageIcon, FileText, AtSign } from 'lucide-react';
import { submitSupportRequest, getSupportTicketMessages, sendSupportTicketMessage, uploadSupportFile, getAllUsers, closeSupportTicket } from '../services/api';
import { getSocketUrl } from '../utils/socketUrl';
import { ToastContext } from '../context/ToastContext';
import UserAvatar from './UserAvatar';

// ─── Bot intent detection ────────────────────────────────────────────────────
const BOT_INTENTS = [
  {
    keywords: [
      'contrasena', 'contraseña', 'password', 'clave',
      'olvide', 'olvidé', 'no puedo entrar',
      'no puedo acceder', 'login', 'iniciar sesion',
      'iniciar sesión', 'acceso bloqueado'
    ],
    response:
      'Puedo ayudarte con eso ahora mismo 🔑. Para restablecer tu contraseña haz clic aquí:\n[Restablecer Contraseña](/forgot-password)',
    resolved: true,
  },

  {
    keywords: [
      'inscripcion', 'inscripción', 'registro',
      'monitoria', 'monitoría', 'estado',
      'inscrito', 'inscrita', 'cupo',
      'aplicacion', 'apliqué', 'postulación'
    ],
    response:
      'Para verificar el estado de tu inscripción a una monitoría, ve a **Mis Monitorías** en el menú principal. Ahí verás todas tus inscripciones activas y su estado 📋',
    resolved: true,
  },

  {
    keywords: [
      'error', 'bug', 'falla', 'fallo',
      'no carga', 'no funciona', 'problema',
      'roto', 'pantalla', 'crash',
      'se queda cargando', 'pantalla blanca',
      'pantalla negra'
    ],
    response:
      'Lamento que estés experimentando un problema técnico 🐛.\n\nNecesito esta información:\n1. ¿Qué página o función falla?\n2. ¿Qué mensaje aparece?\n3. ¿Qué navegador o dispositivo usas?\n4. ¿Qué estabas haciendo antes del error?\n\nCon eso puedo registrar mejor el reporte.',
    resolved: false,
  },

  {
    keywords: [
      'qr', 'asistencia', 'escanear',
      'codigo qr', 'código qr',
      'marcar asistencia'
    ],
    response:
      'Para registrar tu asistencia con QR, ve a tu perfil y presiona en **Generar Código QR** 📱.\n\nTen en cuenta:\n- El código es único.\n- Tiene corta duración.\n- Debe escanearlo el monitor.\n\n¿Necesitas ayuda para encontrar esa opción?',
    resolved: true,
  },

  {
    keywords: [
      'foro', 'forum', 'publicar',
      'comentar', 'hilo', 'thread',
      'respuesta', 'mensaje foro'
    ],
    response:
      'El foro está disponible dentro de cada módulo de monitoría 💬.\n\nEntra al módulo correspondiente y abre la pestaña **Foro** para publicar, responder o comentar.',
    resolved: true,
  },

  // ─── Nuevas preguntas ────────────────────────────────────────────────────

  {
    keywords: [
      'horario', 'hora', 'cuando',
      'fecha monitoria', 'fecha monitoría',
      'a que hora', 'a qué hora'
    ],
    response:
      'Puedes consultar el horario de cada monitoría entrando al módulo correspondiente 📅. Allí verás fecha, hora, modalidad y salón o enlace virtual.',
    resolved: true,
  },

  {
    keywords: [
      'teams', 'meet', 'zoom',
      'link clase', 'enlace',
      'whatsapp', 'grupo whatsapp'
    ],
    response:
      'Los enlaces de Teams, Meet o grupos de WhatsApp aparecen dentro de cada monitoría en **Mis Monitorías** 🔗.',
    resolved: true,
  },

  {
    keywords: [
      'cancelar inscripcion',
      'cancelar inscripción',
      'retirarme',
      'salirme',
      'desinscribirme'
    ],
    response:
      'Puedes retirarte de una monitoría desde la sección **Mis Monitorías**. Busca la monitoría y selecciona la opción de cancelar inscripción.',
    resolved: true,
  },

  {
    keywords: [
      'certificado', 'constancia',
      'evidencia', 'comprobante'
    ],
    response:
      'Actualmente los certificados o constancias dependen de la coordinación académica 📄. Si no encuentras la opción en el sistema, debes comunicarte con administración.',
    resolved: false,
  },

  {
    keywords: [
      'monitor', 'contactar monitor',
      'hablar con monitor',
      'correo monitor'
    ],
    response:
      'Dentro de cada monitoría encontrarás la información de contacto del monitor 📧, incluyendo correo institucional y enlaces de comunicación.',
    resolved: true,
  },

  {
    keywords: [
      'crear monitoria', 'crear monitoría',
      'nuevo modulo', 'nuevo módulo',
      'publicar monitoria'
    ],
    response:
      'La creación de monitorías solo está disponible para usuarios con rol de monitor o administrador 🧑‍🏫.',
    resolved: true,
  },

  {
    keywords: [
      'modo oscuro', 'dark mode',
      'tema oscuro', 'tema claro'
    ],
    response:
      'Puedes cambiar el tema visual desde la configuración de tu perfil 🌙.',
    resolved: true,
  },

  {
    keywords: [
      'editar perfil', 'cambiar foto',
      'actualizar datos', 'editar cuenta'
    ],
    response:
      'Puedes actualizar tu información desde la sección **Perfil** 👤.',
    resolved: true,
  },

  {
    keywords: [
      'correo no llega', 'no llega correo',
      'email no llega', 'verificacion',
      'verificación', 'spam'
    ],
    response:
      'Si no recibes el correo, revisa la carpeta de spam o correo no deseado 📩. También verifica que tu correo esté escrito correctamente.',
    resolved: false,
  },

  {
    keywords: [
      'mantenimiento', 'caido',
      'caído', 'servidor',
      'offline', 'fuera de servicio'
    ],
    response:
      'El sistema puede estar en mantenimiento temporal ⚙️. Intenta nuevamente en unos minutos.',
    resolved: false,
  },

  {
    keywords: [
      'admin', 'administrador',
      'soporte', 'ayuda humana',
      'hablar con alguien'
    ],
    response:
      'Si necesitas soporte humano, puedes comunicarte con administración o soporte técnico desde la sección de contacto 🛟.',
    resolved: false,
  },

  {
    keywords: [
      'calificar', 'valorar',
      'evaluar monitor',
      'rating'
    ],
    response:
      'Después de cada asistencia puedes dejar una valoración y comentario sobre la monitoría ⭐.',
    resolved: true,
  },

  {
    keywords: [
      'queja', 'reporte',
      'denuncia', 'mal comportamiento'
    ],
    response:
      'Puedes enviar una queja o reporte desde el módulo correspondiente. El equipo administrativo revisará el caso de forma confidencial.',
    resolved: false,
  },

  {
    keywords: [
      'registrarse', 'crear cuenta',
      'signup', 'sign up',
      'nuevo usuario'
    ],
    response:
      'Puedes crear una cuenta desde la pantalla principal seleccionando **Registrarse** 📝.',
    resolved: true,
  },

  {
    keywords: [
      'cerrar sesion', 'cerrar sesión',
      'logout', 'salir'
    ],
    response:
      'Para cerrar sesión, abre el menú de perfil y selecciona **Cerrar Sesión** 🚪.',
    resolved: true,
  },

  {
    keywords: [
      'cambiar contraseña',
      'actualizar contraseña'
    ],
    response:
      'Puedes cambiar tu contraseña desde la configuración de tu perfil en la sección de seguridad 🔒.',
    resolved: true,
  },
];

const REVAYBOT_WAITING = [
  'Mientras esperas, ¿hay algo más en lo que pueda ayudarte? 💬',
  'Nuestro equipo ha sido notificado. ¿Quieres saber algo sobre la plataforma mientras tanto?',
  'Tu solicitud está en cola. ¿Puedo ayudarte con alguna pregunta frecuente? 📋',
];

const QUICK_SUGGESTIONS = [
  { label: '🔑 Olvidé mi contraseña', message: 'Olvidé mi contraseña y no puedo acceder a mi cuenta.' },
  { label: '📋 Estado de mi registro', message: '¿Cómo puedo verificar el estado de mi inscripción a una monitoría?' },
  { label: '🐛 Reportar un error', message: 'Encontré un error en la plataforma y quiero reportarlo.' },
  { label: '📡 Problema con QR', message: 'Tengo un problema con el código QR de asistencia.' },
  { label: '👤 Hablar con un asesor', message: 'asesor' },
];

const detectIntent = (text) => {
   const lower = text.toLowerCase();
   let bestMatch = null;
   let maxMatches = 0;
   for (const intent of BOT_INTENTS) {
     const matches = intent.keywords.filter(kw => lower.includes(kw)).length;
     if (matches > maxMatches) {
       maxMatches = matches;
       bestMatch = intent;
     }
   }
   return maxMatches > 0 ? bestMatch : null;
 };

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}-${Date.now()}`;

// ─── Mention helpers (same as ModuleForum) ───────────────────────────────────
const getMentionQuery = (value) => {
  const match = String(value || '').match(/(?:^|\s)@([^\s#@]*)$/);
  return match ? match[1] || '' : null;
};
const buildMentionToken = (member) =>
  `@${member?.nombre || member?.username || 'Usuario'}#${member.id}`;

// ─── Component ───────────────────────────────────────────────────────────────
const SupportChat = () => {
  const { showToast } = useContext(ToastContext);

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false); // bot "..." animation
  const [advisorTyping, setAdvisorTyping] = useState(false); // advisor typing indicator

  // Messages
  const [messages, setMessages] = useState([{
    id: newId(),
    from: 'bot',
    sender_name: 'RevayBot',
    sender_role: 'bot',
    text: '¡Hola! Soy **RevayBot** 🤖, el asistente virtual de **Monitores Hub**.\n\nEstoy aquí para ayudarte o conectarte con nuestro equipo de soporte. ¿En qué puedo ayudarte hoy?',
    time: new Date(),
  }]);

  // Live chat state
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [chatMode, setChatMode] = useState('bot'); // 'bot' | 'waiting' | 'live' | 'closed'
  const [advisorName, setAdvisorName] = useState('');
  const [showClosePrompt, setShowClosePrompt] = useState(false);

  // Refs — same pattern as ModuleForum
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const isSendingRef = useRef(false);       // prevents double-send
  const typingTimeoutRef = useRef(null);    // debounce stop_typing emit
  const lastTypingEmitRef = useRef(0);      // throttle typing emit (like forum)
  const fileInputRef = useRef(null);        // hidden file input for attachments

  // Attachments state (mirrors forum replyAttachments)
  const [attachments, setAttachments] = useState([]);   // [{ file_url, file_type, name }]
  const [isUploading, setIsUploading] = useState(false);

  // Mention state (mirrors forum mentionTarget/mentionQuery)
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [staffList, setStaffList] = useState([]);  // admins + devs for @mention

  // Load staff list once for mentions
  useEffect(() => {
    getAllUsers()
      .then(users => {
        const staff = (users || []).filter(u =>
          ['admin', 'dev'].includes(String(u.role || u.baseRole || '').toLowerCase())
        );
        setStaffList(staff);
      })
      .catch(() => {});
  }, []);

  // Gratitude / farewell keywords — auto-close bot chat
  const FAREWELL_KEYWORDS = [
    'gracias', 'muchas gracias', 'thank you', 'thanks',
    'ya no necesito', 'ya resolvi', 'ya resolví', 'ya está', 'ya esta',
    'listo', 'perfecto', 'excelente', 'genial', 'ok gracias',
    'hasta luego', 'adios', 'adiós', 'chao', 'bye',
    'me ayudaste', 'solucionado', 'resuelto',
  ];
  const isFarewell = (text) => {
    const lower = text.toLowerCase().trim();
    return FAREWELL_KEYWORDS.some(kw => lower.includes(kw));
  };

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('monitores_current_role') || '{}'); }
    catch { return {}; }
  })();

  // ── Auto-scroll (same as forum repliesEndRef) ──────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, advisorTyping, isBotTyping]);

  // ── Focus input on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // ── Cleanup typing timeout on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, []);

  // ── Unread badge ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen && messages.length > 1) setHasUnread(true);
  }, [messages]);

  // ── Restore session from localStorage (like forum restores selectedId) ────
  useEffect(() => {
    const savedTicketId = localStorage.getItem('support_chat_ticket_id');
    if (savedTicketId) {
      const tid = Number(savedTicketId);
      setActiveTicketId(tid);
      setChatMode('live');
      connectSocket(tid);
      loadChatHistory(tid);
    }
    return () => { socketRef.current?.disconnect(); };
  }, []);

  // ── Socket connection (mirrors forum socket setup) ────────────────────────
  const connectSocket = (ticketId) => {
    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
    }
    const socket = io(getSocketUrl(), { path: '/api/socket.io' });
    socketRef.current = socket;
    socket.emit('join_support_chat', ticketId);

    socket.on('ticket_message_received', (msg) => {
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
        // Replace pending temp message (same text + from) — prevents double display
        const pendingIdx = prev.findIndex(m => m._pending && m.text === localMsg.text && m.from === localMsg.from);
        if (pendingIdx !== -1) {
          const next = [...prev];
          next[pendingIdx] = localMsg;
          return next;
        }
        return [...prev, localMsg];
      });
      if (!isOpen) setHasUnread(true);
      // Auto-upgrade to live if advisor replies
      setChatMode(prev => {
        if (prev !== 'live' && msg.sender_role !== 'user' && msg.sender_role !== 'bot') return 'live';
        return prev;
      });
    });

    socket.on('advisor_joined', (data) => {
      setChatMode('live');
      setAdvisorName(data.advisorName || 'Asesor');
      showToast(`El asesor ${data.advisorName || 'Asesor'} se ha unido al chat.`, 'success');
      if (data.systemMessage) {
        const sys = {
          id: data.systemMessage.id || `sys-${Date.now()}`,
          from: 'bot', sender_name: 'Sistema', sender_role: 'bot',
          text: data.systemMessage.message,
          time: new Date(data.systemMessage.created_at || Date.now()),
        };
        setMessages(prev => prev.some(m => m.id === sys.id) ? prev : [...prev, sys]);
      }
    });

    // Advisor typing indicator (staff side emits support_typing)
     socket.on('support_typing', () => setAdvisorTyping(true));
     socket.on('support_stop_typing', () => setAdvisorTyping(false));

    socket.on('ticket_status_changed', (data) => {
      if (data.status === 'closed') {
        setChatMode('closed');
        localStorage.removeItem('support_chat_ticket_id');
        const sys = {
          id: `sys-closed-${Date.now()}`, from: 'bot', sender_name: 'Sistema', sender_role: 'bot',
          text: 'Este chat ha sido cerrado. Si necesitas más ayuda, inicia un nuevo chat.',
          time: new Date(),
        };
        setMessages(prev => prev.some(m => m.id === sys.id) ? prev : [...prev, sys]);
      }
    });

    socket.on('disconnect', () => setAdvisorTyping(false));
  };

  // ── Load chat history ─────────────────────────────────────────────────────
  const loadChatHistory = async (ticketId) => {
    try {
      const history = await getSupportTicketMessages(ticketId);
      if (!Array.isArray(history) || !history.length) return;
      const converted = history.map(msg => ({
        id: msg.id,
        from: msg.sender_role === 'user' ? 'user' : (msg.sender_role === 'bot' ? 'bot' : 'advisor'),
        sender_name: msg.sender_name, sender_role: msg.sender_role,
        sender_avatar: msg.sender_avatar, text: msg.message,
        time: new Date(msg.created_at),
      }));
      setMessages(prev => {
        const introMsg = prev[0];
        const merged = [introMsg, ...converted];
        const seen = new Set();
        return merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
      });
    } catch { /* silent */ }
  };

  // ── Bot message helper ────────────────────────────────────────────────────
  const addBotMessage = (text, delay = 1200) => {
    setIsBotTyping(true);
    setTimeout(() => {
      setIsBotTyping(false);
      setMessages(prev => [...prev, {
        id: newId(), from: 'bot', sender_name: 'RevayBot', sender_role: 'bot',
        text, time: new Date(),
      }]);
      if (!isOpen) setHasUnread(true);
    }, delay);
  };

  // ── Request advisor (creates ticket) ─────────────────────────────────────
  const requestAdvisor = async (userMessage) => {
    setChatMode('waiting');
    addBotMessage('Conectando con un asesor en vivo... 🔄 Te notificaré cuando alguien se una al chat.', 800);
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
        addBotMessage(`Tu chat fue registrado como **Ticket #${result.ticketId}**. Un asesor será asignado en breve. ⏳`, 2000);
      }
    } catch {
      addBotMessage('No se pudo crear el ticket en este momento. Por favor intenta más tarde.', 1000);
      setChatMode('bot');
    }
  };

  // ── Close chat (user-facing) ────────────────────────────────────────────
  const handleUserCloseChat = async () => {
    if (!activeTicketId) return;
    try {
      await closeSupportTicket(activeTicketId);
      setChatMode('closed');
      setShowClosePrompt(false);
      localStorage.removeItem('support_chat_ticket_id');
    } catch (err) {
      addBotMessage('Error al cerrar el chat. Intenta nuevamente.', 1000);
    }
  };

  // ── Typing emit (throttled like forum) ───────────────────────────────────
  const emitTyping = () => {
    if (!activeTicketId || !socketRef.current) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 1200) return; // throttle
    lastTypingEmitRef.current = now;
    socketRef.current.emit('support_typing', { ticketId: activeTicketId, user: currentUser.nombre });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('support_stop_typing', { ticketId: activeTicketId, userId: currentUser.id });
      typingTimeoutRef.current = null;
    }, 3000);
  };

  // ── Mention candidates (filtered by query, same as forum) ───────────────
  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase().trim();
    const base = staffList.filter(m => Number(m.id) !== Number(currentUser?.id));
    if (!q) return base.slice(0, 8);
    return base.filter(m => {
      const name = String(m.nombre || '').toLowerCase();
      const uname = String(m.username || '').toLowerCase();
      return name.includes(q) || uname.includes(q);
    }).slice(0, 8);
  }, [staffList, mentionQuery, currentUser]);

  const insertMention = (member) => {
    const token = `${buildMentionToken(member)} `;
    const current = inputValue;
    // Replace the trailing @query with the full token
    const replaced = current.replace(/(?:^|\s)@([^\s#@]*)$/, (chunk) =>
      `${chunk.startsWith(' ') ? ' ' : ''}${token}`
    ).trimStart();
    setInputValue(replaced);
    setMentionActive(false);
    setMentionQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = replaced.length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

   const handleInputChange = (e) => {
     const val = e.target.value;
     setInputValue(val);
     setIsUserTyping(true);
     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
     typingTimeoutRef.current = setTimeout(() => {
       setIsUserTyping(false);
     }, 1000);
     if (!isClosed) emitTyping();
     // Detect @mention trigger (same as forum getMentionQuery)
     const q = getMentionQuery(val);
     if (q === null) { setMentionActive(false); setMentionQuery(''); }
     else { setMentionActive(true); setMentionQuery(q); }
   };

  // ── Main send handler ─────────────────────────────────────────────────────
  const handleSend = async (textArg) => {
    const trimmed = (typeof textArg === 'string' ? textArg : inputValue).trim();
    const hasAttachments = attachments.length > 0;
    if ((!trimmed && !hasAttachments) || isSendingRef.current) return;

    isSendingRef.current = true;
    setInputValue('');
    setShowQuick(false);

    // Build full message: text + attachment markdown (like forum)
    const attachmentMarkdown = attachments
      .map(a => a.file_type === 'image'
        ? `\n![imagen](${a.file_url})`
        : `\n📎 [${a.name || 'archivo'}](${a.file_url})`)
      .join('');
    const fullMessage = trimmed + attachmentMarkdown;
    setAttachments([]);

    try {
      const wantsAdvisor = /asesor|agente|humano|persona real/i.test(trimmed);

      // ── LIVE MODE ──────────────────────────────────────────────────────────
      if (chatMode === 'live' && activeTicketId) {
        const tempId = newId();
        setMessages(prev => [...prev, {
          id: tempId, from: 'user',
          sender_name: currentUser.nombre || 'Usuario',
          sender_role: 'user', sender_avatar: currentUser.foto || null,
          text: fullMessage, time: new Date(), _pending: true,
        }]);
        try {
          const saved = await sendSupportTicketMessage(activeTicketId, { message: fullMessage });
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, id: saved?.id ?? m.id, _pending: false } : m
          ));
        } catch {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, _failed: true, _pending: false } : m
          ));
        }
        socketRef.current?.emit('support_stop_typing', { ticketId: activeTicketId, userId: currentUser.id });
        if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }

      // ── WAITING MODE — forward message, bot does NOT respond ───────────────
      } else if (chatMode === 'waiting') {
        setMessages(prev => [...prev, {
          id: newId(), from: 'user',
          sender_name: currentUser.nombre || 'Usuario',
          sender_role: 'user', sender_avatar: currentUser.foto || null,
          text: fullMessage, time: new Date(),
        }]);
        if (activeTicketId) {
          try { await sendSupportTicketMessage(activeTicketId, { message: fullMessage }); } catch { /* silent */ }
        }

      // ── BOT MODE — wants advisor ───────────────────────────────────────────
      } else if (wantsAdvisor && chatMode === 'bot') {
        setMessages(prev => [...prev, {
          id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario',
          sender_role: 'user', text: fullMessage, time: new Date(),
        }]);
        await requestAdvisor(fullMessage);

      // ── BOT MODE — farewell / gratitude → ask if they need more ──────────
      } else if (chatMode === 'bot' && isFarewell(trimmed)) {
        setMessages(prev => [...prev, {
          id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario',
          sender_role: 'user', text: fullMessage, time: new Date(),
        }]);
        addBotMessage('¡Con gusto! 😊 Me alegra haber podido ayudarte.', 800);
        setShowClosePrompt(true);

      // ── BOT MODE — smart intent ────────────────────────────────────────────
      } else {
        setMessages(prev => [...prev, {
          id: newId(), from: 'user', sender_name: currentUser.nombre || 'Usuario',
          sender_role: 'user', text: fullMessage, time: new Date(),
        }]);
        const intent = detectIntent(trimmed);
        if (intent) {
          addBotMessage(intent.response, 1000);
          if (!intent.resolved) {
            addBotMessage('Si el problema persiste, puedo conectarte con un asesor en vivo. 👤', 3000);
          }
        } else {
          addBotMessage(
            'Entiendo tu consulta. ¿Puedes darme más detalles sobre lo que necesitas? 🤔\n\nSi prefieres hablar con una persona, escribe **"asesor"** o usa el botón de abajo.',
            1000
          );
          const userMsgCount = messages.filter(m => m.from === 'user').length;
          if (userMsgCount >= 2) {
            addBotMessage('Parece que tu consulta necesita atención personalizada. ¿Quieres que te conecte con un asesor ahora? 👤', 3500);
          }
        }
      }
    } catch (err) {
      console.error('[SupportChat] handleSend error:', err);
      addBotMessage('Hubo un error al enviar tu mensaje. Por favor intenta nuevamente.', 0);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    // If mention dropdown is open, Enter picks the first candidate
    if (mentionActive && mentionCandidates.length && e.key === 'Enter') {
      e.preventDefault();
      insertMention(mentionCandidates[0]);
      return;
    }
    if (e.key === 'Escape' && mentionActive) {
      setMentionActive(false);
      setMentionQuery('');
      return;
    }
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
    setAttachments([]);
    socketRef.current?.disconnect();
    setMessages([{
      id: newId(), from: 'bot', sender_name: 'RevayBot', sender_role: 'bot',
      text: '¡Hola de nuevo! 🤖 Soy **RevayBot**. ¿En qué puedo ayudarte?',
      time: new Date(),
    }]);
    setShowQuick(true);
  };

  // ── File upload (same as forum uploadAsAttachment) ────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('El archivo supera el límite de 10MB.', 'error'); return; }
    const mime = String(file.type || '');
    const isImage = mime.startsWith('image/');
    const allowed = new Set(['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    if (!isImage && !allowed.has(mime)) { showToast('Solo imágenes, PDF o documentos de texto.', 'error'); return; }
    setIsUploading(true);
    try {
      const uploaded = await uploadSupportFile(file);
      setAttachments(prev => [...prev, {
        file_url: uploaded.url,
        file_type: isImage ? 'image' : 'file',
        name: file.name,
      }]);
    } catch (err) {
      showToast(err.message || 'No se pudo subir el archivo.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  // ── Text formatter (bold + images + file links, mirrors forum renderAttachment) ──
  const formatText = (text) => {
    const value = String(text || '');

    // Password reset special link
    if (value.includes('[Restablecer Contraseña](/forgot-password)')) {
      const parts = value.split('[Restablecer Contraseña](/forgot-password)');
      return (
        <div className="space-y-2">
          <div>{formatText(parts[0])}</div>
          <a href="/forgot-password"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
            <Key size={11} /> Restablecer Contraseña
          </a>
          {parts[1] && <div>{formatText(parts[1])}</div>}
        </div>
      );
    }

    // Split by markdown image, file link, and bold
    const regex = /(!\[imagen\]\(https?:\/\/[^\s)]+\)|📎 \[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*)/g;
    const parts = value.split(regex);
    return parts.map((part, i) => {
      if (!part) return null;
      // Inline image: ![imagen](url)
      const imgMatch = part.match(/^!\[imagen\]\((https?:\/\/[^\s)]+)\)$/);
      if (imgMatch) {
        return (
          <div key={i} className="my-2">
            <a href={imgMatch[1]} target="_blank" rel="noreferrer" className="block">
              <img
                src={imgMatch[1]}
                alt="adjunto"
                className="max-h-56 max-w-full rounded-2xl border border-slate-200 object-contain bg-white shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in"
              />
            </a>
          </div>
        );
      }
      // File link: 📎 [name](url)
      const fileMatch = part.match(/^📎 \[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (fileMatch) {
        return (
          <a key={i} href={fileMatch[2]} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 transition-all my-1">
            <FileText size={11} /> {fileMatch[1]}
          </a>
        );
      }
      // Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      // Plain text with line breaks
      return part.split('\n').map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}{j < arr.length - 1 && <br />}
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
  const isLiveOrWaiting = chatMode === 'live' || chatMode === 'waiting';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-[9990]">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setIsOpen(true); setHasUnread(false); setIsMinimized(false); }}
              className="relative w-14 h-14 rounded-full bg-brand-blue hover:bg-brand-blue-dark text-white shadow-2xl shadow-brand-blue/30 flex items-center justify-center border-none"
              aria-label="Abrir chat de soporte"
            >
              <MessageCircle size={24} />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white">!</span>
              )}
              <span className="absolute inset-0 rounded-full bg-brand-blue/20 animate-ping" />
            </motion.button>
          )}
        </AnimatePresence>

               {/* Chat window */}
               <AnimatePresence>
                 {isOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 20, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 20, scale: 0.95 }}
                     transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                     className={`fixed right-0 bottom-0 z-[9999] max-w-[100vw] w-full sm:w-[420px] md:w-[460px] lg:w-[500px] sm:absolute sm:bottom-0 sm:right-0 bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${isMinimized ? 'h-auto' : 'h-[85vh] sm:h-[560px]'}`}
                   >
              {/* Header */}
              <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-3 shadow-sm">
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
                  <button onClick={() => setIsMinimized(v => !v)}
                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 transition-all">
                    <Minimize2 size={12} />
                  </button>
                  <button onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 transition-all">
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Status bar */}
              {!isMinimized && (
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                  <Shield size={12} className="text-brand-blue" />
                  <span className="text-[10px] font-bold text-slate-700">Soporte seguro y privado</span>
                  <span className="ml-auto text-[9px] text-slate-500 font-bold flex items-center gap-1">
                    {chatMode === 'live' ? <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" /> En vivo</>
                      : chatMode === 'waiting' ? <><Loader2 size={9} className="animate-spin" /> Conectando...</>
                      : <><Clock size={9} /> Respuesta en &lt; 24h</>}
                  </span>
                </div>
              )}

              {/* Messages area */}
              {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
                  {messages.map((msg) => {
                    const isSystem = msg.from === 'bot' && msg.sender_name === 'Sistema';
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
                            <Shield size={9} />{formatText(msg.text)}
                          </span>
                        </div>
                      );
                    }
                    const isMe = msg.from === 'user';
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {msg.from === 'bot' ? (
                          <div className="w-7 h-7 rounded-xl bg-brand-blue flex items-center justify-center shrink-0 mb-4">
                            <Bot size={14} className="text-white" />
                          </div>
                        ) : msg.from === 'advisor' || msg.sender_avatar ? (
                          <UserAvatar user={{ nombre: msg.sender_name, foto: msg.sender_avatar, role: msg.sender_role || 'admin' }} size="xs" className="mb-4 shrink-0" />
                        ) : isMe && currentUser.foto ? (
                          <UserAvatar user={{ nombre: currentUser.nombre, foto: currentUser.foto, role: currentUser.role || 'student' }} size="xs" className="mb-4 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mb-4">
                            <User size={14} className="text-slate-500" />
                          </div>
                        )}
                        {/* Bubble */}
                        <div className="max-w-[75%] space-y-0.5">
                          {msg.from === 'advisor' && (
                            <span className="text-[9px] font-black text-indigo-600 px-1 block">{msg.sender_name}</span>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            isMe ? 'bg-brand-blue text-white rounded-tr-sm'
                              : msg.from === 'advisor' ? 'bg-indigo-50 border border-indigo-200 text-slate-700 rounded-tl-sm'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                          } ${msg._pending ? 'opacity-70' : ''} ${msg._failed ? 'border-rose-300 bg-rose-50' : ''}`}>
                            {isMe ? msg.text : formatText(msg.text)}
                          </div>
                          <p className={`text-[9px] font-bold px-1 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                            {formatTime(msg.time)}{msg._pending ? ' · enviando...' : ''}{msg._failed ? ' · error' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicators */}
                  {(isBotTyping || advisorTyping) && (
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-xl bg-brand-blue flex items-center justify-center shrink-0">
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

                  {/* Quick suggestions — only on first bot message */}
                  {showQuick && messages.length === 1 && chatMode === 'bot' && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Consultas frecuentes</p>
                      {QUICK_SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => handleSend(s.message)}
                          className="w-full text-left px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat closed */}
                  {isClosed && (
                    <div className="mt-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <XCircle size={16} className="text-slate-500" />
                        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Chat Finalizado</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Este chat ha sido cerrado. Gracias por contactarnos.</p>
                      <button onClick={handleStartNewChat}
                        className="px-4 py-2 bg-brand-blue text-white text-xs font-black rounded-xl shadow-md hover:bg-brand-blue-dark transition-all active:scale-95">
                        Iniciar nuevo chat
                      </button>
                    </div>
                  )}

                  {/* Advisor button — shows after first user message in bot mode */}
                  {chatMode === 'bot' && messages.length > 1 && !isClosed && (
                    <div className="pt-2 flex justify-center">
                      <button onClick={() => requestAdvisor('Solicito hablar con un asesor en vivo.')}
                        className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-[11px] font-black rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Headphones size={14} /> Hablar con un asesor
                      </button>
                    </div>
                  )}

                  {/* Close prompt — shows after farewell or in live mode */}
                  {showClosePrompt && (
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <p className="text-[11px] font-bold text-slate-600">¿Necesitas algo más?</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowClosePrompt(false)}
                          className="px-3 py-1.5 bg-brand-blue text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all">
                          Sí, necesito ayuda
                        </button>
                        <button onClick={handleUserCloseChat}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-black rounded-xl hover:bg-slate-300 transition-all flex items-center gap-1">
                          <XCircle size={12} /> No, gracias
                        </button>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input area */}
              {!isMinimized && (
                <div className="p-3 bg-white border-t border-slate-100">
                  {!isClosed ? (
                    <div className="relative">
                      {/* Attachment previews */}
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {attachments.map((a, idx) => (
                            <div key={idx} className="relative group">
                              {a.file_type === 'image' ? (
                                <img src={a.file_url} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-slate-200" />
                              ) : (
                                <div className="h-14 w-14 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 gap-1">
                                  <FileText size={18} className="text-slate-500" />
                                  <span className="text-[8px] text-slate-500 font-bold truncate w-12 text-center px-1">{a.name}</span>
                                </div>
                              )}
                              <button onClick={() => removeAttachment(idx)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none">
                                <X size={9} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mention dropdown — same style as forum */}
                      {mentionActive && mentionCandidates.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
                            <AtSign size={10} className="text-brand-blue" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mencionar</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto py-1">
                            {mentionCandidates.map(member => (
                              <button
                                key={member.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors border-none bg-transparent"
                              >
                                <UserAvatar user={{ nombre: member.nombre, foto: member.foto, role: member.role }} size="xs" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-900 truncate">{member.nombre}</p>
                                  <p className="text-[10px] text-gray-400 truncate capitalize">{member.role} · #{member.id}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 pr-2 pl-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                        {/* Attach button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:bg-slate-100 transition-all shrink-0 border-none bg-transparent disabled:opacity-40"
                          title="Adjuntar imagen o archivo"
                        >
                          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                        </button>

                       <textarea
                           ref={inputRef}
                           value={inputValue}
                           onChange={(e) => {
                               setInputValue(e.target.value);
                               handleUserTyping();
                           }}
                           onKeyDown={handleKeyDown}
                           placeholder={chatMode === 'live' ? 'Escribe al asesor...' : 'Escribe tu consulta aquí...'}
                           rows={1}
                           className="flex-1 bg-none text-xs text-slate-800 placeholder-slate-400 resize-none outline-none font-medium max-h-20 py-1 leading-relaxed border-none"
                           style={{ minHeight: '24px', background: 'none' }}
                       />
                        <button
                          onClick={() => handleSend()}
                          disabled={(!inputValue.trim() && attachments.length === 0) || isBotTyping || isUploading}
                          className="w-8 h-8 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shrink-0">
                          {isBotTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[9px] text-slate-400 font-medium">
                          {chatMode === 'live' ? `En vivo con ${advisorName || 'Asesor'} · Monitores Hub` : chatMode === 'waiting' ? 'Buscando asesor... · Monitores Hub' : 'Powered by RevayBot · Monitores Hub'}
                        </p>
                        {(chatMode === 'live' || chatMode === 'waiting') && (
                          <button onClick={handleUserCloseChat}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[9px] font-black transition-all">
                            <XCircle size={10} /> {chatMode === 'waiting' ? 'Cancelar' : 'Finalizar chat'}
                          </button>
                        )}
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 text-center py-1 font-medium">Sesión cerrada · Monitores Hub</p>
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
