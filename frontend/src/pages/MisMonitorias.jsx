import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createForum,
  createForumComment,
  deleteMonitoria,
  getAllRegistrations,
  getForumById,
  getForums,
  getMyModules,
  uploadForumFile
} from '../services/api';
import { ToastContext } from '../App';
import MonitorCard from '../components/MonitorCard';
import Modal from '../components/Modal';
import UserAvatar from '../components/UserAvatar';
import {
  Book,
  ChevronRight,
  Clock,
  Eye,
  File,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Send,
  Trash2,
  Video
} from 'lucide-react';

const renderRich = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const normalized = line.trim();
    const img = normalized.match(/^!\[(.*)\]\((https?:\/\/[^\s]+)\)$/i);
    if (img) return <img key={`i-${idx}`} src={img[2]} alt={img[1] || 'imagen'} className="rounded-xl max-h-60 border border-gray-200" />;

    const vid = normalized.match(/^\[video\]\((https?:\/\/[^\s]+)\)$/i);
    if (vid) {
      return (
        <a key={`v-${idx}`} href={vid[1]} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm break-all">
          Ver video: {vid[1]}
        </a>
      );
    }

    const file = normalized.match(/^\[file:([^\]]+)\]\((https?:\/\/[^\s]+)\)$/i);
    if (file) {
      return (
        <a key={`f-${idx}`} href={file[2]} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm break-all">
          Archivo: {file[1]}
        </a>
      );
    }

    const chunks = [];
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/gi;
    let last = 0;
    let m;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) chunks.push(line.slice(last, m.index));
      chunks.push(
        <a key={`${idx}-${m.index}`} href={m[2]} target="_blank" rel="noreferrer" className="text-blue-600 underline">
          {m[1]}
        </a>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) chunks.push(line.slice(last));
    return <p key={`t-${idx}`} className="text-sm text-gray-700 whitespace-pre-wrap break-words">{chunks.length ? chunks : line}</p>;
  });
};

const insertAtCursor = (value, insertion, setter, ref) => {
  const input = ref.current;
  if (!input) return setter(`${value}${insertion}`);
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  setter(next);
  setTimeout(() => {
    input.focus();
    input.setSelectionRange(start + insertion.length, start + insertion.length);
  }, 0);
};

const MisMonitorias = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  const [tab, setTab] = useState('modules');
  const [monitorias, setMonitorias] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [forumThreads, setForumThreads] = useState([]);
  const [forumDetail, setForumDetail] = useState(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadMessage, setThreadMessage] = useState('');
  const [replyByThread, setReplyByThread] = useState({});
  const [forumPanel, setForumPanel] = useState('questions');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedMonitoria, setSelectedMonitoria] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState([]);

  const threadMessageRef = React.useRef(null);
  const fileAnyRef = React.useRef(null);
  const fileImgRef = React.useRef(null);
  const fileVideoRef = React.useRef(null);

  const activeModule = useMemo(
    () => monitorias.find((m) => Number(m.id) === Number(activeModuleId)) || null,
    [monitorias, activeModuleId]
  );
  const selectedThread = useMemo(
    () => forumThreads.find((t) => Number(t.id) === Number(selectedThreadId)) || null,
    [forumThreads, selectedThreadId]
  );

  const fetchMonitorias = async () => {
    try {
      const [myModules, regs] = await Promise.all([getMyModules(), getAllRegistrations()]);
      const modules = myModules || [];
      setMonitorias(modules);
      setAllRegistrations(regs || []);
      if (modules.length && !activeModuleId) setActiveModuleId(modules[0].id);
    } catch (error) {
      showToast(error.message || 'Error cargando tus monitorias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadForum = async (moduleId) => {
    if (!moduleId) return;
    try {
      const threads = await getForums({ subject_id: moduleId });
      setForumThreads(threads);
      setSelectedThreadId((prev) => {
        if (threads.some((t) => Number(t.id) === Number(prev))) return prev;
        return threads[0]?.id || null;
      });
    } catch (error) {
      showToast(error.message || 'Error cargando foro.', 'error');
      setForumThreads([]);
      setSelectedThreadId(null);
      setForumDetail(null);
    }
  };

  useEffect(() => {
    fetchMonitorias();
  }, []);

  useEffect(() => {
    if (tab === 'forum' && activeModuleId) loadForum(activeModuleId);
  }, [tab, activeModuleId]);

  useEffect(() => {
    if (tab !== 'forum') setForumPanel('questions');
  }, [tab]);

  useEffect(() => {
    if (!selectedThreadId || tab !== 'forum') return;
    getForumById(selectedThreadId)
      .then((detail) => setForumDetail(detail))
      .catch(() => setForumDetail(null));
  }, [selectedThreadId, tab]);

  const handleCreateThread = async () => {
    if (!activeModuleId || !threadTitle.trim() || !threadMessage.trim()) {
      return showToast('Completa titulo y contenido.', 'error');
    }
    await createForum({
      title: threadTitle.trim(),
      content: threadMessage.trim(),
      subject_id: Number(activeModuleId)
    });
    setThreadTitle('');
    setThreadMessage('');
    setUploadedAssets([]);
    await loadForum(activeModuleId);
    showToast('Foro creado.', 'success');
  };

  const handleReply = async (threadId) => {
    const msg = (replyByThread[threadId] || '').trim();
    if (!msg) return;
    await createForumComment(threadId, { content: msg, type: 'text' });
    setReplyByThread((p) => ({ ...p, [threadId]: '' }));
    await openThread(threadId);
    await loadForum(activeModuleId);
  };

  const openThread = async (threadId) => {
    setSelectedThreadId(threadId);
    setForumPanel('questions');
    try {
      const detail = await getForumById(threadId);
      setForumDetail(detail);
    } catch (error) {
      showToast(error.message || 'No se pudo cargar el detalle del foro.', 'error');
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadForumFile(file);
      if (uploaded.kind === 'image') {
        insertAtCursor(threadMessage, `\n![imagen](${uploaded.url})\n`, setThreadMessage, threadMessageRef);
      } else if (uploaded.kind === 'video') {
        insertAtCursor(threadMessage, `\n[video](${uploaded.url})\n`, setThreadMessage, threadMessageRef);
      } else {
        insertAtCursor(threadMessage, `\n[file:${uploaded.name}](${uploaded.url})\n`, setThreadMessage, threadMessageRef);
      }
      setUploadedAssets((prev) => [{ ...uploaded, id: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, 6));
      showToast('Archivo importado.', 'success');
    } catch (error) {
      showToast(error.message || 'No se pudo subir archivo.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    const url = window.prompt('URL del enlace:');
    if (!url) return;
    const text = window.prompt('Texto del enlace:', 'Abrir enlace') || 'Abrir enlace';
    insertAtCursor(threadMessage, `[${text}](${url})`, setThreadMessage, threadMessageRef);
  };

  const openDetails = (m) => {
    setSelectedMonitoria(m);
    setIsDetailOpen(true);
  };

  const startDrop = () => {
    setIsDetailOpen(false);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteReason || !selectedMonitoria) return;
    await deleteMonitoria(selectedMonitoria.registration_id || selectedMonitoria.id, deleteReason);
    setIsDeleteOpen(false);
    setDeleteReason('');
    await fetchMonitorias();
  };

  const reasons = ['La monitoria ya finalizo', 'No me funciono el horario', 'Ya aprobe la materia', 'Me inscribi por error', 'Otro'];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Mis Monitorias</h1>
          <p className="text-gray-600 mt-1">Modulos y foro en un solo lugar.</p>
        </header>

        <div className="bg-white rounded-2xl border border-gray-100 p-2 flex gap-2 w-full sm:w-fit">
          <button onClick={() => setTab('modules')} className={`px-5 py-2 rounded-xl text-sm font-bold ${tab === 'modules' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>Mis modulos</button>
          <button onClick={() => setTab('forum')} className={`px-5 py-2 rounded-xl text-sm font-bold ${tab === 'forum' ? 'bg-brand-blue text-white' : 'text-gray-600'}`}>Foro</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>
        ) : tab === 'modules' ? (
          monitorias.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitorias.map((m) => (
                <MonitorCard
                  key={m.id}
                  data={m}
                  onAction={() => openDetails(m)}
                  actionLabel="Ver detalles"
                  registrationCount={allRegistrations.filter((r) => Number(r.moduleId) === Number(m.id)).length}
                  isRegistered
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-6">
              <div className="bg-yellow-100 p-6 rounded-full text-yellow-500 animate-pulse"><Info size={64} strokeWidth={2.5} /></div>
              <div className="space-y-2 max-w-md">
                <p className="text-2xl text-gray-800 font-extrabold">No tienes monitorias</p>
                <p className="text-gray-500 font-medium">Registrate para habilitar asistencia y foro.</p>
              </div>
              <button onClick={() => navigate('/monitorias')} className="px-10 py-4 bg-brand-blue text-white font-extrabold rounded-2xl shadow-xl flex items-center gap-2"><Book size={20} /> Registrar Monitoria</button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 p-5">
              <div className="flex flex-wrap gap-2">
                {monitorias.map((m) => (
                  <button key={m.id} onClick={() => setActiveModuleId(m.id)} className={`px-3 py-2 rounded-lg text-xs font-bold ${Number(activeModuleId) === Number(m.id) ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {m.modulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-2 flex gap-2 w-full sm:w-fit">
              <button onClick={() => setForumPanel('questions')} className={`px-5 py-2 rounded-xl text-sm font-bold ${forumPanel === 'questions' ? 'bg-brand-blue text-white' : 'text-gray-600'}`}>Preguntas</button>
              <button onClick={() => setForumPanel('create')} className={`px-5 py-2 rounded-xl text-sm font-bold ${forumPanel === 'create' ? 'bg-brand-blue text-white' : 'text-gray-600'}`}>Crear foro</button>
            </div>

            {forumPanel === 'questions' ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900">Preguntas del modulo</h3>
                    <p className="text-xs text-gray-500">{forumThreads.length} publicadas</p>
                  </div>

                  {!forumThreads.length && <p className="text-sm text-gray-500">No hay foros en este modulo.</p>}

                  <div className="space-y-3">
                  {forumThreads.map((thread) => {
                    const isActive = Number(selectedThreadId) === Number(thread.id);
                    const firstMessage = thread.content || '';
                    return (
                      <article key={thread.id} className={`rounded-2xl border p-4 transition-all ${isActive ? 'border-brand-blue bg-blue-50/40 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="font-black text-gray-900 truncate">{thread.title}</p>
                            <p className="text-xs text-gray-500">por {thread.author_name}</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{firstMessage.replace(/\[(.*?)\]\((.*?)\)|!\[(.*?)\]\((.*?)\)/g, '').trim() || 'Sin descripcion'}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                            OPEN
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MessageSquare size={13} /> {thread.responses_count || 0} respuestas</span>
                          <button onClick={() => openThread(thread.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-bold">
                            <Eye size={13} /> Entrar <ChevronRight size={13} />
                          </button>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                </section>

                <aside className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900">Detalle de pregunta</h3>
                  <span className="text-xs text-gray-500">{selectedThread ? 'Abierta' : 'Selecciona una card'}</span>
                </div>

                  {selectedThread && forumDetail ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                        <p className="font-black text-gray-900">{forumDetail.title}</p>
                        <p className="text-xs text-gray-500">Creado por {forumDetail.author_name}</p>
                        <div className="mt-2 space-y-1">{renderRich(forumDetail.content)}</div>
                      </div>
                      <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                        {(forumDetail.comments || []).map((msg) => (
                          <div key={msg.id} className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-gray-500"><span className="font-bold">{msg.author_name}</span> · comentario</p>
                              {Number(msg.user_id) === Number(forumDetail.user_id) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-black uppercase">Autor</span>}
                            </div>
                            <div className="space-y-1">{renderRich(msg.content)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900" placeholder="Responder..." value={replyByThread[selectedThread.id] || ''} onChange={(e) => setReplyByThread((p) => ({ ...p, [selectedThread.id]: e.target.value }))} />
                        <button onClick={() => handleReply(selectedThread.id)} className="p-2 rounded-xl bg-gray-900 text-white"><Send size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Haz click en “Entrar” de una pregunta para ver y responder.</p>
                  )}
                </aside>
              </div>
            ) : (
              <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 max-w-3xl">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><MessageSquare size={18} className="text-brand-blue" /> Crear foro</h3>
                <p className="text-xs text-gray-500">Modulo activo: <span className="font-bold text-gray-700">{activeModule?.modulo || 'Selecciona modulo'}</span></p>
                <input value={threadTitle} onChange={(e) => setThreadTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900" placeholder="Titulo de la pregunta" />

                <input ref={fileAnyRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                <input ref={fileImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                <input ref={fileVideoRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />

                <div className="flex flex-wrap gap-2">
                  <button onClick={addLink} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1"><LinkIcon size={12} /> Link</button>
                  <button onClick={() => fileImgRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1"><ImageIcon size={12} /> Imagen</button>
                  <button onClick={() => fileVideoRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1"><PlayCircle size={12} /> Video</button>
                  <button onClick={() => fileAnyRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1"><File size={12} /> Archivo</button>
                </div>

                <textarea
                  ref={threadMessageRef}
                  value={threadMessage}
                  onChange={(e) => setThreadMessage(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 min-h-[220px]"
                  placeholder={'Escribe tu contenido...\n[texto](https://link)\n![imagen](https://...)\n[video](https://...)\n[file:nombre](https://...)'}
                />

                <p className="text-[11px] text-gray-500">Maximo por archivo: 10MB.</p>

                {uploadedAssets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-700">Vista previa de adjuntos</p>
                    <div className="space-y-2 max-h-44 overflow-auto pr-1">
                      {uploadedAssets.map((asset) => (
                        <div key={asset.id} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                          {asset.kind === 'image' && <img src={asset.url} alt={asset.name} className="max-h-28 rounded-lg border border-gray-200" />}
                          {asset.kind === 'video' && (
                            <a href={asset.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
                              Video: {asset.name}
                            </a>
                          )}
                          {asset.kind === 'file' && (
                            <a href={asset.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
                              Archivo: {asset.name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleCreateThread} disabled={uploading} className="w-full py-4 rounded-2xl bg-brand-blue text-white font-black text-base shadow-lg hover:bg-brand-dark-blue transition-all disabled:opacity-50">
                  {uploading ? 'Subiendo...' : 'Publicar foro'}
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detalle de la monitoria">
        {selectedMonitoria && (
          <div className="space-y-5">
            <div className="bg-blue-50 p-4 rounded-xl space-y-2">
              <h4 className="font-black text-brand-blue">{selectedMonitoria.modulo}</h4>
              <p className="text-sm text-gray-600 italic">{selectedMonitoria.descripcion || 'Sin descripcion.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-3"><UserAvatar user={{ nombre: selectedMonitoria.monitor, foto: selectedMonitoria.monitorFoto, role: 'monitor' }} size="sm" /><div><p className="text-[10px] uppercase text-gray-500">Docente / Monitor</p><p className="font-bold">{selectedMonitoria.monitor}</p></div></div>
              <div><p className="text-[10px] uppercase text-gray-500">Correo</p><p className="font-bold">{selectedMonitoria.monitorEmail || '-'}</p></div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-brand-blue" /> {selectedMonitoria.horario || '-'}</div>
              <div className="flex items-center gap-2"><MapPin size={14} className="text-brand-blue" /> {selectedMonitoria.sede || '-'}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedMonitoria.whatsapp && (
                <a href={selectedMonitoria.whatsapp} target="_blank" rel="noreferrer" className="py-3 rounded-xl bg-green-500 text-white text-center font-bold flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {selectedMonitoria.teams && (
                <a href={selectedMonitoria.teams} target="_blank" rel="noreferrer" className="py-3 rounded-xl bg-blue-600 text-white text-center font-bold flex items-center justify-center gap-2">
                  <Video size={16} /> Teams
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  setActiveModuleId(selectedMonitoria.id);
                  setTab('forum');
                  setIsDetailOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold"
              >
                Ir al foro
              </button>
              <button onClick={startDrop} className="w-full py-3 rounded-xl border border-red-100 text-red-600 font-bold flex items-center justify-center gap-2">
                <Trash2 size={14} /> Darme de baja
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmar baja">
        <div className="space-y-6">
          <p className="text-gray-600">Selecciona un motivo:</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/70">
                <input type="radio" name="reason" value={r} onChange={(e) => setDeleteReason(e.target.value)} />
                <span className="text-sm font-medium text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          <button onClick={confirmDelete} disabled={!deleteReason} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">Confirmar</button>
        </div>
      </Modal>
    </div>
  );
};

export default MisMonitorias;

