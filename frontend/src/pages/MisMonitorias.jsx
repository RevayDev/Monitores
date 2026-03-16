import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMisMonitorias, deleteMonitoria } from '../services/api';
import MonitorCard from '../components/MonitorCard';
import Modal from '../components/Modal';
import { Info, MessageCircle, Video, Trash2, Calendar, Clock, MapPin, User, Book, Mail } from 'lucide-react';

const MisMonitorias = () => {
  const navigate = useNavigate();
  const [monitorias, setMonitorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonitoria, setSelectedMonitoria] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchMonitorias();
  }, []);

  const fetchMonitorias = async () => {
    const data = await getMisMonitorias();
    setMonitorias(data);
    setLoading(false);
  };

  const handleOpenDetail = (monitoria) => {
    setSelectedMonitoria(monitoria);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = () => {
    setIsDetailOpen(false);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteReason) {
      alert('Por favor selecciona o escribe un motivo de eliminación.');
      return;
    }
    await deleteMonitoria(selectedMonitoria.id, deleteReason);
    setIsDeleteOpen(false);
    setSelectedMonitoria(null);
    setDeleteReason('');
    fetchMonitorias();
  };

  const reasons = [
    'La monitoría ya finalizó',
    'No me funcionó el horario',
    'Ya aprobé la materia',
    'Me inscribí por error',
    'Otro'
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Mis Monitorías</h1>
          <p className="text-lg text-gray-600">Administra tus sesiones registradas y accede a tus clases.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          </div>
        ) : monitorias.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitorias.map(m => (
              <MonitorCard 
                key={m.id} 
                data={m} 
                onAction={handleOpenDetail} 
                actionLabel="Ver Recurso"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100 flex flex-col items-center gap-6">
            <div className="bg-yellow-100 p-6 rounded-full text-yellow-500 animate-pulse">
              <Info size={64} strokeWidth={2.5} />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="text-2xl text-gray-800 font-extrabold">¡Vaya! No tienes registros</p>
              <p className="text-gray-500 font-medium">Parece que aún no te has inscrito en ninguna monitoría. Empieza ahora para fortalecer tu aprendizaje.</p>
            </div>
            <button 
              onClick={() => navigate('/monitorias')}
              className="px-10 py-4 bg-brand-blue text-white font-extrabold rounded-2xl shadow-xl hover:bg-brand-dark-blue hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Book size={20} /> Registrar Monitoría
            </button>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <Modal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        title="Detalles de la Monitoría"
      >
        {selectedMonitoria && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-brand-blue flex items-center gap-2">
                <Book size={20} /> {selectedMonitoria.modulo}
              </h4>
              <p className="text-sm text-gray-600 italic">"{selectedMonitoria.descripcion}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <User size={18} className="text-brand-blue" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Monitor</p>
                  <p className="text-sm font-semibold">{selectedMonitoria.monitor}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={18} className="text-brand-blue" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Horario</p>
                  <p className="text-sm font-semibold">{selectedMonitoria.horario}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={18} className="text-brand-blue" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Sede / Salón</p>
                  <p className="text-sm font-semibold">{selectedMonitoria.sede} - {selectedMonitoria.salon}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={18} className="text-brand-blue" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Cuatrimestre</p>
                  <p className="text-sm font-semibold">{selectedMonitoria.cuatrimestre}</p>
                </div>
              </div>
            </div>

            {(selectedMonitoria.whatsapp || selectedMonitoria.teams) ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[10px]">Enlaces de Acceso:</p>
                <div className={`grid ${selectedMonitoria.whatsapp && selectedMonitoria.teams ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {selectedMonitoria.whatsapp && (
                    <a 
                      href={selectedMonitoria.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                    >
                      <MessageCircle size={18} /> WhatsApp
                    </a>
                  )}
                  {selectedMonitoria.teams && (
                    <a 
                      href={selectedMonitoria.teams}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                      <Video size={18} /> Teams
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Contacto Monitor</p>
                  <p className="text-sm font-bold text-gray-700">{selectedMonitoria.monitorEmail}</p>
                </div>
                <Mail size={18} className="text-gray-300" />
              </div>
            )}

            <div className="pt-6 border-t mt-4">
              <button 
                onClick={handleOpenDelete}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl text-red-600 font-extrabold border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
              >
                <Trash2 size={24} /> Darme de Baja / Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Eliminación */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        title="¿Deseas eliminar esta monitoría?"
      >
        <div className="space-y-6">
          <p className="text-gray-600">Por favor, cuéntanos el motivo de tu cancelación para mejorar nuestro servicio.</p>
          
          <div className="space-y-3">
            {reasons.map((r, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors transition-all active:scale-[0.99]">
                <input 
                  type="radio" 
                  name="reason" 
                  value={r} 
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-4 h-4 text-brand-blue border-gray-300 focus:ring-brand-blue"
                />
                <span className="text-sm font-medium text-gray-700">{r}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={confirmDelete}
              className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 shadow-lg active:scale-95 transition-all"
            >
              Confirmar Eliminación
            </button>
            <button 
              onClick={() => setIsDeleteOpen(false)}
              className="w-full py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MisMonitorias;
