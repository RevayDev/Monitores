import React, { useState, useEffect } from 'react';
import { getStudentsByMonitor, deleteMonitoria, updateMonitoriaInfo, getMonitorias } from '../services/api';
import Modal from '../components/Modal';
import { Users, BookOpen, Trash2, Edit3, Link, ClipboardList, UserCircle2, MessageSquare, AlertCircle, MessageCircle, Video } from 'lucide-react';

const MonitorDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitorModules, setMonitorModules] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteComment, setDeleteComment] = useState('');
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [editFormData, setEditFormData] = useState({
    descripcion: '',
    whatsapp: '',
    teams: ''
  });
  
  const monitorId = 101; // Mock current monitor ID (Juan Pérez)

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [allStudents, allModules] = await Promise.all([
      getStudentsByMonitor(monitorId),
      getMonitorias()
    ]);
    setStudents(allStudents);
    setMonitorModules(allModules.filter(m => m.monitorId === monitorId));
    setLoading(false);
  };

  const handleOpenDelete = (student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteComment) {
      alert("Por favor ingresa un comentario para la baja");
      return;
    }
    await deleteMonitoria(selectedStudent.id, "Baja por Monitor", deleteComment);
    setIsDeleteOpen(false);
    setSelectedStudent(null);
    setDeleteComment('');
    fetchData();
  };

  const handleOpenEdit = (mod) => {
    setSelectedModule(mod);
    setEditFormData({
      descripcion: mod.descripcion || '',
      whatsapp: mod.whatsapp || '',
      teams: mod.teams || ''
    });
    setIsEditModuleOpen(true);
  };

  const saveModuleInfo = async () => {
    await updateMonitoriaInfo(selectedModule.id, editFormData);
    setIsEditModuleOpen(false);
    fetchData();
  };

  const handlePrint = () => {
    alert("Generando planilla de asistencia para imprimir...");
  };

  const handleCopySurvey = () => {
    const url = `${window.location.origin}/survey/${monitorId}`;
    navigator.clipboard.writeText(url);
    alert("¡Link de encuesta copiado al portapapeles! Envíalo a tus estudiantes.");
  };

  return (
    <div className="min-h-screen bg-brand-gray p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900">Panel de Monitor</h1>
            <p className="text-gray-500 font-medium tracking-tight uppercase text-xs">Bienvenido, Juan Pérez</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleCopySurvey}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95"
            >
              <Link size={20} /> Enviar Encuesta
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-brand-blue text-white px-5 py-3 rounded-xl font-bold hover:bg-brand-dark-blue transition-all shadow-lg active:scale-95"
            >
              <ClipboardList size={20} /> Imprimir Planilla
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Managed Modules */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-brand-blue flex items-center gap-2">
              <BookOpen size={24} /> Mis Módulos
            </h2>
            <div className="space-y-4">
              {monitorModules.map(mod => (
                <div key={mod.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-gray-900">{mod.modulo}</h3>
                    <button 
                      onClick={() => handleOpenEdit(mod)}
                      className="text-gray-400 hover:text-brand-blue transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-3 italic">"{mod.descripcion}"</p>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>{mod.modalidad}</span>
                    <span>{mod.horario}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-brand-blue flex items-center gap-2">
              <Users size={24} /> Estudiantes Registrados
            </h2>
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-black text-gray-400">
                      <th className="px-6 py-4">Estudiante</th>
                      <th className="px-6 py-4">Módulo</th>
                      <th className="px-6 py-4">Fecha Reg.</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.length > 0 ? students.map(st => (
                      <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-blue/5 flex items-center justify-center text-brand-blue">
                              {st.studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{st.studentName}</p>
                              <p className="text-xs text-gray-400">{st.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-brand-blue/5 text-brand-blue text-[10px] font-bold rounded-full uppercase">
                            {st.modulo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(st.registeredAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleOpenDelete(st)}
                            className="p-2 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <AlertCircle size={48} className="text-gray-200" />
                            <p className="text-gray-400 font-bold">No hay estudiantes registrados aún</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Baja Estudiante */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        title="Dar de baja estudiante"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-red-50 p-4 rounded-2xl">
            <UserCircle2 size={40} className="text-red-500" />
            <div>
              <p className="font-bold text-red-900">{selectedStudent?.studentName}</p>
              <p className="text-xs text-red-600">Se eliminará el registro de {selectedStudent?.modulo}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <MessageSquare size={16} /> Comentario para el estudiante
            </label>
            <textarea 
              value={deleteComment}
              onChange={(e) => setDeleteComment(e.target.value)}
              placeholder="Ej. El estudiante no asistió a las sesiones..."
              className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-black"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={confirmDelete}
              className="w-full py-4 bg-red-600 text-white font-extrabold rounded-2xl shadow-xl hover:bg-red-700 active:scale-95 transition-all"
            >
              Confirmar Baja
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Módulo */}
      <Modal 
        isOpen={isEditModuleOpen} 
        onClose={() => setIsEditModuleOpen(false)} 
        title="Editar Información de Monitoría"
      >
        <div className="space-y-6">
          <div className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Módulo</label>
              <textarea 
                value={editFormData.descripcion}
                onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                placeholder="Describe los temas que tratas en esta monitoría..."
                className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-black font-medium text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <MessageCircle size={12} className="text-green-500" /> Link de WhatsApp
              </label>
              <input 
                type="url"
                value={editFormData.whatsapp}
                onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-black font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Video size={12} className="text-blue-500" /> Link de Teams
              </label>
              <input 
                type="url"
                value={editFormData.teams}
                onChange={(e) => setEditFormData({ ...editFormData, teams: e.target.value })}
                placeholder="https://teams.microsoft.com/l/..."
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-black font-bold text-sm"
              />
            </div>
          </div>

          <button 
            onClick={saveModuleInfo}
            className="w-full py-4 bg-brand-blue text-white font-extrabold rounded-2xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Guardar Cambios
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MonitorDashboard;
