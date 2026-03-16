import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitAttendance } from '../services/api';
import { CheckCircle2, Star, Calendar, MessageSquare, Send, User } from 'lucide-react';

const AttendanceSurvey = () => {
  const { monitorId } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    date: new Date().toISOString().split('T')[0],
    rating: 5,
    comment: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitAttendance({
      monitorId: parseInt(monitorId),
      ...formData
    });
    setSubmitted(true);
  };

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
                required
                type="text"
                value={formData.studentName}
                onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                placeholder="Ej. Roberto Jiménez"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all text-black font-medium"
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
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all text-black font-medium"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Star size={18} className="text-brand-blue" /> Califica la sesión
              </label>
              <div className="flex flex-wrap justify-center sm:justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 gap-3">
                {[1, 2, 3, 4, 5].map(nu => (
                  <button
                    key={nu}
                    type="button"
                    onClick={() => setFormData({...formData, rating: nu})}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                      formData.rating >= nu 
                        ? 'bg-yellow-400 text-white shadow-lg scale-110' 
                        : 'bg-white text-gray-300 border border-gray-200'
                    }`}
                  >
                    {nu}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-blue" /> Comentarios
              </label>
              <textarea 
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                placeholder="Cuéntanos cómo te pareció la monitoría..."
                className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all text-black font-medium resize-none"
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
