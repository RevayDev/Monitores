import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, BellDot, Bookmark, Paperclip, Plus, Send, Trash2, X, ChevronDown, 
  Bold, Italic, List, Quote, Heading, Type, Link, ListOrdered, MoreVertical, 
  CornerUpLeft, Edit3, AlertOctagon, CheckCircle2 
} from 'lucide-react';
import Modal from '../components/Modal';
import {
  createForum,
  createForumReply,
  deleteForum,
  deleteForumMessage,
  getForumById,
  getForumMembers,
  getForumsByModule,
  getCurrentUser,
  getMyModules,
  getAllUsers,
  toggleForumSave,
  uploadForumFile,
  updateForum,
  updateForumReply,
  updateForumPresence,
  getForumPresence,
  createForumReport
} from '../services/api';
import { ToastContext } from '../context/ToastContext';

const getVisualRole = (userId, userRole, monitorId, members = []) => {
  const roleStr = String(userRole || '').toLowerCase();
  
  // Rule: If Admin/Dev is matriculado (in members list) -> they are acting as Student
  const isEnrolledAdmin = (roleStr === 'dev' || roleStr === 'admin') && members.some(m => Number(m.id) === Number(userId));
  if (isEnrolledAdmin) return 'student';

  if (roleStr === 'dev' || roleStr === 'admin') return 'admin';
  if (Number(userId) === Number(monitorId)) return 'monitor';
  if (roleStr === 'monitor_administrativo') return 'monitor_administrativo';
  if (roleStr === 'monitor_academico' || roleStr === 'monitor') return 'monitor_academico';
  return 'student';
};

const roleBadgeLabel = (userId, userRole, monitorId) => {
  const vRole = getVisualRole(userId, userRole, monitorId);
  if (vRole === 'monitor') return 'Monitor';
  if (vRole === 'monitor_administrativo') return 'M. Administrativo';
  if (vRole === 'monitor_academico') return 'M. Académico';
  if (vRole === 'admin') return 'Admin';
  return 'Estudiante';
};

const SOCKET_URL = 'http://localhost:3000';

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
  if (vRole === 'monitor' || vRole === 'monitor_academico') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (vRole === 'monitor_administrativo') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
  if (vRole === 'admin') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-blue-100 text-blue-800 border border-blue-200';
};

const roleAvatar = (vRole) => {
  if (vRole === 'monitor' || vRole === 'monitor_academico') return 'bg-emerald-100 text-emerald-800';
  if (vRole === 'monitor_administrativo') return 'bg-indigo-100 text-indigo-800';
  if (vRole === 'admin') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-800';
};

const roleMentionStyle = (vRole) => {
  if (vRole === 'monitor' || vRole === 'monitor_academico') return 'bg-green-100 text-green-900';
  if (vRole === 'monitor_administrativo') return 'bg-indigo-100 text-indigo-900';
  if (vRole === 'admin') return 'bg-orange-100 text-orange-900';
  return 'bg-blue-100 text-blue-900';
};

const MentionHighlighter = ({ value, members, monitorId, onChange, onKeyDown, onSelect, onKeyUp, textareaRef, scrollRef, placeholder, className, minHeight }) => {
  const handleScroll = (e) => {
    if (scrollRef && scrollRef.current) {
      scrollRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const renderHighlights = (text) => {
    if (!text) return text;
    const regex = /(@[^#\n]+#\d+|\*\*[^*]+\*\*|_[^_]+_)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('@')) {
        const id = Number((part.match(/#(\d+)$/) || [])[1] || 0);
        const member = (members || []).find((m) => Number(m.id) === id);
        const vRole = getVisualRole(member?.id, member?.role, monitorId);
        return (
          <span key={i} className={`rounded-sm ${roleMentionStyle(vRole)}`}>
            {part}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-black text-gray-900 bg-gray-50">{part}</span>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <span key={i} className="italic text-gray-700 bg-gray-50">{part}</span>;
      }
      return <span key={i}>{part}</span>;
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
    if (vRole === 'monitor_administrativo') return 'bg-indigo-600 text-white';
    if (vRole === 'monitor' || vRole === 'monitor_academico') return 'bg-emerald-500 text-white';
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

const TypingIndicator = ({ users, monitorId }) => {
  if (!users?.length) return null;
  return (
    <div className="absolute bottom-full left-1 mb-3 flex flex-col gap-2 animate-fade-in z-20 pointer-events-none">
      {users.map((user, idx) => (
        <div key={user.user_id + idx} className="flex items-center gap-2">
          <UserAvatar 
            photo={user.foto} 
            name={user.nombre} 
            userId={user.user_id} 
            userRole={user.role} 
            monitorId={monitorId} 
            size="w-8 h-8" 
            className="border-2 border-white shadow-md"
          />
          <div className="typing-bubble shadow-xl">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getMentionQuery = (value) => {
  const match = String(value || '').match(/(?:^|\s)@([^\s#@]*)$/);
  return match ? match[1] || '' : null;
};

const buildMentionToken = (member) => `@${member?.nombre || member?.username || 'Usuario'}#${member.id}`;

const renderRichText = (text, members = [], monitorId) => {
  const value = String(text || '');
  const lines = value.split(/\r?\n/);
  const processedLines = lines.map((line, lineIdx) => {
    let content = line;
    const hMatch = content.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      const cls = level === 1 ? 'text-xl font-black' : level === 2 ? 'text-lg font-black' : 'text-base font-bold';
      return <div key={lineIdx} className={`${cls} my-2 text-gray-900`}>{renderInlines(text, members, monitorId)}</div>;
    }
    if (content.startsWith('>')) {
      return (
        <blockquote key={lineIdx} className="border-l-4 border-gray-300 pl-4 py-1 my-2 text-gray-600 italic bg-gray-50/50 rounded-r-lg">
          {renderInlines(content.slice(1).trim(), members, monitorId)}
        </blockquote>
      );
    }
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
    return <div key={lineIdx} className="min-h-[1.5em]">{renderInlines(content, members, monitorId)}</div>;
  });
  return processedLines;
};

const renderInlines = (text, members = [], monitorId) => {
  if (!text) return null;
  const regex = /(!\[[^\]]*\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s]+|@[^#\n]+#\d+)/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (!part) return null;
    const mdImage = part.match(/^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdImage) {
      return <img key={`img-${idx}`} src={mdImage[1]} alt="imagen" className="max-h-64 rounded-2xl border border-gray-200 my-2 shadow-sm block mx-auto lg:mx-0" />;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={idx} className="italic text-gray-700">{part.slice(1, -1)}</em>;
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return <a key={`u-${idx}`} href={part} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{part}</a>;
    }
    if (/^@[^#]+#\d+$/.test(part)) {
      const id = Number((part.match(/#(\d+)$/) || [])[1] || 0);
      const member = (members || []).find((m) => Number(m.id) === id);
      const label = member ? `@${member.nombre}#${member.id}` : part;
      return (
        <span key={`m-${idx}`} className="inline-flex items-center text-brand-blue font-black hover:underline cursor-pointer group whitespace-nowrap mx-0.5">
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
    images.push({ url: match[1], start: match.index, end: match.index + match[0].length });
  }
  return images;
};

const isMeMentioned = (text, myId) => {
  const content = String(text || '');
  if (!content || !myId) return false;
  return content.includes(`#${myId}`);
};

const isNewlyCreated = (createdAt) => {
  if (!createdAt) return false;
  const fiveMinutes = 5 * 60 * 1000;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff > 0 && diff < fiveMinutes;
};

const isRecentlyMentioned = (createdAt, text, myId) => {
  if (!isMeMentioned(text, myId)) return false;
  return isNewlyCreated(createdAt);
};

const LiveImagePreview = ({ text, cursorPosition }) => {
  const images = extractImagesWithMetadata(text);
  if (!images.length) return null;
  return (
    <div className="flex gap-2 p-3 bg-gray-50/50 rounded-2xl overflow-x-auto border border-gray-100 mb-3 animate-fade-in group">
      {images.map((img, i) => {
        const isActive = cursorPosition >= img.start && cursorPosition <= img.end;
        return (
          <div key={i} className={`relative flex-shrink-0 transition-all duration-300 rounded-xl p-1 border-2 ${isActive ? 'border-brand-blue bg-white shadow-lg scale-105 z-10' : 'border-transparent opacity-70 scale-95'}`}>
            <img src={img.url} alt="preview" className="h-24 w-auto rounded-lg object-contain bg-white" />
            <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase shadow-sm transition-all ${isActive ? 'bg-brand-blue text-white' : 'bg-white/80 text-gray-500'}`}>{isActive ? 'Editando ahora' : 'Imagen'}</div>
            {isActive && <div className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-1 rounded-full shadow-lg animate-bounce"><Plus size={10} className="rotate-45" /></div>}
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
  const repliesEndRef = useRef(null); 
  
  const [toolbar, setToolbar] = useState({ isVisible: false, x: 0, y: 0, target: null });
  const [cursorPos, setCursorPos] = useState({ thread: 0, reply: 0 });
  const [editingId, setEditingId] = useState(null); 
  const [editContent, setEditContent] = useState('');
  const [moduleData, setModuleData] = useState(null);
  const [myModules, setMyModules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const lastPresenceUpdateRef = useRef(0);
  const [newCount, setNewCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showBanner, setShowBanner] = useState(false);
  const bannerTimerRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [hasEnteredThread, setHasEnteredThread] = useState(false);
  const [allAdmins, setAllAdmins] = useState([]);

  useEffect(() => {
    return () => { if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current); };
  }, []);

  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [selectedCreateModuleId, setSelectedCreateModuleId] = useState(moduleId);
  const [publishing, setPublishing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [mentionTarget, setMentionTarget] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showInsertMenu, setShowInsertMenu] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null); 
  const [reportTarget, setReportTarget] = useState(null); 
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReadOnlyParam = useMemo(() => queryParams.get('readOnly') === 'true', [queryParams]);
  const forumIdParam = useMemo(() => queryParams.get('forumId'), [queryParams]);

  const isReadOnly = useMemo(() => {
    return isReadOnlyParam || (detail && detail.is_active_member === false);
  }, [isReadOnlyParam, detail]);

  const handleReport = async () => {
    if (!reportReason.trim() || !reportTarget) return;
    setReporting(true);
    try {
      await createForumReport({ type: reportTarget.type, targetId: reportTarget.id, reason: reportReason.trim() });
      showToast('Reporte enviado correctamente', 'success');
      setReportTarget(null);
      setReportReason('');
    } catch (error) { showToast(error.message || 'Error al enviar reporte', 'error'); } 
    finally { setReporting(false); }
  };

  const handleInputKeyDown = (target, e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mentionTarget === target) return; 
      e.preventDefault();
      if (target === 'thread') handleCreate();
      else if (target === 'reply') handleReply();
      else if (target === 'edit') handleSaveEdit();
      return;
    }
    const isDelete = e.key === 'Backspace' || e.key === 'Delete';
    if (!isDelete) return;
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    if (start !== end) return;
    const value = target === 'thread' ? content : (target === 'edit' ? editContent : replyText);
    const mentionRegex = /@[^#\n]+#\d+\s?/g;
    let match;
    while ((match = mentionRegex.exec(value)) !== null) {
      const mStart = match.index;
      const mEnd = mStart + match[0].length;
      const isInside = (e.key === 'Backspace' && start > mStart && start <= mEnd) || (e.key === 'Delete' && start >= mStart && start < mEnd);
      if (isInside) {
        e.preventDefault();
        const nextValue = value.slice(0, mStart) + value.slice(mEnd);
        if (target === 'thread') setContent(nextValue);
        else if (target === 'edit') setEditContent(nextValue);
        else setReplyText(nextValue);
        setTimeout(() => { if (ref) { ref.focus(); ref.setSelectionRange(mStart, mStart); } }, 0);
        return;
      }
    }
  };

  const canModerate = ['admin', 'dev'].includes(String(currentUser?.role || '').toLowerCase());
  const moduleMonitorId = Number(moduleData?.monitorId || 0);

  const mentionCandidates = useMemo(() => {
    const query = String(mentionQuery || '').trim().toLowerCase();
    
    // Combine members and all admins, then remove duplicates and self
    const combined = [...members];
    allAdmins.forEach(admin => {
        if (!combined.some(m => Number(m.id) === Number(admin.id))) {
            combined.push(admin);
        }
    });

    const sorted = combined.sort((a, b) => {
      const aMonitor = String(a.role || '').includes('monitor') ? 0 : 1;
      const bMonitor = String(b.role || '').includes('monitor') ? 0 : 1;
      return aMonitor - bMonitor;
    });
    const base = sorted.filter(m => Number(m.id) !== Number(currentUser?.id));
    if (!query) return base;
    return base.filter((member) => {
      if (member.is_active === 0 || member.is_active === false) return false;
      const name = String(member.nombre || '').toLowerCase();
      const username = String(member.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [members, allAdmins, mentionQuery, currentUser]);


  useEffect(() => {
    const saved = localStorage.getItem(`forum_draft_thread_${moduleId}`);
    if (saved) setContent(saved);
  }, [moduleId]);

  useEffect(() => {
    if (selectedId) {
      const saved = localStorage.getItem(`forum_draft_reply_${selectedId}`);
      if (saved) setReplyText(saved);
      else setReplyText(''); 
    }
  }, [selectedId]);

  useEffect(() => {
    if (content.trim()) localStorage.setItem(`forum_draft_thread_${moduleId}`, content);
    else localStorage.removeItem(`forum_draft_thread_${moduleId}`);
  }, [content, moduleId]);

  useEffect(() => {
    if (selectedId && replyText.trim()) localStorage.setItem(`forum_draft_reply_${selectedId}`, replyText);
    else if (selectedId) localStorage.removeItem(`forum_draft_reply_${selectedId}`);
  }, [replyText, selectedId]);

  const scrollToBottom = () => { if (repliesEndRef.current) repliesEndRef.current.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => {
    if (detail || typingUsers.length > 0) {
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [detail?.replies?.length, detail?.comments?.length, typingUsers.length, selectedId]);

  const loadThreads = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const fetchThreadsPromise = getForumsByModule(moduleId).catch(err => {
        if (err.message?.toLowerCase().includes('acceso') || err.message?.toLowerCase().includes('perteneces')) return [];
        throw err; 
      });
      const [forumRows, modulesRows] = await Promise.all([fetchThreadsPromise, getMyModules()]);
      const list = forumRows || [];
      const ownModules = modulesRows || [];
      setThreads(list);
      setMyModules(ownModules);
      if (!selectedCreateModuleId && ownModules.length) setSelectedCreateModuleId(Number(ownModules[0].id));
      const maxId = list.reduce((acc, item) => Math.max(acc, Number(item.id || 0)), 0);
      if (lastSeenId && maxId > lastSeenId) {
        const newItems = list.filter(t => Number(t.id) > lastSeenId);
        newItems.forEach(item => { if (isMeMentioned(item.content, currentUser?.id)) showToast(`Fuiste mencionado en: ${item.title || 'un hilo'}`, 'info'); });
      }
      if (!lastSeenId && maxId) setLastSeenId(maxId);
      if (lastSeenId && maxId > lastSeenId) setNewCount(maxId - lastSeenId);
      if (forumIdParam && !selectedId) {
        const pId = Number(forumIdParam);
        if (pId > 0) setSelectedId(pId);
      } else if (!selectedId && list.length) setSelectedId(list[0].id);
      if (selectedId && !forumIdParam) {
        const exists = list.some((item) => Number(item.id) === Number(selectedId));
        if (!exists && list.length > 0) setSelectedId(list[0].id);
      }
      const current = ownModules.find((m) => Number(m.id) === moduleId);
      setModuleData(current || null);
    } catch (error) { showToast(error.message || 'Error cargando foro.', 'error'); navigate('/mis-monitorias'); } 
    finally { if (!silent) setLoading(false); }
  };

  const loadDetail = async (threadId, { silent = false } = {}) => {
    if (!threadId) return setDetail(null);
    try {
      const data = await getForumById(threadId);
      const replies = (data.replies || data.comments || []);
      const maxReplyId = replies.reduce((acc, r) => Math.max(acc, Number(r.id)), 0);
      const storageKey = `forum_seen_reply_${threadId}`;
      const savedLastSeen = Number(localStorage.getItem(storageKey) || 0);
      setDetail({ ...data, lastSeenReplyId: savedLastSeen });
      if (!silent && savedLastSeen > 0 && maxReplyId > savedLastSeen) {
        setShowBanner(true);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setShowBanner(false), 300000); 
      }
      localStorage.setItem(storageKey, String(maxReplyId || savedLastSeen || 0));
      if (!silent) { setEditingId(null); setShowInsertMenu(null); }
    } catch (error) { if (!silent) { showToast(error.message || 'No se pudo abrir la pregunta.', 'error'); setDetail(null); } }
  };

  useEffect(() => { loadThreads(); }, [moduleId]);
  useEffect(() => {
    const loadBase = async () => {
      try {
        const [user, memberRows, userRows] = await Promise.all([
          getCurrentUser(), 
          getForumMembers(moduleId),
          getAllUsers().catch(() => [])
        ]);
        setCurrentUser(user || null);
        setMembers(memberRows || []);
        
        const admins = (userRows || []).filter(u => 
          (
            ['admin', 'dev'].includes(String(u.role || '').toLowerCase()) || 
            ['admin', 'dev'].includes(String(u.baseRole || '').toLowerCase())
          ) && Number(u.id) !== Number(user?.id)
        );
        setAllAdmins(admins);
      } catch (error) { showToast(error.message || 'No se pudieron cargar los miembros del foro.', 'error'); }
    };
    loadBase();
  }, [moduleId]);

  useEffect(() => { setShowBanner(false); loadDetail(selectedId); }, [selectedId]);
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket || !selectedId) {
      localStorage.removeItem('monitores_active_forum_id');
      return;
    }
    localStorage.setItem('monitores_active_forum_id', String(selectedId));
    socket.emit('join_forum', selectedId);
    setHasEnteredThread(false);

    socket.on('user_typing', ({ user }) => {
      setTypingUsers(prev => {
        if (prev.find(u => u.user_id === user.user_id)) return prev;
        return [...prev, user];
      });
    });

    socket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.user_id !== userId));
    });

    socket.on('message_received', (newMessage) => {
      setDetail(prev => {
        if (!prev || Number(prev.id) !== Number(selectedId)) return prev;
        const replies = prev.replies || prev.comments || [];
        if (replies.find(r => r.id === newMessage.id)) return prev;
        return {
          ...prev,
          replies: [...replies, newMessage]
        };
      });
    });

    return () => {
      localStorage.removeItem('monitores_active_forum_id');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('message_received');
    };
  }, [socket, selectedId]);

  const typingTimeoutRef = useRef(null);
  const handleTypingEmit = () => {
    if (!socket || !selectedId || !currentUser) return;
    socket.emit('typing', {
      forumId: selectedId,
      user: {
        user_id: currentUser.id,
        nombre: currentUser.nombre,
        foto: currentUser.foto,
        role: currentUser.role
      }
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { forumId: selectedId, userId: currentUser.id });
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const markSeen = () => {
    const maxId = threads.reduce((acc, item) => Math.max(acc, Number(item.id || 0)), 0);
    setLastSeenId(maxId);
    setNewCount(0);
    setHasEnteredThread(true);
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
    requestAnimationFrame(() => { ref.focus(); const pos = start + text.length; ref.setSelectionRange(pos, pos); });
  };

  const uploadAndInsertImage = async (file, target = 'thread') => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return showToast('Solo imagen para esta opcion.', 'error');
    if (file.size > 10 * 1024 * 1024) return showToast('El archivo supera el limite de 10MB.', 'error');
    try {
      const uploaded = await uploadForumFile(file);
      const markdown = ` ![imagen](${uploaded.url}) `;
      insertAtCursor(target, markdown);
    } catch (error) { showToast(error.message || 'No se pudo insertar la imagen.', 'error'); }
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
    } catch (error) { showToast(error.message || 'No se pudo subir archivo.', 'error'); }
  };

  const onMentionAwareInput = (target, value) => {
    handleTypingEmit(); // Trigger for any input
    if (target === 'thread') setContent(value);
    else if (target === 'edit') setEditContent(value);
    else setReplyText(value);
    const ref = target === 'thread' ? threadTextRef.current : (target === 'edit' ? null : replyTextRef.current);
    if (ref) setCursorPos((prev) => ({ ...prev, [target]: ref.selectionStart }));
    const query = getMentionQuery(value);
    if (query === null) { setMentionTarget(null); setMentionQuery(''); return; }
    setMentionTarget(target);
    setMentionQuery(query);
  };

  const handleEditorSelection = (target) => {
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    setCursorPos((prev) => ({ ...prev, [target]: start }));
    if (start === end) { setToolbar((prev) => ({ ...prev, isVisible: false })); return; }
    const rect = ref.getBoundingClientRect();
    setToolbar({ isVisible: true, x: rect.left + 20, y: rect.top - 50, target, start, end });
  };

  const applyFormat = (type) => {
    const { target, start, end } = toolbar;
    const value = target === 'thread' ? content : replyText;
    const selection = value.slice(start, end);
    let next = value;
    if (type === 'bold') next = value.slice(0, start) + `**${selection}**` + value.slice(end);
    else if (type === 'italic') next = value.slice(0, start) + `_${selection}_` + value.slice(end);
    else if (type === 'h1') next = value.slice(0, start) + `# ${selection}` + value.slice(end);
    else if (type === 'quote') next = value.slice(0, start) + `> ${selection}` + value.slice(end);
    if (target === 'thread') setContent(next);
    else if (target === 'edit') setEditContent(next);
    else setReplyText(next);
    setToolbar((prev) => ({ ...prev, isVisible: false }));
  };

  const handleStartEdit = (item, isReply = false) => { setEditingId({ id: item.id, isReply }); setEditContent(item.content); };
  const quickReply = (item) => {
    const mention = buildMentionToken({ nombre: item.author_name, id: item.user_id || item.author_id });
    setReplyText((prev) => `${prev.trim()} ${mention} `.trimStart());
    if (replyTextRef.current) { setTimeout(() => { replyTextRef.current.focus(); const pos = replyTextRef.current.value.length; replyTextRef.current.setSelectionRange(pos, pos); }, 0); }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      if (editingId.isReply) await updateForumReply(editingId.id, { content: editContent });
      else await updateForum(editingId.id, { content: editContent });
      showToast('Editado correctamente.', 'success');
      setEditingId(null);
      loadDetail(selectedId, { silent: true });
    } catch (err) { showToast(err.message, 'error'); }
  };

  const insertMention = (target, member) => {
    const token = `${buildMentionToken(member)} `;
    const current = target === 'thread' ? content : (target === 'edit' ? editContent : replyText);
    const replaced = String(current || '').replace(/(?:^|\s)@([^\s#@]*)$/, (chunk) => `${chunk.startsWith(' ') ? ' ' : ''}${token}`).trimStart();
    if (target === 'thread') setContent(replaced);
    else if (target === 'edit') setEditContent(replaced);
    else setReplyText(replaced);
    setMentionTarget(null);
    setMentionQuery('');
    const ref = target === 'thread' ? threadTextRef.current : (target === 'edit' ? null : replyTextRef.current);
    if (ref) { setTimeout(() => { ref.focus(); const newPos = replaced.length; ref.setSelectionRange(newPos, newPos); }, 0); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return showToast('Completa titulo y contenido.', 'error');
    if (!selectedCreateModuleId) return showToast('Debes seleccionar un modulo.', 'error');
    if (publishing) return;
    setPublishing(true);
    try {
      const response = await createForum({ modulo_id: Number(selectedCreateModuleId), title: title.trim(), content: content.trim(), attachments });
      if (response?.success === false) return showToast('No se pudo publicar', 'error');
      setTitle(''); setContent(''); setAttachments([]); setMentionTarget(null); setMentionQuery(''); setShowInsertMenu(null); setShowCreate(false);
      localStorage.removeItem(`forum_draft_thread_${moduleId}`);
      updateForumPresence(Number(selectedCreateModuleId), false).catch(() => {});
      if (Number(selectedCreateModuleId) !== Number(moduleId)) navigate(`/modules/${selectedCreateModuleId}/forum`);
      else { await loadThreads(); markSeen(); }
      showToast('Publicacion creada correctamente', 'success');
    } catch (error) { showToast(error?.message || 'No se pudo publicar', 'error'); } 
    finally { setPublishing(false); }
  };

  const handleReply = async () => {
    if (!selectedId || !replyText.trim() || !currentUser) return;
    if (replying) return;
    setReplying(true);
    try {
      const response = await createForumReply(selectedId, { content: replyText.trim(), attachments: replyAttachments });
      if (response?.success === false) return showToast('No se pudo publicar', 'error');
      
      const commentId = response.reply?.id || response.id || response;
      const enrichedReply = {
        id: commentId,
        content: replyText.trim(),
        user_id: currentUser.id,
        author_name: currentUser.nombre,
        author_photo: currentUser.foto,
        author_role: currentUser.role,
        created_at: new Date().toISOString(),
        attachments: (replyAttachments || []).map((a, i) => ({ ...a, id: `tmp-${Date.now()}-${i}` }))
      };

      if (socket && selectedId) {
        socket.emit('new_message', { forumId: selectedId, message: enrichedReply });
      }

      setHasEnteredThread(true); // Suppress banner logic
      setShowBanner(false);      // Explicitly hide banner
      await loadDetail(selectedId);
      await loadThreads({ silent: true });
      setReplyText(''); setReplyAttachments([]); setMentionTarget(null); setMentionQuery('');
      localStorage.removeItem(`forum_draft_reply_${selectedId}`);
      updateForumPresence(selectedId, false).catch(() => {});
      showToast('Respuesta publicada correctamente', 'success');
    } catch (error) { showToast(error?.message || 'No se pudo publicar', 'error'); } 
    finally { setReplying(false); }
  };

  const handleSaveToggle = async (forumId) => {
    const res = await toggleForumSave(forumId);
    await loadThreads({ silent: true });
    if (Number(selectedId) === Number(forumId)) await loadDetail(forumId);
    showToast(res.saved ? 'Foro guardado.' : 'Foro removido de guardados.', 'success');
  };

  const handleDeleteRecord = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'forum') {
        await deleteForum(confirmDelete.id);
        if (Number(selectedId) === Number(confirmDelete.id)) setSelectedId(null);
        showToast('Foro eliminado.', 'success');
      } else { await deleteForumMessage(confirmDelete.id); showToast('Respuesta eliminada.', 'success'); }
      await loadThreads();
      if (selectedId) await loadDetail(selectedId);
    } catch (error) { showToast(error.message || 'Error al eliminar', 'error'); } 
    finally { setConfirmDelete(null); }
  };

  const renderMentionDropdown = (target) => {
    if (mentionTarget !== target) return null;
    if (!mentionCandidates.length) return null;
    return (
      <div className="absolute left-0 bottom-full mb-1 z-20 w-[320px] max-h-44 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl p-1 space-y-1">
        {mentionCandidates.map((member) => (
          <button key={member.id} type="button" onClick={() => insertMention(target, member)} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <UserAvatar photo={member.foto} name={member.nombre} userId={member.id} userRole={member.role} monitorId={moduleMonitorId} size="w-8 h-8" />
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
            <button type="button" onClick={() => removeAttachment(idx, target)} className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 inline-flex items-center justify-center"><X size={12} /></button>
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
      <div className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1 border border-white/10 animate-scale-in" style={{ left: toolbar.x, top: toolbar.y }}>
        <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-white/10 rounded-lg" title="Negrita"><Bold size={14} /></button>
        <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-white/10 rounded-lg" title="Cursiva"><Italic size={14} /></button>
        <button onClick={() => applyFormat('h1')} className="p-2 hover:bg-white/10 rounded-lg" title="Título"><Heading size={14} /></button>
        <button onClick={() => applyFormat('quote')} className="p-2 hover:bg-white/10 rounded-lg" title="Cita"><Quote size={14} /></button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button onClick={() => setToolbar({isVisible: false})} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><X size={14} /></button>
      </div>
    );
  };

  if (loading) return <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <button onClick={() => navigate('/mis-monitorias')} className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold"><ArrowLeft size={18} /> Volver</button>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-black text-gray-900 tracking-tight">Foro del modulo</h1><p className="text-gray-500 text-sm mt-1">{moduleData?.modulo || detail?.module_name || `Modulo #${moduleId}`}</p></div>
          <div className="flex items-center gap-2">
            <button onClick={loadThreads} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black">Actualizar</button>
            {!isReadOnly && <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-black inline-flex items-center gap-2"><Plus size={14} /> Crear pregunta</button>}
            {isReadOnly && <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase text-center border border-dashed border-gray-200">Lectura</div>}
            {newCount > 0 && <button onClick={markSeen} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black inline-flex items-center gap-1"><BellDot size={14} /> {newCount} nuevas</button>}
          </div>
        </div>
        <div className={`grid grid-cols-1 ${isReadOnly ? '' : 'lg:grid-cols-3'} gap-4`}>
          {!isReadOnly && (
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
                       <button onClick={() => handleSaveToggle(thread.id)} className={`px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 ${thread.is_saved ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}><Bookmark size={11} /> {thread.is_saved ? 'Guardado' : 'Guardar'}</button>
                       {(Number(thread.user_id) === Number(currentUser?.id) || canModerate) && <button onClick={() => setConfirmDelete({ id: thread.id, type: 'forum' })} className="px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 bg-red-100 text-red-600"><Trash2 size={11} /> Borrar</button>}
                    </div>
                  </div>
                ))}
                {!threads.length && <p className="text-sm text-gray-400">No hay preguntas todavia.</p>}
              </div>
            </section>
          )}
          <section className={`${isReadOnly ? 'lg:col-span-3 w-full' : 'lg:col-span-2'} bg-white p-5 rounded-3xl border border-gray-100 space-y-4`}>
            {!detail ? <p className="text-sm text-gray-500">Selecciona una pregunta para ver el detalle.</p> : (
              <>
                <div className="rounded-2xl border transition-all duration-500 overflow-hidden relative p-4 space-y-2 bg-gray-50 border-gray-100">
                   {isMeMentioned(detail.content, currentUser?.id) && <div className="absolute bottom-2 right-2 px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full border border-amber-200 flex items-center gap-1 z-10 shadow-sm animate-pulse">✨ Te mencionaron</div>}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar photo={detail.author_photo} name={detail.author_name} userId={detail.user_id} userRole={detail.author_role} monitorId={moduleMonitorId} size="w-9 h-9" />
                      <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 leading-tight">{detail.title}</p>
                            {(() => {
                              const vRole = getVisualRole(detail.user_id, detail.author_role, moduleMonitorId, members);
                              if (vRole === 'admin' || vRole === 'monitor') {
                                return (
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border shadow-sm ${roleChip(vRole)}`}>
                                    {roleBadgeLabel(detail.user_id, detail.author_role, moduleMonitorId, members)}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border shadow-sm bg-gray-100 text-gray-700 border-gray-200">Autor</span>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-1">por {detail.author_name} · {new Date(detail.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 h-fit relative">
                      <button onClick={() => handleSaveToggle(detail.id)} className={`p-2 rounded-xl text-[11px] inline-flex items-center gap-1 transition-all hover:bg-opacity-80 active:scale-90 ${detail.is_saved ? 'bg-amber-100 text-amber-700' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'}`}><Bookmark size={14} fill={detail.is_saved ? 'currentColor' : 'none'} /></button>
                      <div className="relative group">
                        <button onClick={() => setActiveMenuId(activeMenuId === 'thread' ? null : 'thread')} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-gray-50 rounded-xl transition-all active:scale-90"><MoreVertical size={16} /></button>
                        {activeMenuId === 'thread' && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-scale-in">
                            {Number(detail.user_id) !== Number(currentUser?.id) && <button onClick={() => { setReportTarget({ type: 'thread', id: detail.id, name: detail.author_name }); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2"><AlertOctagon size={12} /> Reportar</button>}
                            {(Number(detail.user_id) === Number(currentUser?.id) || canModerate) && !isReadOnly && <button onClick={() => { handleStartEdit(detail, false); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-600 hover:bg-blue-50 flex items-center gap-2"><Edit3 size={12} /> Editar</button>}
                            {(Number(detail.user_id) === Number(currentUser?.id) || canModerate) && !isReadOnly && <button onClick={() => { setConfirmDelete({ id: detail.id, type: 'forum' }); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Eliminar</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {editingId?.id === detail.id && !editingId.isReply ? (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-inner mt-2">
                      <MentionHighlighter value={editContent} members={members} monitorId={moduleMonitorId} onChange={(e) => onMentionAwareInput('edit', e.target.value)} onKeyDown={(e) => handleInputKeyDown('edit', e)} placeholder="Edita tu publicación..." minHeight="100px" onSelect={() => handleEditorSelection('edit')} />
                      <div className="flex justify-end gap-2 text-xs"><button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-md text-gray-500">Cancelar</button><button onClick={handleSaveEdit} className="px-4 py-1.5 rounded-md font-black bg-brand-blue text-white shadow-md">Guardar</button></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed py-2">{renderRichText(detail.content, members, moduleMonitorId)}</div>
                      {!!detail.attachments?.length && <div className="grid grid-cols-2 gap-2 mt-4">{detail.attachments.map((item) => <div key={item.id} className="rounded-xl overflow-hidden border border-gray-100">{renderAttachment(item)}</div>)}</div>}
                    </>
                  )}
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-auto pr-1">
                  {(() => {
                    const allReplies = (detail.replies || detail.comments || []);
                    const lastSeen = detail.lastSeenReplyId || 0;
                    const result = [];
                    let bannerShown = false;
                    const newMessages = allReplies.filter(r => Number(r.id) > lastSeen);
                    allReplies.forEach((reply) => {
                      if (!reply || !reply.id) return; // Defensive skip
                      if (!bannerShown && showBanner && !hasEnteredThread && lastSeen > 0 && Number(reply.id) > lastSeen) {
                        result.push(
                          <div key="new-banner" className="flex items-center gap-4 py-4 animate-fade-in">
                            <div className="flex-1 h-px bg-emerald-100" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 select-none">
                              - {newMessages.length || 1} mensajes nuevos -
                            </span>
                            <div className="flex-1 h-px bg-emerald-100" />
                          </div>
                        );
                        bannerShown = true;
                      }
                      const isReplyNewForMe = isRecentlyMentioned(reply.created_at, reply.content, currentUser?.id);
                      result.push(
                        <div key={reply.id} className={`rounded-2xl border transition-all duration-500 p-4 relative ${isReplyNewForMe ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                          <div className="flex justify-between items-start mb-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-500">
                              <UserAvatar photo={reply.author_photo} name={reply.author_name || 'Usuario'} userId={reply.user_id} userRole={reply.author_role} monitorId={moduleMonitorId} size="w-6 h-6" />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-900">{reply.author_name || 'Usuario'}</span>
                                  {(() => {
                                    const vRole = getVisualRole(reply.user_id, reply.author_role, moduleMonitorId, members);
                                    const isEnrolledAdmin = ['admin', 'dev'].includes(String(reply.author_role || '').toLowerCase()) && 
                                                         members.some(m => Number(m.id) === Number(reply.user_id));
                                    
                                    // Rule: Show badge if Admin/Monitor (that isn't enrolled) OR if they are the thread author
                                    // BUT: "si el admin esta matriculado... no se mostrara la etiqueta"
                                    if (isEnrolledAdmin) return null;

                                    const isAuthorOfThread = Number(reply.user_id) === Number(detail?.user_id);
                                    if (vRole === 'admin' || vRole === 'monitor' || isAuthorOfThread) {
                                      return (
                                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${roleChip(vRole)}`}>
                                          {isAuthorOfThread && vRole !== 'admin' && vRole !== 'monitor' ? 'Autor' : roleBadgeLabel(reply.user_id, reply.author_role, moduleMonitorId, members)}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <span className="text-[9px]">{new Date(reply.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 h-fit relative">
                              {!isReadOnly && <button onClick={() => quickReply(reply)} className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"><CornerUpLeft size={14} /></button>}
                              <button onClick={() => setActiveMenuId(activeMenuId === `reply-${reply.id}` ? null : `reply-${reply.id}`)} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-gray-50 rounded-xl transition-all active:scale-90"><MoreVertical size={14} /></button>
                              {activeMenuId === `reply-${reply.id}` && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-scale-in">
                                  {Number(reply.user_id) !== Number(currentUser?.id) && <button onClick={() => { setReportTarget({ type: 'reply', id: reply.id, name: reply.author_name }); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2"><AlertOctagon size={12} /> Reportar</button>}
                                  {Number(reply.user_id) === Number(currentUser?.id) && !isReadOnly && <button onClick={() => { handleStartEdit(reply, true); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-600 hover:bg-blue-50 flex items-center gap-2"><Edit3 size={12} /> Editar</button>}
                                  {(canModerate || Number(reply.user_id) === Number(currentUser?.id)) && !isReadOnly && <button onClick={() => { setConfirmDelete({ id: reply.id, type: 'reply' }); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Eliminar</button>}
                                </div>
                              )}
                            </div>
                          </div>
                          {editingId?.id === reply.id && editingId.isReply ? (
                            <div className="space-y-3 bg-gray-50/50 p-3 rounded-xl border border-gray-200 mt-2">
                              <MentionHighlighter value={editContent} members={members} monitorId={moduleMonitorId} onChange={(e) => onMentionAwareInput('edit', e.target.value)} onKeyDown={(e) => handleInputKeyDown('edit', e)} placeholder="Edita tu respuesta..." minHeight="60px" onSelect={() => handleEditorSelection('edit')} />
                              <div className="flex justify-end gap-2 text-[10px]"><button onClick={() => setEditingId(null)} className="px-2 py-1 rounded-md text-gray-500">Cancelar</button><button onClick={handleSaveEdit} className="px-3 py-1 rounded-md font-black bg-brand-blue text-white">Guardar</button></div>
                            </div>
                          ) : <div className="text-sm text-gray-700 whitespace-pre-wrap mt-2 leading-relaxed">{renderRichText(reply.content, members, moduleMonitorId)}</div>}
                          {!!reply.attachments?.length && <div className="grid grid-cols-2 gap-2 mt-4">{reply.attachments.map((item) => <div key={item.id} className="rounded-xl border border-gray-100 overflow-hidden">{renderAttachment(item)}</div>)}</div>}
                        </div>
                      );
                    });
                    return result;
                  })()}
                  {!(detail.replies || detail.comments || []).length && <p className="text-sm text-gray-400">Sin respuestas.</p>}
                  <div ref={repliesEndRef} />
                </div>
                {!isReadOnly && (
                  <div className={`rounded-2xl border transition-all duration-300 p-3 space-y-2 relative ${editingId ? 'bg-gray-50' : 'border-gray-100'}`}>
                    <TypingIndicator users={typingUsers} monitorId={moduleMonitorId} />
                    <div className="relative">
                      <MentionHighlighter textareaRef={replyTextRef} scrollRef={replyScrollRef} value={replyText} members={members} monitorId={moduleMonitorId} onChange={(e) => onMentionAwareInput('reply', e.target.value)} onKeyDown={(e) => handleInputKeyDown('reply', e)} placeholder="Escribe una respuesta... usa @ para mencionar" minHeight="100px" onSelect={() => handleEditorSelection('reply')} />
                      {renderMentionDropdown('reply')}
                    </div>
                    <LiveImagePreview text={replyText} cursorPosition={cursorPos.reply} />
                    {attachmentGrid(replyAttachments, 'reply')}
                    <div className="flex flex-wrap gap-2 items-center">
                      {insertMenu('reply')}
                      <input ref={replyFileRef} type="file" className="hidden" onChange={(e) => uploadAsAttachment(e.target.files?.[0], 'reply')} />
                      <input ref={replyImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndInsertImage(e.target.files?.[0], 'reply')} />
                      <button disabled={replying || !!editingId} onClick={handleReply} className="ml-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 hover:bg-black hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"><Send size={14} /> {replying ? 'Publicando...' : 'Responder'}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Crear pregunta">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-gray-500">Modulo</label>
            <select value={selectedCreateModuleId || ''} onChange={(e) => setSelectedCreateModuleId(Number(e.target.value))} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="">Selecciona un modulo</option>
              {myModules.map((mod) => <option key={mod.id} value={mod.id}>{mod.modulo || `Modulo #${mod.id}`}</option>)}
            </select>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Titulo de la pregunta" />
          <div className="relative">
            <MentionHighlighter textareaRef={threadTextRef} scrollRef={threadScrollRef} value={content} members={members} monitorId={moduleMonitorId} onChange={(e) => onMentionAwareInput('thread', e.target.value)} onKeyDown={(e) => handleInputKeyDown('thread', e)} placeholder="Describe tu duda... usa @ para mencionar" minHeight="120px" onSelect={() => handleEditorSelection('thread')} />
            {renderMentionDropdown('thread')}
          </div>
          <LiveImagePreview text={content} cursorPosition={cursorPos.thread} />
          {attachmentGrid(attachments, 'thread')}
          <div className="flex flex-wrap gap-2 items-center">
            {insertMenu('thread')}
            <input ref={threadFileRef} type="file" className="hidden" onChange={(e) => uploadAsAttachment(e.target.files?.[0], 'thread')} />
            <input ref={threadImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndInsertImage(e.target.files?.[0], 'thread')} />
            <button disabled={publishing} onClick={handleCreate} className="ml-auto px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-black inline-flex items-center gap-1 disabled:opacity-50"><Plus size={12} /> {publishing ? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!reportTarget} onClose={() => setReportTarget(null)} title="Reportar contenido">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3"><AlertOctagon className="text-amber-600" size={20} /><div><p className="text-xs font-black text-amber-800 uppercase tracking-wide">¿Por qué reportas esto?</p><p className="text-[10px] text-amber-600">Reportando a: {reportTarget?.name}</p></div></div>
          <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Describe el motivo del reporte..." className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
          <div className="flex justify-end gap-2 pt-2"><button onClick={() => setReportTarget(null)} className="px-4 py-2 rounded-xl text-gray-500 text-sm font-bold hover:bg-gray-100">Cancelar</button><button disabled={reporting || !reportReason.trim()} onClick={handleReport} className="px-5 py-2 rounded-xl bg-amber-600 text-white text-sm font-black shadow-lg shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50">{reporting ? 'Enviando...' : 'Enviar Reporte'}</button></div>
        </div>
      </Modal>
      <div className={`fixed inset-0 z-[120] ${confirmDelete ? 'flex' : 'hidden'} items-center justify-center p-4`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setConfirmDelete(null)}></div>
        <div className="relative bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-sm space-y-4 shadow-2xl animate-scale-in">
          <div className="p-3 bg-red-50 rounded-full w-fit mx-auto text-red-600"><AlertOctagon size={24} /></div>
          <div className="text-center"><h3 className="text-lg font-black text-gray-900">¿Estás seguro?</h3><p className="text-sm text-gray-500 mt-1">Esta acción es permanente y no se puede deshacer.</p></div>
          <div className="flex gap-2 justify-center pt-2"><button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-all">No, cancelar</button><button onClick={handleDeleteRecord} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95">Sí, eliminar</button></div>
        </div>
      </div>
      <FloatingToolbar />
    </div>
  );
};

export default ModuleForum;
