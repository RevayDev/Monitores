import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, UserCheck, X } from 'lucide-react';
import { ToastContext } from '../context/ToastContext';
import { requestPasswordReset } from '../services/api';
import InputField from '../components/InputField';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return showToast('Ingresa tu usuario o correo electrónico.', 'error');
    setLoading(true);
    try {
      const result = await requestPasswordReset(username.trim());
      setDoneMessage(result?.message || 'Si el usuario existe, se enviaron instrucciones.');
      setDoneModalOpen(true);
      setUsername('');
    } catch (error) {
      showToast(error.message || 'No se pudo enviar el enlace.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-50px)] bg-brand-gray flex items-start md:items-center justify-center p-3 pt-6 md:pt-3 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-[32px] overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in">
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-blue-600 to-brand-blue p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                <KeyRound size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black leading-tight tracking-tighter">
                  Recuperar <br /> Acceso
                </h1>
                <p className="text-white/80 text-sm font-medium opacity-80 leading-relaxed mt-2">
                  Enviaremos un enlace único al correo electrónico vinculado.
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold backdrop-blur-sm text-white/70">
              <p className="text-white uppercase tracking-widest mb-1 opacity-100">Seguridad</p>
              El enlace es de un único uso y expira en 30 minutos. No lo compartas con nadie.
            </div>
          </div>
        </div>

        <div className="md:w-7/12 p-5 md:p-8 flex flex-col justify-center bg-white">
          <form onSubmit={submit} className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">¿Olvidaste tu contraseña?</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restablecimiento Seguro</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-3 animate-scale-in">
              <InputField
                label="Usuario o Correo"
                icon={<UserCheck />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu usuario o correo"
                role="student"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-brand-blue text-white text-xs font-black disabled:opacity-50 hover:brightness-95 active:scale-95 transition-all shadow-md shadow-brand-blue/15"
              >
                {loading ? 'Enviando...' : 'Enviar enlace al correo'}
              </button>
            </div>

            <div className="pt-4 flex flex-col gap-4 border-t border-gray-50">
              <p className="text-center text-[10px] text-gray-400 font-bold">
                ¿Ya tienes cuenta? <Link to="/login" className="text-brand-blue hover:underline transition-colors">Inicia Sesión</Link>
              </p>
              <p className="text-center text-[10px] text-gray-400 font-bold">
                ¿No tienes cuenta? <Link to="/signup" className="text-brand-blue hover:underline transition-colors">Regístrate Aquí</Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {doneModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[1200] grid place-items-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-7 relative animate-scale-in">
            <button
              onClick={() => setDoneModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 grid place-items-center"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 grid place-items-center mb-4">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Enlace Enviado</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">{doneMessage}</p>
            <p className="text-xs font-bold text-slate-400 mt-2">Revisa tu bandeja de entrada y sigue el enlace seguro para restablecer tu contraseña.</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-5 w-full py-3.5 rounded-xl bg-brand-blue text-white font-black text-sm hover:bg-brand-dark-blue transition-all"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
