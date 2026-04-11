import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellDot, Bookmark, Paperclip, Plus, Send, Trash2, X, ChevronDown } from 'lucide-react';
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
  'application/x-zip-compressed'
]);

const roleChip = (role) => {
  const value = String(role || '').toLowerCase();
  if (value.includes('admin')) return 'bg-amber-100 text-amber-800';
  if (value.includes('monitor')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-blue-100 text-blue-800';
};

const roleAvatar = (role) => {
  const value = String(role || '').toLowerCase();
  if (value.includes('admin')) return 'bg-amber-100 text-amber-800';
  if (value.includes('monitor')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-blue-100 text-blue-800';
};

const roleUnderline = (role) => {
  const value = String(role || '').toLowerCase();
  if (value.includes('admin')) return 'decoration-amber-500 text-amber-900 bg-amber-50';
  if (value.includes('monitor')) return 'decoration-emerald-500 text-emerald-900 bg-emerald-50';
  return 'decoration-blue-500 text-blue-900 bg-blue-50';
};

const roleBadgeLabel = (role, isModuleMonitor = false) => {
  const value = String(role || '').toLowerCase();
  if (value === 'admin') return 'Admin';
  if (isModuleMonitor && value === 'monitor_academico') return 'Monitor';
  return null;
};

const UserAvatar = ({ photo, name, role, size = 'w-9 h-9', className = '' }) => {
  if (photo) {
    return (
      <div className={`${size} rounded-full overflow-hidden bg-gray-100 ${className}`}>
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const initial = String(name || 'U').trim().charAt(0).toUpperCase();
  const roleClasses = (role) => {
    const value = String(role || '').toLowerCase();
    if (value.includes('admin')) return 'bg-amber-500 text-white';
    if (value.includes('monitor')) return 'bg-emerald-500 text-white';
    return 'bg-brand-blue text-white';
  };
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-xs font-black ${roleClasses(role)} ${className}`}>
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

const renderRichText = (text, members = []) => {
  const value = String(text || '');
  const parts = value.split(/(!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+|@[^\s#@]+#\d+)/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    const mdImage = part.match(/^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdImage) {
      return <img key={`img-${idx}`} src={mdImage[1]} alt="imagen" className="max-h-48 rounded-xl border border-gray-200 my-1" />;
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return <a key={`u-${idx}`} href={part} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{part}</a>;
    }
    if (/^@[^\s#@]+#\d+$/.test(part)) {
      const id = Number((part.match(/#(\d+)$/) || [])[1] || 0);
      const member = (members || []).find((m) => Number(m.id) === id);
      const label = member ? `@${member.nombre}#${member.id}` : part;
      return (
        <span
          key={`m-${idx}`}
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black underline decoration-2 underline-offset-2 ${roleUnderline(member?.role)}`}
        >
          {label}
        </span>
      );
    }
    return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
  });
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
    if (e.key !== 'Backspace') return;
    const ref = target === 'thread' ? threadTextRef.current : replyTextRef.current;
    if (!ref) return;

    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    if (start !== end) return;

    const value = target === 'thread' ? content : replyText;
    const textBefore = value.slice(0, start);
    const mentionMatch = textBefore.match(/@[^#\s]+#\d+\s?$/);

    if (mentionMatch) {
      e.preventDefault();
      const mentionToken = mentionMatch[0];
      const nextValue = value.slice(0, start - mentionToken.length) + value.slice(end);
      if (target === 'thread') setContent(nextValue);
      else setReplyText(nextValue);
      
      const newPos = start - mentionToken.length;
      setTimeout(() => {
        ref.focus();
        ref.setSelectionRange(newPos, newPos);
      }, 0);
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
      const name = String(member.nombre || '').toLowerCase();
      const username = String(member.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [members, mentionQuery]);

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

    const query = getMentionQuery(value);
    if (query === null) {
      setMentionTarget(null);
      setMentionQuery('');
      return;
    }

    setMentionTarget(target);
    setMentionQuery(query);
  };

  const insertMention = (target, member) => {
    const token = `${buildMentionToken(member)} `;
    const current = target === 'thread' ? content : replyText;
    const replaced = String(current || '').replace(/(?:^|\s)@([^\s#@]*)$/, (chunk) => `${chunk.startsWith(' ') ? ' ' : ''}${token}`).trimStart();
    if (target === 'thread') setContent(replaced);
    else setReplyText(replaced);
    setMentionTarget(null);
    setMentionQuery('');
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black overflow-hidden ${roleAvatar(member?.role)}`}>
              {member?.foto ? <img src={member.foto} alt={member.nombre} className="w-full h-full object-cover" /> : String(member.nombre || member.username || 'U').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{buildMentionToken(member)}</p>
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${roleChip(member.role)}`}>{member.role}</span>
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
    <div className="relative">
      <button type="button" onClick={() => setShowInsertMenu(showInsertMenu === target ? null : target)} className="px-3 py-2 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 inline-flex items-center gap-1">
        <Plus size={12} /> Insertar <ChevronDown size={12} />
      </button>
      {showInsertMenu === target && (
        <div className="absolute bottom-[110%] left-0 w-44 rounded-xl border border-gray-200 bg-white shadow-xl p-2 space-y-1 z-30">
          <button type="button" onClick={() => { setShowInsertMenu(null); if (target === 'thread') threadImageRef.current?.click(); else replyImageRef.current?.click(); }} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-sm font-bold text-gray-700">Imagen en texto</button>
          <button type="button" onClick={() => { setShowInsertMenu(null); if (target === 'thread') threadFileRef.current?.click(); else replyFileRef.current?.click(); }} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-sm font-bold text-gray-700">Archivo adjunto</button>
        </div>
      )}
    </div>
  );

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
                    <p className="font-black text-sm text-gray-900 line-clamp-1">{thread.title}</p>
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
                      <UserAvatar photo={detail.author_photo} name={detail.author_name} role={detail.author_role} size="w-9 h-9" />
                      <div>
                      <p className="font-black text-gray-900">{detail.title}</p>
                      <p className="text-xs text-gray-500">por {detail.author_name} · {detail.subject_name || moduleData?.modulo || `Modulo #${moduleId}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveToggle(detail.id)} className={`px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 ${detail.is_saved ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                        <Bookmark size={11} /> {detail.is_saved ? 'Guardado' : 'Guardar'}
                      </button>
                      {(Number(detail.user_id) === Number(currentUser?.id) || canModerate) && (
                        <button onClick={() => setConfirmDeleteId(detail.id)} className="px-2 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 bg-red-100 text-red-600">
                          <Trash2 size={11} /> Borrar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{renderRichText(detail.content, members)}</p>
                  {!!detail.attachments?.length && <div className="space-y-2">{detail.attachments.map((item) => <div key={item.id}>{renderAttachment(item)}</div>)}</div>}
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                  {(detail.replies || detail.comments || []).map((reply) => (
                    <div key={reply.id} className="rounded-2xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <UserAvatar photo={reply.author_photo} name={reply.author_name} role={reply.author_role} size="w-6 h-6" />
                        <span className="font-bold">{reply.author_name}</span> . respuesta
                        {Number(reply.user_id) === Number(detail.user_id) && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">Autor</span>}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{renderRichText(reply.content, members)}</p>
                      {!!reply.attachments?.length && <div className="space-y-2 mt-2">{reply.attachments.map((item) => <div key={item.id}>{renderAttachment(item)}</div>)}</div>}
                    </div>
                  ))}
                  {!detail.replies?.length && !detail.comments?.length && <p className="text-sm text-gray-400">Sin respuestas.</p>}
                </div>

                <div className="rounded-2xl border border-gray-100 p-3 space-y-2">
                  <div className="relative">
                    <textarea
                      ref={replyTextRef}
                      value={replyText}
                      onChange={(e) => onMentionAwareInput('reply', e.target.value)}
                      onKeyDown={(e) => handleSmartDelete('reply', e)}
                      placeholder="Responder pregunta... usa @ para mencionar"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[90px]"
                    />
                    {renderMentionDropdown('reply')}
                  </div>
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
            <textarea
              ref={threadTextRef}
              value={content}
              onChange={(e) => onMentionAwareInput('thread', e.target.value)}
              onKeyDown={(e) => handleSmartDelete('thread', e)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[120px]"
              placeholder="Describe tu duda... usa @ para mencionar"
            />
            {renderMentionDropdown('thread')}
          </div>

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
    </div>
  );
};

export default ModuleForum;
