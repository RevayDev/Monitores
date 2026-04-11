import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellDot, Bookmark, Paperclip, Plus, Send, Trash2, X, ChevronDown, Bold, Italic, List, Quote, Heading, Type, Link, ListOrdered } from 'lucide-react';
import Modal from '../components/Modal';
import {
  createForum,
  createForumReply,
  deleteForum,
  getForumById,
  getForumMembers,
  getForumsByModule,
  getCurrentUser,
  getMyModules,
  toggleForumSave,
  uploadForumFile
} from '../services/api';
import { ToastContext } from '../App';

const getVisualRole = (userId, userRole, monitorId) => {
  if (Number(userId) === Number(monitorId)) return 'monitor';
  const role = String(userRole || '').toLowerCase();
  if (role.includes('admin') || role.includes('dev')) return 'admin';
  return 'student'; // Other monitors and students are 'student'
};

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
]);

const roleChip = (vRole) => {
  if (vRole === 'monitor') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (vRole === 'admin') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-blue-100 text-blue-800 border border-blue-200';
};

const roleAvatar = (vRole) => {
  if (vRole === 'monitor') return 'bg-emerald-100 text-emerald-800';
  if (vRole === 'admin') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-800';
};


const roleMentionStyle = (vRole) => {
  if (vRole === 'monitor') return 'bg-green-100 text-green-900';
  if (vRole === 'admin') return 'bg-orange-100 text-orange-900';
  return 'bg-blue-100 text-blue-900';
};

const MentionHighlighter = ({ value, members, monitorId, onChange, onKeyDown, onSelect, onKeyUp, textareaRef, scrollRef, placeholder, className, minHeight }) => {
  const handleScroll = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const renderHighlights = (text) => {
    if (!text) return text;
    const regex = /(@[^#]+#\d+)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.match(regex)) {
        const id = Number((part.match(/#(\d+)$/) || [])[1] || 0);
        const member = (members || []).find((m) => Number(m.id) === id);
        const vRole = getVisualRole(member?.id, member?.role, monitorId);
        return (
          <span key={i} className={`rounded-sm ${roleMentionStyle(vRole)}`}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200">
      <div
        ref={scrollRef}
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden bg-white text-gray-900 select-none px-3 py-2 leading-[1.5]`}
        style={{ fontSize: '14px', fontFamily: '"Inter", sans-serif', letterSpacing: 'normal' }}
        aria-hidden="true"
      >
        {renderHighlights(value)}
        {value?.endsWith('\n') ? ' ' : ''}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onKeyUp={onKeyUp}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`w-full bg-transparent relative z-10 caret-black leading-[1.5] resize-none px-3 py-2 outline-none border-none`}
        style={{ minHeight, fontSize: '14px', fontFamily: '"Inter", sans-serif', letterSpacing: 'normal' }}
      />
    </div>
  );
};

const roleUnderline = (vRole) => {
  if (vRole === 'monitor') return 'bg-green-100/50 text-green-900';
  if (vRole === 'admin') return 'bg-orange-100/50 text-orange-900';
  return 'bg-blue-100/50 text-blue-900 border-none';
};

const roleBadgeLabel = (userId, userRole, monitorId) => {
  if (Number(userId) === Number(monitorId)) return 'Monitor';
  const role = String(userRole || '').toLowerCase();
  if (role.includes('admin') || role.includes('dev')) return 'Admin';
  return 'Estudiante';
};

const UserAvatar = ({ photo, name, userId, userRole, monitorId, size = 'w-9 h-9', className = '' }) => {
  if (photo) {
    return (
      <div className={`${size} rounded-full overflow-hidden bg-gray-100 ${className}`}>
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const initial = String(name || 'U').trim().charAt(0).toUpperCase();
  const roleClasses = (vRole) => {
    if (vRole === 'admin') return 'bg-amber-500 text-white';
    if (vRole === 'monitor') return 'bg-emerald-500 text-white';
    return 'bg-brand-blue text-white';
  };
  const vRole = getVisualRole(userId, userRole, monitorId);
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-xs font-black ${roleClasses(vRole)} ${className}`}>
      {initial}
    </div>
  );
};

const renderAttachment = (item) => {
  if (!item?.file_url) return null;
  if (item.file_type === 'image') {
    return <img src={item.file_url} alt="adjunto" className="max-h-48 rounded-xl border border-gray-200" />;
  }
  return (
    <a href={item.file_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
      Abrir archivo
    </a>
  );
};

const getMentionQuery = (value) => {
  const match = String(value || '').match(/(?:^|\s)@([^\s#@]*)$/);
  return match ? match[1] || '' : null;
};

const buildMentionToken = (member) => `@${member?.nombre || member?.username || 'Usuario'}#${member.id}`;

const renderRichText = (text, members = [], monitorId) => {
  const value = String(text || '');
  
  // Dividimos por bloques (lineas) para manejar Markdown estructural (titulos, listas, citas)
  const lines = value.split(/\r?\n/);
  
  const processedLines = lines.map((line, lineIdx) => {
    let content = line;
    
    // 1. Manejo de Bloques Estructurales
    // Titulos
    const hMatch = content.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      const cls = level === 1 ? 'text-xl font-black' : level === 2 ? 'text-lg font-black' : 'text-base font-bold';
      return <div key={lineIdx} className={`${cls} my-2 text-gray-900`}>{renderInlines(text, members, monitorId)}</div>;
    }
    
    // Citas
    if (content.startsWith('>')) {
      return (
        <blockquote key={lineIdx} className="border-l-4 border-gray-300 pl-4 py-1 my-2 text-gray-600 italic bg-gray-50/50 rounded-r-lg">
          {renderInlines(content.slice(1).trim(), members, monitorId)}
        </blockquote>
      );
    }
    
    // Listas
    const listMatch = content.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const bullet = listMatch[2];
      const text = listMatch[3];
      return (
        <div key={lineIdx} className="flex gap-2 pl-4 my-0.5">
          <span className="text-gray-400 select-none font-bold">{bullet.includes('.') ? bullet : '•'}</span>
          <div className="flex-1">{renderInlines(text, members, monitorId)}</div>
        </div>
      );
    }

    // Linea normal
    return <div key={lineIdx} className="min-h-[1.5em]">{renderInlines(content, members, monitorId)}</div>;
  });

  return processedLines;
};

// Funcion para procesar Negritas, Cursivas, Menciones e Imagenes dentro de una linea
const renderInlines = (text, members = [], monitorId) => {
  if (!text) return null;
  
  // Regex para: Imagenes, Negritas, Cursivas, Links, Menciones
  const regex = /(!\[[^\]]*\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s]+|@[^\s#@]+#\d+)/g;
  const parts = text.split(regex);
  
  return parts.map((part, idx) => {
    if (!part) return null;
    
    // Imagenes
    const mdImage = part.match(/^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdImage) {
      return <img key={`img-${idx}`} src={mdImage[1]} alt="imagen" className="max-h-64 rounded-2xl border border-gray-200 my-2 shadow-sm block mx-auto lg:mx-0" />;
    }
    
    // Negritas
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
    }
    
    // Cursivas
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={idx} className="italic text-gray-700">{part.slice(1, -1)}</em>;
    }
    
    // Links
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return <a key={`u-${idx}`} href={part} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{part}</a>;
    }
    
    // Menciones
    if (/^@[^#]+#\d+$/.test(part)) {
      const id = Number((part.match(/#(\d+)$/) || [])[1] || 0);
      const member = (members || []).find((m) => Number(m.id) === id);
      const label = member ? `@${member.nombre}#${member.id}` : part;
      const vRole = getVisualRole(member?.id, member?.role, monitorId);
      return (
        <span key={`m-${idx}`} className={`inline-flex items-center px-1 py-0.5 rounded-md text-[11px] font-medium leading-none ${roleUnderline(vRole)} whitespace-nowrap`}>
          {label}
        </span>
      );
    }
    
    return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
  });
};

const extractImagesWithMetadata = (text) => {
  const regex = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const images = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    images.push({
      url: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return images;
};

const LiveImagePreview = ({ text, cursorPosition }) => {
  const images = extractImagesWithMetadata(text);
  if (!images.length) return null;

  return (
    <div className="flex gap-2 p-3 bg-gray-50/50 rounded-2xl overflow-x-auto border border-gray-100 mb-3 animate-fade-in group">
      {images.map((img, i) => {
        const isActive = cursorPosition >= img.start && cursorPosition <= img.end;
        return (
          <div 
            key={i} 
            className={`relative flex-shrink-0 transition-all duration-300 rounded-xl p-1 border-2 ${isActive ? 'border-brand-blue bg-white shadow-lg scale-105 z-10' : 'border-transparent opacity-70 scale-95'}`}
          >
            <img src={img.url} alt="preview" className="h-24 w-auto rounded-lg object-contain bg-white" />
            <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase shadow-sm transition-all ${isActive ? 'bg-brand-blue text-white' : 'bg-white/80 text-gray-500'}`}>
              {isActive ? 'Editando ahora' : 'Imagen'}
            </div>
            {isActive && (
              <div className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-1 rounded-full shadow-lg animate-bounce">
                <Plus size={10} className="rotate-45" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ModuleForum = () => {
  const { id } = useParams();
  const moduleId = Number(id);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  const threadTextRef = useRef(null);
  const replyTextRef = useRef(null);
  const threadFileRef = useRef(null);
  const replyFileRef = useRef(null);
  const threadImageRef = useRef(null);
  const replyImageRef = useRef(null);
  const threadScrollRef = useRef(null);
  const replyScrollRef = useRef(null);
  
  // Estados para barra flotante de formato
  const [toolbar, setToolbar] = useState({ isVisible: false, x: 0, y: 0, target: null });
  const [cursorPos, setCursorPos] = useState({ thread: 0, reply: 0 });

  const [moduleData, setModuleData] = useState(null);
  const [myModules, setMyModules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState(0);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [selectedCreateModuleId, setSelectedCreateModuleId] = useState(moduleId);
  const [publishing, setPublishing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [mentionTarget, setMentionTarget] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showInsertMenu, setShowInsertMenu] = useState(null);

  const handleSmartDelete = (target, e) => {
    const isDelete = e.key === 'Backspace' || e.key === 'Delete';
    if (!isDelete) return;

    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (!ref) return;

    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    if (start !== end) return;

    const value = target === 'thread' ? content : replyText;
    const mentionRegex = /@[^#]+#\d+\s?/g;
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      const mStart = match.index;
      const mEnd = mStart + match[0].length;
      
      const isInside = (e.key === 'Backspace' && start > mStart && start <= mEnd) ||
                       (e.key === 'Delete' && start >= mStart && start < mEnd);

      if (isInside) {
        e.preventDefault();
        const nextValue = value.slice(0, mStart) + value.slice(mEnd);
        if (target === 'thread') setContent(nextValue);
        else setReplyText(nextValue);
        
        setTimeout(() => {
          ref.focus();
          ref.setSelectionRange(mStart, mStart);
        }, 0);
        return;
      }
    }
  };

  const canModerate = ['monitor', 'monitor_academico', 'monitor_administrativo', 'admin', 'dev'].includes(String(currentUser?.role || '').toLowerCase());
  const moduleMonitorId = Number(moduleData?.monitorId || 0);

  const mentionCandidates = useMemo(() => {
    const query = String(mentionQuery || '').trim().toLowerCase();
    const sorted = [...(members || [])].sort((a, b) => {
      const aMonitor = String(a.role || '').includes('monitor') ? 0 : 1;
      const bMonitor = String(b.role || '').includes('monitor') ? 0 : 1;
      return aMonitor - bMonitor;
    });
    if (!query) return sorted;
    return sorted.filter((member) => {
      if (Number(member.id) === Number(currentUser?.id)) return false;
      const name = String(member.nombre || '').toLowerCase();
      const username = String(member.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [members, mentionQuery, currentUser]);

  const loadThreads = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [forumRows, modulesRows] = await Promise.all([getForumsByModule(moduleId), getMyModules()]);
      const list = forumRows || [];
      const ownModules = modulesRows || [];
      setThreads(list);
      setMyModules(ownModules);

      if (!selectedCreateModuleId && ownModules.length) setSelectedCreateModuleId(Number(ownModules[0].id));

      const maxId = list.reduce((acc, item) => Math.max(acc, Number(item.id || 0)), 0);
      if (!lastSeenId && maxId) setLastSeenId(maxId);
      if (lastSeenId && maxId > lastSeenId) setNewCount(maxId - lastSeenId);
      if (!selectedId && list.length) setSelectedId(list[0].id);
      if (selectedId && !list.some((item) => Number(item.id) === Number(selectedId))) setSelectedId(list[0]?.id || null);

      const current = ownModules.find((m) => Number(m.id) === moduleId);
      setModuleData(current || null);
    } catch (error) {
      showToast(error.message || 'Error cargando foro.', 'error');
      navigate('/mis-monitorias');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadDetail = async (threadId) => {
    if (!threadId) return setDetail(null);
    try {
      const data = await getForumById(threadId);
      setDetail(data || null);
      setReplyText('');
      setReplyAttachments([]);
      setMentionTarget(null);
      setMentionQuery('');
      setShowInsertMenu(null);
    } catch (error) {
      showToast(error.message || 'No se pudo abrir la pregunta.', 'error');
      setDetail(null);
    }
  };

  useEffect(() => { loadThreads(); }, [moduleId]);

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [user, memberRows] = await Promise.all([getCurrentUser(), getForumMembers(moduleId)]);
        setCurrentUser(user || null);
        setMembers(memberRows || []);
      } catch (error) {
        showToast(error.message || 'No se pudieron cargar los miembros del foro.', 'error');
      }
    };
    loadBase();
  }, [moduleId]);

  useEffect(() => { loadDetail(selectedId); }, [selectedId]);
  useEffect(() => {
    const timer = setInterval(() => loadThreads({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, [moduleId, selectedId, lastSeenId]);

  const markSeen = () => {
    const maxId = threads.reduce((acc, item) => Math.max(acc, Number(item.id || 0)), 0);
    setLastSeenId(maxId);
    setNewCount(0);
  };

  const removeAttachment = (index, target = 'thread') => {
    if (target === 'thread') setAttachments((prev) => prev.filter((_, idx) => idx !== index));
    else setReplyAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const insertAtCursor = (target, text) => {
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    const value = target === 'thread' ? content : replyText;
    if (!ref) return;
    const start = ref.selectionStart ?? value.length;
    const end = ref.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    if (target === 'thread') setContent(next);
    else setReplyText(next);
    requestAnimationFrame(() => {
      ref.focus();
      const pos = start + text.length;
      ref.setSelectionRange(pos, pos);
    });
  };

  const uploadAndInsertImage = async (file, target = 'thread') => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return showToast('Solo imagen para esta opcion.', 'error');
    if (file.size > 10 * 1024 * 1024) return showToast('El archivo supera el limite de 10MB.', 'error');
    try {
      const uploaded = await uploadForumFile(file);
      const markdown = ` ![imagen](${uploaded.url}) `;
      insertAtCursor(target, markdown);
    } catch (error) {
      showToast(error.message || 'No se pudo insertar la imagen.', 'error');
    }
  };

  const uploadAsAttachment = async (file, target = 'thread') => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showToast('El archivo supera el limite de 10MB.', 'error');
    const mime = String(file.type || '');
    if (!mime.startsWith('image/') && !allowedMimeTypes.has(mime)) return showToast('Tipo de archivo no permitido.', 'error');

    try {
      const uploaded = await uploadForumFile(file);
      const next = { file_url: uploaded.url, file_type: uploaded.kind === 'image' ? 'image' : 'file' };
      if (target === 'thread') setAttachments((prev) => [...prev, next]);
      else setReplyAttachments((prev) => [...prev, next]);
    } catch (error) {
      showToast(error.message || 'No se pudo subir archivo.', 'error');
    }
  };

  const onMentionAwareInput = (target, value) => {
    if (target === 'thread') setContent(value);
    else setReplyText(value);

    // Actualizar posicion del cursor para resaltar imagenes
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (ref) {
      setCursorPos((prev) => ({ ...prev, [target]: ref.selectionStart }));
    }

    const query = getMentionQuery(value);
    if (query === null) {
      setMentionTarget(null);
      setMentionQuery('');
      return;
    }

    setMentionTarget(target);
    setMentionQuery(query);
  };
  
  const handleEditorSelection = (target) => {
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (!ref) return;

    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    
    // Actualizar cursor para feedback de imagenes incluso sin seleccion
    setCursorPos((prev) => ({ ...prev, [target]: start }));

    if (start === end) {
      setToolbar((prev) => ({ ...prev, isVisible: false }));
      return;
    }

    // Calcular posición para la barra flotante
    // Usamos el mirror div para posicionar
    const rect = ref.getBoundingClientRect();
    setToolbar({
      isVisible: true,
      x: rect.left + 20, // Aproximacion simple o centrada
      y: rect.top - 50,
      target,
      start,
      end
    });
  };

  const applyFormat = (type) => {
    const { target, start, end } = toolbar;
    const value = target === 'thread' ? content : replyText;
    const selection = value.slice(start, end);
    let next = value;
    let offset = 0;

    if (type === 'bold') {
      next = value.slice(0, start) + `**${selection}**` + value.slice(end);
      offset = 2;
    } else if (type === 'italic') {
      next = value.slice(0, start) + `_${selection}_` + value.slice(end);
      offset = 1;
    } else if (type === 'h1') {
      next = value.slice(0, start) + `# ${selection}` + value.slice(end);
      offset = 2;
    } else if (type === 'quote') {
      next = value.slice(0, start) + `> ${selection}` + value.slice(end);
      offset = 2;
    }

    if (target === 'thread') setContent(next);
    else setReplyText(next);
    setToolbar((prev) => ({ ...prev, isVisible: false }));
  };

  const insertMention = (target, member) => {
    const token = `${buildMentionToken(member)} `;
    const current = target === 'thread' ? content : replyText;
    const replaced = String(current || '').replace(/(?:^|\s)@([^\s#@]*)$/, (chunk) => `${chunk.startsWith(' ') ? ' ' : ''}${token}`).trimStart();
    if (target === 'thread') setContent(replaced);
    else setReplyText(replaced);
    setMentionTarget(null);
    setMentionQuery('');
    
    // Auto-focus and set cursor after the inserted space
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (ref) {
      setTimeout(() => {
        ref.focus();
        const newPos = replaced.length;
        ref.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return showToast('Completa titulo y contenido.', 'error');
    if (!selectedCreateModuleId) return showToast('Debes seleccionar un modulo.', 'error');
    if (publishing) return;

    setPublishing(true);
    try {
      const response = await createForum({
        modulo_id: Number(selectedCreateModuleId),
        title: title.trim(),
        content: content.trim(),
        attachments
      });

      if (response?.success === false) return showToast('No se pudo publicar', 'error');

      setTitle('');
      setContent('');
      setAttachments([]);
      setMentionTarget(null);
      setMentionQuery('');
      setShowInsertMenu(null);
      setShowCreate(false);

      if (Number(selectedCreateModuleId) !== Number(moduleId)) navigate(`/modules/${selectedCreateModuleId}/forum`);
      else {
        await loadThreads();
        markSeen();
      }

      showToast('Publicacion creada correctamente', 'success');
    } catch (error) {
      showToast(error?.message || 'No se pudo publicar', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    if (replying) return;

    setReplying(true);
    try {
      const response = await createForumReply(selectedId, {
        content: replyText.trim(),
        attachments: replyAttachments
      });

      if (response?.success === false) return showToast('No se pudo publicar', 'error');

      await loadDetail(selectedId);
      await loadThreads({ silent: true });
      setReplyText('');
      setReplyAttachments([]);
      setMentionTarget(null);
      setMentionQuery('');
      showToast('Publicacion creada correctamente', 'success');
    } catch (error) {
      showToast(error?.message || 'No se pudo publicar', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleSaveToggle = async (forumId) => {
    const res = await toggleForumSave(forumId);
    await loadThreads({ silent: true });
    if (Number(selectedId) === Number(forumId)) await loadDetail(forumId);
    showToast(res.saved ? 'Foro guardado.' : 'Foro removido de guardados.', 'success');
  };

  const handleDeleteForum = async (forumId) => {
    await deleteForum(forumId);
    if (Number(selectedId) === Number(forumId)) setSelectedId(null);
    await loadThreads();
    showToast('Foro eliminado.', 'success');
    setConfirmDeleteId(null);
  };

  const renderMentionDropdown = (target) => {
    if (mentionTarget !== target) return null;
    if (!mentionCandidates.length) return null;

    return (
      <div className="absolute left-0 bottom-full mb-1 z-20 w-[320px] max-h-44 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl p-1 space-y-1">
        {mentionCandidates.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => insertMention(target, member)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black overflow-hidden ${roleAvatar(getVisualRole(member.id, member.role, moduleMonitorId))}`}>
              {member?.foto ? <img src={member.foto} alt={member.nombre} className="w-full h-full object-cover" /> : String(member.nombre || member.username || 'U').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 truncate">{buildMentionToken(member)}</p>
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] items-center gap-1 font-bold uppercase ${roleChip(getVisualRole(member.id, member.role, moduleMonitorId))}`}>
                {roleBadgeLabel(member.id, member.role, moduleMonitorId) || member.role}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const attachmentGrid = (items, target) => {
    if (!items?.length) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <div key={`${item.file_url}-${idx}`} className="rounded-xl border border-gray-100 bg-gray-50 p-2 relative">
            <button
              type="button"
              onClick={() => removeAttachment(idx, target)}
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 inline-flex items-center justify-center"
            >
              <X size={12} />
            </button>
            {renderAttachment(item)}
          </div>
        ))}
      </div>
    );
  };

  const insertMenu = (target) => (
    <div className="relative group/insert">
      <button type="button" onClick={() => setShowInsertMenu(showInsertMenu === target ? null : target)} className="px-3 py-2 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-700 inline-flex items-center gap-1 hover:bg-gray-200 transition-colors">
        <Plus size={12} /> Insertar <ChevronDown size={12} />
      </button>
      {showInsertMenu === target && (
        <div className="absolute bottom-[110%] left-0 w-44 rounded-xl border border-gray-200 bg-white shadow-xl p-2 space-y-1 z-30 animate-scale-in">
          <button type="button" onClick={() => { setShowInsertMenu(null); if (target === 'thread') threadImageRef.current?.click(); else replyImageRef.current?.click(); }} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2"><Plus size={12} /> Imagen en texto</button>
          <button type="button" onClick={() => { setShowInsertMenu(null); if (target === 'thread') threadFileRef.current?.click(); else replyFileRef.current?.click(); }} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2"><Paperclip size={12} /> Archivo adjunto</button>
        </div>
      )}
    </div>
  );

  const FloatingToolbar = () => {
    if (!toolbar.isVisible) return null;
    return (
      <div 
        className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1 border border-white/10 animate-scale-in"
        style={{ left: toolbar.x, top: toolbar.y }}
      >
        <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-white/10 rounded-lg" title="Negrita"><Bold size={14} /></button>
        <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-white/10 rounded-lg" title="Cursiva"><Italic size={14} /></button>
        <button onClick={() => applyFormat('h1')} className="p-2 hover:bg-white/10 rounded-lg" title="Título"><Heading size={14} /></button>
        <button onClick={() => applyFormat('quote')} className="p-2 hover:bg-white/10 rounded-lg" title="Cita"><Quote size={14} /></button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button onClick={() => setToolbar({isVisible: false})} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><X size={14} /></button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <button onClick={() => navigate('/mis-monitorias')} className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold">
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Foro del modulo</h1>
            <p className="text-gray-500 text-sm mt-1">{moduleData?.modulo || `Modulo #${moduleId}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadThreads} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black">Actualizar</button>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-black inline-flex items-center gap-2">
              <Plus size={14} /> Crear pregunta
            </button>
            {newCount > 0 && (
              <button onClick={markSeen} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black inline-flex items-center gap-1">
                <BellDot size={14} /> {newCount} nuevas
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-1 bg-white p-4 rounded-3xl border border-gray-100 space-y-3">
            <h2 className="font-black text-gray-900 text-sm uppercase">Preguntas</h2>
            <div className="space-y-2 max-h-[62vh] overflow-auto pr-1">
              {threads.map((thread) => (
                <div key={thread.id} className={`w-full text-left rounded-2xl p-3 border ${Number(selectedId) === Number(thread.id) ? 'border-brand-blue bg-blue-50/50' : 'border-gray-100 bg-gray-50'}`}>
                  <button onClick={() => setSelectedId(thread.id)} className="w-full text-left">
                    <p className="text-sm text-gray-900 line-clamp-1">{thread.title}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{thread.content}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{thread.responses_count || 0} respuestas</p>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button onClick={() => handleSaveToggle(thread.id)} className={`px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 ${thread.is_saved ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                      <Bookmark size={11} /> {thread.is_saved ? 'Guardado' : 'Guardar'}
                    </button>
                    {(Number(thread.user_id) === Number(currentUser?.id) || canModerate) && (
                      <button onClick={() => setConfirmDeleteId(thread.id)} className="px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 bg-red-100 text-red-600">
                        <Trash2 size={11} /> Borrar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!threads.length && <p className="text-sm text-gray-400">No hay preguntas todavia.</p>}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white p-5 rounded-3xl border border-gray-100 space-y-4">
            {!detail ? (
              <p className="text-sm text-gray-500">Selecciona una pregunta para ver el detalle.</p>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar photo={detail.author_photo} name={detail.author_name} userId={detail.user_id} userRole={detail.author_role} monitorId={moduleMonitorId} size="w-9 h-9" />
                      <div>
                        <p className="text-gray-900">{detail.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">por {detail.author_name} · {detail.subject_name || moduleData?.modulo || `Modulo #${moduleId}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveToggle(detail.id)} className={`px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 ${detail.is_saved ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                        <Bookmark size={11} /> {detail.is_saved ? 'Guardado' : 'Guardar'}
                      </button>
                      {(Number(detail.user_id) === Number(currentUser?.id) || canModerate) && (
                        <button onClick={() => setConfirmDeleteId(detail.id)} className="px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 bg-red-100 text-red-600">
                          <Trash2 size={11} /> Borrar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{renderRichText(detail.content, members, moduleMonitorId)}</p>
                  {!!detail.attachments?.length && <div className="space-y-2">{detail.attachments.map((item) => <div key={item.id}>{renderAttachment(item)}</div>)}</div>}
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                  {(detail.replies || detail.comments || []).map((reply) => (
                    <div key={reply.id} className="rounded-2xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <UserAvatar photo={reply.author_photo} name={reply.author_name} userId={reply.user_id} userRole={reply.author_role} monitorId={moduleMonitorId} size="w-6 h-6" />
                        <span>{reply.author_name}</span> . respuesta
                        {Number(reply.user_id) === Number(detail.user_id) && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">Autor</span>}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{renderRichText(reply.content, members, moduleMonitorId)}</p>
                      {!!reply.attachments?.length && <div className="space-y-2 mt-2">{reply.attachments.map((item) => <div key={item.id}>{renderAttachment(item)}</div>)}</div>}
                    </div>
                  ))}
                  {!detail.replies?.length && !detail.comments?.length && <p className="text-sm text-gray-400">Sin respuestas.</p>}
                </div>

                <div className="rounded-2xl border border-gray-100 p-3 space-y-2">
                  <div className="relative">
                    <MentionHighlighter
                      textareaRef={replyTextRef}
                      scrollRef={replyScrollRef}
                      value={replyText}
                      members={members}
                      monitorId={moduleMonitorId}
                      onChange={(e) => onMentionAwareInput('reply', e.target.value)}
                      onKeyDown={(e) => handleSmartDelete('reply', e)}
                      placeholder="Escribe una respuesta... usa @ para mencionar"
                      minHeight="100px"
                      onSelect={() => handleEditorSelection('reply')}
                    />
                    {renderMentionDropdown('reply')}
                  </div>
                  
                  <LiveImagePreview text={replyText} cursorPosition={cursorPos.reply} />
                  {attachmentGrid(replyAttachments, 'reply')}

                  <div className="flex flex-wrap gap-2 items-center">
                    {insertMenu('reply')}
                    <input ref={replyFileRef} type="file" className="hidden" onChange={(e) => uploadAsAttachment(e.target.files?.[0], 'reply')} />
                    <input ref={replyImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndInsertImage(e.target.files?.[0], 'reply')} />
                    <button disabled={replying} onClick={handleReply} className="ml-auto px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-1 disabled:opacity-50">
                      <Send size={12} /> {replying ? 'Publicando...' : 'Responder'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Crear pregunta">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-gray-500">Modulo</label>
            <select
              value={selectedCreateModuleId || ''}
              onChange={(e) => setSelectedCreateModuleId(Number(e.target.value))}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Selecciona un modulo</option>
              {myModules.map((mod) => <option key={mod.id} value={mod.id}>{mod.modulo || `Modulo #${mod.id}`}</option>)}
            </select>
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Titulo de la pregunta" />

          <div className="relative">
            <MentionHighlighter
              textareaRef={threadTextRef}
              scrollRef={threadScrollRef}
              value={content}
              members={members}
              monitorId={moduleMonitorId}
              onChange={(e) => onMentionAwareInput('thread', e.target.value)}
              onKeyDown={(e) => handleSmartDelete('thread', e)}
              placeholder="Describe tu duda... usa @ para mencionar"
              minHeight="120px"
              onSelect={() => handleEditorSelection('thread')}
            />
            {renderMentionDropdown('thread')}
          </div>

          <LiveImagePreview text={content} cursorPosition={cursorPos.thread} />
          {attachmentGrid(attachments, 'thread')}

          <div className="flex flex-wrap gap-2 items-center">
            {insertMenu('thread')}
            <input ref={threadFileRef} type="file" className="hidden" onChange={(e) => uploadAsAttachment(e.target.files?.[0], 'thread')} />
            <input ref={threadImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndInsertImage(e.target.files?.[0], 'thread')} />

            <button disabled={publishing} onClick={handleCreate} className="ml-auto px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-black inline-flex items-center gap-1 disabled:opacity-50">
              <Plus size={12} /> {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Eliminar publicacion">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Seguro que deseas eliminar esta publicacion?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancelar</button>
            <button onClick={() => handleDeleteForum(confirmDeleteId)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>
      
      <FloatingToolbar />
    </div>
  );
};

export default ModuleForum;
