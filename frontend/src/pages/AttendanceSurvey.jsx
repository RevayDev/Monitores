import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitAttendance, getCurrentUser } from '../services/api';
import { CheckCircle2, Star, Calendar, MessageSquare, Send, User } from 'lucide-react';

const AttendanceSurvey = () => {
  const { monitorId } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState('student');
  const [loadingUser, setLoadingUser] = useState(true);
  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((u) => {
        if (!mounted) return;
        const r = String(u?.role || u?.baseRole || 'student').toLowerCase();
        setRole(r);
      })
      .finally(() => { if (mounted) setLoadingUser(false); });
    return () => { mounted = false; };
  }, []);

  const [formData, setFormData] = useState({
    studentName: '',
    date: new Date().toISOString().split('T')[0],
    rating: 5,
    comment: '',
    isAnonymous: false,
    isPublic: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loadingUser) return;
    if (['admin','dev','monitor','monitor_academico','monitor_administrativo'].includes(role)) return;
    await submitAttendance({
      monitorId: parseInt(monitorId),
      ...formData
    });
    setSubmitted(true);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (['admin','dev','monitor','monitor_academico','monitor_administrativo'].includes(role)) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-4">
          <p className="text-sm font-black text-gray-900">Solo estudiantes pueden enviar esta encuesta.</p>
          <p className="text-xs text-gray-500">Como monitor puedes ver los resultados en tu panel.</p>
          <button onClick={() => navigate('/')} className="w-full py-4 bg-gray-900 text-white font-extrabold rounded-2xl">Volver</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-6 animate-scale-in">
          <div className="flex justify-center">
            <div className="bg-green-100 p-6 rounded-full text-green-600 animate-bounce">
              <CheckCircle2 size={64} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">¡Asistencia Registrada!</h2>
          <p className="text-gray-500 font-medium leading-relaxed">Tu participación ha sido guardada satisfactoriamente. Esto servirá como certificado para tu monitor.</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-brand-blue text-white font-extrabold rounded-2xl shadow-lg hover:bg-brand-dark-blue transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray py-12 px-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-brand-blue p-8 text-white text-center space-y-2">
            <h1 className="text-2xl font-black">Encuesta de Asistencia</h1>
            {new URLSearchParams(window.location.search).get('modulo') && (
              <p className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold w-fit mx-auto backdrop-blur-sm">
                Módulo: {new URLSearchParams(window.location.search).get('modulo')}
              </p>
            )}
            <p className="text-blue-100 opacity-80 text-sm">Completa los datos para certificar la sesión de hoy.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <User size={18} className="text-brand-blue" /> Tu Nombre Completo
              </label>
              <input
                required={!formData.isAnonymous}
                type="text"
                value={formData.studentName}
                onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                placeholder="Ej. Roberto Jiménez"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue outline-none transition-all text-black font-medium text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar size={18} className="text-brand-blue" /> Fecha de la sesión
              </label>
              <input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue outline-none transition-all text-black font-medium text-base"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Star size={18} className="text-brand-blue" /> Califica la sesión
              </label>
              <div className="flex flex-wrap justify-center sm:justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 gap-3">
                {[1, 2, 3, 4, 5].map((nu) => (
                  <button
                    key={nu}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: nu })}
                    className={
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-all ' +
                      (formData.rating >= nu
                        ? 'bg-yellow-400 text-white shadow-lg scale-110'
                        : 'bg-white text-gray-300 border border-gray-200 hover:bg-gray-50')
                    }
                  >
                    <Star size={20} className={formData.rating >= nu ? 'fill-white' : ''} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={!!formData.isAnonymous} onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked, studentName: e.target.checked ? 'Anonimo' : '' })} />
                Respuesta anonima
              </label>
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={!!formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} />
                Encuesta publica
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-blue" /> Comentarios
              </label>
              <textarea 
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                placeholder="Cuéntanos cómo te pareció la monitoría..."
                className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue outline-none transition-all text-black font-medium resize-none text-base"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-brand-blue text-white font-black text-lg rounded-2xl shadow-2xl hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Send size={24} /> Enviar Registro
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSurvey;
