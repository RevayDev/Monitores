import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  HelpCircle, 
  Flag,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { submitComplaint } from '../services/api';

const Complaints = () => {
  const [formData, setFormData] = useState({ tipo: 'Queja', asunto: '', mensaje: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await submitComplaint(formData);
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 text-center space-y-4 animate-scale-in">
          <div className="bg-green-50 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto text-green-500 shadow-inner">
            <CheckCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter">¡Recibido!</h2>
            <p className="text-gray-400 text-xs font-semibold leading-relaxed">
              Tu solicitud ha sido registrada. Un administrador revisará el caso pronto.
            </p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-lg hover:bg-brand-dark-blue active:scale-95 transition-all text-sm"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-brand-blue font-black text-[11px] uppercase tracking-widest transition-all group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver
        </button>

        <header className="bg-brand-blue p-8 rounded-[32px] text-white flex items-center gap-6 shadow-xl shadow-brand-blue/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shrink-0">
            <MessageSquare size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Atención Estudiantil</h1>
            <p className="text-blue-100 text-xs font-medium opacity-80">Mejora continua y soporte académico.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Flag size={12} /> Tipo
              </label>
              <select 
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue/20 outline-none text-black font-bold transition-all text-[13px] cursor-pointer"
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="Queja">⚠️ Queja</option>
                <option value="Reclamo">📁 Reclamo</option>
                <option value="Sugerencia">💡 Sugerencia</option>
                <option value="Felicitación">⭐ Felicitación</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <AlertCircle size={12} /> Asunto
              </label>
              <input 
                required
                className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue/20 outline-none text-black font-bold transition-all text-[13px] shadow-inner"
                placeholder="Ej. Soporte con Teams"
                value={formData.asunto}
                onChange={e => setFormData({...formData, asunto: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
            <textarea 
              required
              className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue/20 outline-none text-black font-medium transition-all resize-none text-[13px] shadow-inner"
              placeholder="Explica tu situación con detalles..."
              value={formData.mensaje}
              onChange={e => setFormData({...formData, mensaje: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-blue text-white font-black text-base rounded-2xl shadow-lg hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : <><Send size={20} /> Enviar Ticket</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Complaints;
