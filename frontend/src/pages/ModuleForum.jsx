import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Plus } from 'lucide-react';
import { createForumMessage, createForumThread, getModuleForum, getMyModules } from '../services/api';
import { ToastContext } from '../App';

const ModuleForum = () => {
  const { id } = useParams();
  const moduleId = Number(id);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  const [moduleData, setModuleData] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [replyByThread, setReplyByThread] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [forum, myModules] = await Promise.all([getModuleForum(moduleId), getMyModules()]);
      setThreads(forum || []);
      const current = (myModules || []).find((m) => Number(m.id) === moduleId);
      setModuleData(current || null);
    } catch (error) {
      showToast(error.message || 'Error cargando foro.', 'error');
      navigate('/mis-monitorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduleId]);

  const canCreate = useMemo(() => !loading && moduleId > 0, [loading, moduleId]);

  const handleCreateThread = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Completa titulo y mensaje.', 'error');
      return;
    }
    await createForumThread(moduleId, { title: title.trim(), message: message.trim() });
    setTitle('');
    setMessage('');
    await loadData();
    showToast('Thread creado.', 'success');
  };

  const handleReply = async (threadId) => {
    const text = (replyByThread[threadId] || '').trim();
    if (!text) {
      showToast('Mensaje vacio.', 'error');
      return;
    }
    await createForumMessage(threadId, { message: text });
    setReplyByThread((prev) => ({ ...prev, [threadId]: '' }));
    await loadData();
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
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/mis-monitorias')}
          className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold"
        >
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="bg-white p-6 rounded-3xl border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900">Foro del modulo</h1>
          <p className="text-gray-500 text-sm mt-1">{moduleData?.modulo || `Modulo #${moduleId}`}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-3">
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Plus size={18} className="text-brand-blue" /> Nueva pregunta
          </h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            placeholder="Titulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[90px]"
            placeholder="Escribe tu pregunta..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            disabled={!canCreate}
            onClick={handleCreateThread}
            className="px-5 py-2 bg-brand-blue text-white rounded-xl font-bold disabled:opacity-50"
          >
            Publicar
          </button>
        </div>

        <div className="space-y-4">
          {threads.map((thread) => (
            <div key={thread.id} className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-gray-900">{thread.title}</h3>
                  <p className="text-xs text-gray-400">Creado por {thread.created_by_name}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-brand-blue font-bold uppercase">
                  {thread.status}
                </span>
              </div>

              <div className="space-y-3">
                {(thread.messages || []).map((msg) => (
                  <div key={msg.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      <span className="font-bold">{msg.author_name}</span> · {msg.role_snapshot}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-brand-blue" />
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Responder..."
                  value={replyByThread[thread.id] || ''}
                  onChange={(e) => setReplyByThread((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                />
                <button
                  onClick={() => handleReply(thread.id)}
                  className="px-3 py-2 bg-gray-900 text-white rounded-xl"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ))}
          {threads.length === 0 && (
            <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center text-gray-500">
              Aun no hay threads en este modulo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleForum;
