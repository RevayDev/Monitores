import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getAvailableModules, 
  getStudentRegistrations, 
  registerToModule, 
  getForumQuestions, 
  postQuestion,
  postAnswer,
  acceptForumAnswer,
  getForumHistory 
} from '../services/api';
import { ToastContext } from '../context/ToastContext';
import { 
  BookOpen, 
  MessageSquare, 
  History, 
  ClipboardList, 
  Send, 
  CheckCircle2, 
  Search,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import Modal from '../components/Modal';
import InputField from '../components/InputField';

const StudentDashboard = () => {
  const { showToast } = useContext(ToastContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [session, setSession] = useState(null);
  
  // Data states
  const [myModules, setMyModules] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [forumQuestions, setForumQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({ title: '', content: '' });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    setSession(user);
    loadCoreData();
  }, []);

  const loadCoreData = async () => {
    try {
      setLoading(true);
      const [registrations, available, hist] = await Promise.all([
        getStudentRegistrations(),
        getAvailableModules(),
        getForumHistory()
      ]);
      setMyModules(registrations);
      setAvailableModules(available);
      setHistory(hist);
    } catch (error) {
      showToast('Error cargando datos del estudiante', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadForum = async (moduleId) => {
    try {
      const questions = await getForumQuestions(moduleId);
      setForumQuestions(questions);
      setSelectedModule(moduleId);
    } catch (error) {
      showToast('Error cargando el foro', 'error');
    }
  };

  const handleEnroll = async (moduleId) => {
    try {
      await registerToModule({ moduleId });
      showToast('Inscripción exitosa', 'success');
      loadCoreData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    try {
      await postQuestion({ ...questionForm, module_id: selectedModule });
      showToast('Pregunta publicada', 'success');
      setIsQuestionModalOpen(false);
      setQuestionForm({ title: '', content: '' });
      loadForum(selectedModule);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        {/* Header Section */}
        <div className="bg-blue-600 rounded-[32px] p-6 md:p-8 text-white flex flex-col items-center justify-between gap-6">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black bg-blue-500 border border-blue-400 text-blue-50">
                <BookOpen size={36} />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500 rounded-full">
                  <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-50">Bienvenido(a), {session?.nombre || 'Estudiante'}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                  Mi Espacio Académico
                </h1>
                <p className="text-blue-100 text-xs font-medium opacity-90 max-w-md leading-snug">
                  Gestión de Aprendizaje y Foro Académico.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <section className="bg-white rounded-[2rem] shadow-xl border border-blue-100 overflow-hidden min-h-[600px] flex flex-col">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap border-b border-blue-50 bg-blue-50/30 p-2">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList />} label="Mis Monitorías" />
            <TabButton active={activeTab === 'enroll'} onClick={() => setActiveTab('enroll')} icon={<PlusCircle />} label="Inscripciones" />
            <TabButton active={activeTab === 'forum'} onClick={() => setActiveTab('forum')} icon={<MessageSquare />} label="Foro Académico" />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Mi Historial" />
          </div>

          <div className="p-6 flex-grow overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myModules.length === 0 ? (
                    <EmptyState icon={<HelpCircle />} title="Sin monitorías activas" desc="Inscríbete en una monitoría para comenzar." />
                  ) : (
                    myModules.map(reg => (
                      <ModuleCard key={reg.id} module={reg} actionLabel="Ver Foro" onAction={() => { setActiveTab('forum'); loadForum(reg.monitorId); }} />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'enroll' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="enroll" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableModules.map(mod => (
                    <ModuleCard 
                      key={mod.id} 
                      module={mod} 
                      actionLabel="Inscribirme" 
                      onAction={() => handleEnroll(mod.id)} 
                      isEnrollable={!myModules.some(r => r.monitorId === mod.monitorId)}
                    />
                  ))}
                </motion.div>
              )}

              {activeTab === 'forum' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="forum" className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <select 
                        className="bg-white border-2 border-blue-100 rounded-xl px-4 py-2 font-bold text-brand-blue outline-none"
                        value={selectedModule || ''}
                        onChange={(e) => loadForum(e.target.value)}
                      >
                        <option value="">Selecciona una Monitoría</option>
                        {myModules.map(m => <option key={m.id} value={m.monitorId}>{m.modulo}</option>)}
                      </select>
                    </div>
                    {selectedModule && (
                      <button 
                        onClick={() => setIsQuestionModalOpen(true)}
                        className="bg-brand-blue text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-dark-blue transition-all w-full md:w-auto justify-center"
                      >
                        <PlusCircle size={20} /> Crear Pregunta
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {forumQuestions.length === 0 ? (
                      <EmptyState icon={<MessageSquare />} title="Foro de la Monitoría" desc={selectedModule ? "No hay preguntas aún. ¡Sé el primero!" : "Selecciona una monitoría para ver el foro."} />
                    ) : (
                      forumQuestions.map(q => <QuestionItem key={q.id} question={q} currentUserId={session?.id} onReply={() => {}} />)
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="history" className="space-y-4">
                  <h3 className="text-xl font-black text-brand-blue mb-4">Mi Historial de Participación</h3>
                  {history.map(item => (
                    <div key={item.id} className="bg-white border-l-4 border-l-brand-blue p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-black text-gray-900">{item.title}</p>
                        <p className="text-xs text-blue-400 font-extrabold uppercase tracking-widest mt-1">{item.module_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <EmptyState icon={<History />} title="Sin Historial" desc="Aún no tienes historial de participación." />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <Modal isOpen={isQuestionModalOpen} onClose={() => setIsQuestionModalOpen(false)} title="Nueva Pregunta">
        <form onSubmit={handlePostQuestion} className="space-y-6">
          <InputField label="Título" icon={<Send />} value={questionForm.title} onChange={e => setQuestionForm({...questionForm, title: e.target.value})} />
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Contenido</label>
            <textarea 
              rows={4}
              className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 outline-none focus:border-brand-blue transition-all font-medium text-brand-blue"
              placeholder="Describe tu duda detalladamente..."
              value={questionForm.content}
              onChange={e => setQuestionForm({...questionForm, content: e.target.value})}
            />
          </div>
          <button className="w-full bg-brand-blue text-white font-black py-4 rounded-3xl shadow-xl hover:bg-brand-dark-blue transition-all">
            Publicar Pregunta
          </button>
        </form>
      </Modal>

    </div>
  );
};

const ModuleCard = ({ module, actionLabel, onAction, isEnrollable = true }) => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-blue-100 shadow-sm hover:shadow-xl transition-all flex flex-col group">
    <div className="p-8 pb-4 flex-grow">
      <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-brand-blue mb-6 group-hover:scale-110 transition-transform">
        <BookOpen size={32} />
      </div>
      <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">{module.modulo}</h3>
      <p className="text-sm font-medium text-gray-500 line-clamp-2 mb-4">{module.descripcion || 'Sin descripción disponible'}</p>
      <div className="pt-4 border-t border-blue-50 flex items-center gap-3">
        <UserAvatar user={{ nombre: module.monitor, foto: null }} size="xs" />
        <span className="text-xs font-black text-brand-blue uppercase tracking-widest">Monitor: {module.monitor}</span>
      </div>
    </div>
    <div className="p-4 bg-blue-50/50">
      <button 
        disabled={!isEnrollable}
        onClick={onAction}
        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
          isEnrollable ? 'bg-brand-blue text-white shadow-lg hover:bg-brand-dark-blue' : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
        }`}
      >
        {isEnrollable ? actionLabel : 'Ya inscrito'}
      </button>
    </div>
  </div>
);

const QuestionItem = ({ question, currentUserId, onReply }) => (
  <div className="bg-white border border-blue-100 rounded-[2.5rem] p-8 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="flex gap-4 items-center">
        <UserAvatar user={{ nombre: question.author_name }} size="md" />
        <div>
          <h4 className="font-black text-brand-blue text-xl leading-none">{question.title}</h4>
          <p className="text-xs font-bold text-gray-400 mt-1">{question.author_name} • {new Date(question.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
    <p className="text-gray-700 font-medium leading-relaxed mb-6 pl-4 border-l-4 border-l-blue-100">{question.content}</p>
    
    <div className="space-y-4">
      {question.answers?.map(ans => (
        <div key={ans.id} className={`p-6 rounded-[2rem] ${ans.is_accepted ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{ans.author_name}</span>
            {ans.is_accepted && <span className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Respuesta Aceptada</span>}
          </div>
          <p className="text-sm font-medium text-gray-700">{ans.content}</p>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ icon, title, desc }) => (
  <div className="col-span-full h-80 flex flex-col items-center justify-center text-center space-y-4">
    <div className="bg-blue-50 p-6 rounded-[2rem] text-brand-blue">
      {React.cloneElement(icon, { size: 48 })}
    </div>
    <div>
      <h3 className="text-xl font-black text-gray-900">{title}</h3>
      <p className="text-gray-400 font-medium">{desc}</p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
      active ? 'bg-white text-brand-blue shadow-sm' : 'text-blue-400 hover:text-blue-700'
    }`}
  >
    {React.cloneElement(icon, { size: 16 })}
    {label}
  </button>
);

export default StudentDashboard;
