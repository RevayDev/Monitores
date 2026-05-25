import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import InputField from '../components/InputField';
import { resetPasswordWithToken } from '../services/api';
import { ToastContext } from '../context/ToastContext';

const ResetPassword = () => {
  const { token: pathToken } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  // Helper for password strength check
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Sin contraseña', color: 'bg-slate-200', width: 'w-0', textClass: 'text-slate-400', checks: { length: false, upper: false, lower: false, number: false, special: false } };
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    
    score += checks.length ? 1 : 0;
    score += checks.upper ? 1 : 0;
    score += checks.lower ? 1 : 0;
    score += checks.number ? 1 : 0;
    score += checks.special ? 1 : 0;

    if (score <= 2) return { score, label: 'Débil', color: 'bg-rose-500', width: 'w-1/3', textClass: 'text-rose-500', checks };
    if (score <= 4) return { score, label: 'Aceptable', color: 'bg-amber-500', width: 'w-2/3', textClass: 'text-amber-500', checks };
    return { score, label: 'Segura ✓', color: 'bg-emerald-500', width: 'w-full', textClass: 'text-emerald-600', checks };
  };

  const strength = getPasswordStrength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return showToast('Token no proporcionado o inválido.', 'error');
    if (form.password.length < 8) return showToast('La contraseña debe tener al menos 8 caracteres.', 'error');
    
    if (strength.score < 3) {
      return showToast('Por favor crea una contraseña más segura.', 'error');
    }

    if (form.password !== form.confirm) return showToast('Las contraseñas no coinciden.', 'error');
    setLoading(true);
    try {
      await resetPasswordWithToken(token, form.password);
      showToast('Contraseña actualizada con éxito.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'El enlace es inválido o ha expirado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Safe route guard if token is completely missing from URL
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-50px)] bg-brand-gray flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 grid place-items-center mx-auto animate-pulse">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Acceso No Autorizado</h2>
            <p className="text-gray-500 text-xs font-semibold leading-relaxed">
              No puedes entrar a esta sección directamente. Se requiere un enlace único y un token de seguridad válido para restablecer la contraseña.
            </p>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Solicitar Enlace de Recuperación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-50px)] bg-brand-gray flex items-start md:items-center justify-center p-3 pt-6 md:pt-3 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-[32px] overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in shadow-xl shadow-indigo-500/5">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black leading-tight tracking-tighter">
                  Nueva <br /> Contraseña
                </h1>
                <p className="text-white/80 text-sm font-medium opacity-80 leading-relaxed mt-2">
                  Establece una credencial robusta para proteger tu cuenta de Monitores Hub.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: '🔐', text: 'Mínimo 8 caracteres' },
                { icon: '🔤', text: 'Mayúsculas y minúsculas' },
                { icon: '🔢', text: 'Números y símbolos' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs font-bold text-white/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold backdrop-blur-sm text-white/70">
              <p className="text-white uppercase tracking-widest mb-1 opacity-100">Consejo de Seguridad</p>
              Usa combinaciones de letras, números y símbolos para crear una clave resistente a ataques de fuerza bruta.
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-7/12 p-5 md:p-8 flex flex-col justify-center bg-white">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Establecer Contraseña</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Seguridad de la Cuenta</p>
            </div>

            <div className="space-y-4">
              <InputField
                label="Nueva Contraseña"
                type="password"
                icon={<Lock />}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                role="dev"
              />

              <InputField
                label="Confirmar Contraseña"
                type="password"
                icon={<Lock />}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repite la contraseña"
                role="dev"
              />
            </div>

            {/* Password Strength Box — ALWAYS VISIBLE, above submit button */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-700/70 tracking-wider">Seguridad de la contraseña</span>
                <span className={`text-xs font-black uppercase tracking-tight ${form.password ? strength.textClass : 'text-slate-400'}`}>
                  {form.password ? strength.label : 'Escribe tu contraseña'}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ease-out ${strength.color} ${strength.width}`}></div>
              </div>

              {/* Requirements List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1">
                {[
                  { label: 'Mínimo 8 caracteres', met: strength.checks.length },
                  { label: 'Una letra mayúscula', met: strength.checks.upper },
                  { label: 'Una letra minúscula', met: strength.checks.lower },
                  { label: 'Un número (0-9)', met: strength.checks.number },
                  { label: 'Un carácter especial (!@#)', met: strength.checks.special },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      req.met 
                        ? 'bg-purple-100 border-purple-300 text-purple-700' 
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {req.met ? <Check size={9} className="stroke-[3.5px]" /> : <span className="w-1 h-1 bg-slate-300 rounded-full" />}
                    </div>
                    <span className={req.met ? 'text-purple-800' : 'text-slate-400'}>{req.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-purple-700/60 leading-normal font-medium border-t border-purple-100 pt-2 mt-1">
                💡 <strong>Consejo estándar:</strong> La mejor contraseña combina letras mayúsculas, minúsculas, dígitos y símbolos. Evita patrones obvios como fechas o secuencias.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                {loading ? 'Guardando...' : <>Actualizar Contraseña <ArrowRight size={18} /></>}
              </button>
              
              <p className="text-center text-[10px] text-gray-400 font-bold">
                ¿Recordaste tu contraseña? <Link to="/login" className="text-indigo-600 hover:underline transition-colors">Inicia Sesión</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
