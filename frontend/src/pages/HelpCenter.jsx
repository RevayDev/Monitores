import React, { useState } from 'react';
import { LifeBuoy, Mail, Send, MessageCircle, Globe, ChevronRight, ChevronDown } from 'lucide-react';
import { submitSupportRequest } from '../services/api';
import { ToastContext } from '../context/ToastContext';

const HelpCenter = () => {
  const { showToast } = React.useContext(ToastContext);
  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  const [form, setForm] = useState({
    name: session?.nombre || '',
    email: session?.email || '',
    subject: '',
    category: 'tecnico',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSending(true);
      const response = await submitSupportRequest(form);
      showToast(response?.message || 'Solicitud enviada.', 'success');
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
    } catch (error) {
      showToast(error.message || 'No se pudo enviar la solicitud.', 'error');
    } finally {
      setSending(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue border border-blue-100 flex items-center justify-center">
              <LifeBuoy size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Ayuda y soporte</h1>
              <p className="text-xs font-black uppercase tracking-wider text-brand-blue mt-1">Formulario de soporte</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">
            Tu solicitud se guarda en la base de datos y el equipo puede responderte por correo.
          </p>
        </header>

        <section className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Correo de respuesta</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@correo.com"
                  type="email"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Tipo de caso</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="tecnico">Tecnico</option>
                    <option value="cuenta">Cuenta y acceso</option>
                    <option value="modulo">Modulo o registro</option>
                    <option value="sugerencia">Sugerencia / mejora</option>
                    <option value="otro">Otro</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Asunto</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Resumen breve"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Detalle</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe el problema y pasos para reproducirlo"
                rows={6}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white border border-brand-blue font-black flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-brand-dark-blue transition-colors"
            >
              <Send size={16} />
              {sending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="mailto:soporte@monitores.com" className="bg-white border-2 border-gray-200 hover:border-brand-blue rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors">
            <span className="flex items-center gap-3"><Mail size={18} className="text-brand-blue" /><span className="font-bold text-sm text-gray-700">Correo</span></span>
            <ChevronRight size={16} className="text-gray-400" />
          </a>
          <a href="https://wa.me/" target="_blank" rel="noreferrer" className="bg-white border-2 border-gray-200 hover:border-brand-blue rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors">
            <span className="flex items-center gap-3"><MessageCircle size={18} className="text-brand-blue" /><span className="font-bold text-sm text-gray-700">WhatsApp</span></span>
            <ChevronRight size={16} className="text-gray-400" />
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="bg-white border-2 border-gray-200 hover:border-brand-blue rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors">
            <span className="flex items-center gap-3"><Globe size={18} className="text-brand-blue" /><span className="font-bold text-sm text-gray-700">Redes</span></span>
            <ChevronRight size={16} className="text-gray-400" />
          </a>
        </section>
      </div>
    </div>
  );
};

export default HelpCenter;
