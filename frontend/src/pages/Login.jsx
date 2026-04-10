import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMaintenanceConfig } from '../services/api';
import { Mail, Lock, LogIn, GraduationCap, Shield, UserCheck, ArrowRight, Clock, Wrench } from 'lucide-react';
import { ToastContext } from '../App';
import InputField from '../components/InputField';

const Login = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const checkMaint = async () => {
      const config = await getMaintenanceConfig();
      const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      if (config?.login && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
        showToast('El inicio de sesión está deshabilitado por mantenimiento.', 'error');
        navigate('/');
      }
    };
    checkMaint();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.username, formData.role, formData.password);
      navigate('/');
      window.location.reload();
    } catch (error) {
      showToast(typeof error === 'string' ? error : 'Credenciales incorrectas. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', name: 'Estudiante', icon: <GraduationCap size={18} /> },
    { id: 'monitor', name: 'Monitor', icon: <UserCheck size={18} /> },
    { id: 'admin', name: 'Admin', icon: <Shield size={18} /> },
    { id: 'dev', name: 'Dev', icon: <Wrench size={18} /> }
  ];

  const roleStyles = {
    student: {
      bg: 'bg-brand-blue',
      text: 'text-brand-blue',
      border: 'border-brand-blue',
      lightBg: 'bg-blue-50',
      shadow: 'shadow-blue-200'
    },
    monitor: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-600',
      lightBg: 'bg-emerald-50',
      shadow: 'shadow-emerald-200'
    },
    admin: {
      bg: 'bg-amber-600',
      text: 'text-amber-600',
      border: 'border-amber-600',
      lightBg: 'bg-amber-50',
      shadow: 'shadow-amber-200'
    },
    dev: {
      bg: 'bg-purple-600',
      text: 'text-purple-600',
      border: 'border-purple-600',
      lightBg: 'bg-purple-50',
      shadow: 'shadow-purple-200'
    }
  };

  const currentStyle = roleStyles[formData.role] || roleStyles.student;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-3 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in">

        {/* Left Side: Branding - Dynamic Background */}
        <div className={`hidden md:flex md:w-5/12 ${currentStyle.bg} p-8 text-white flex-col justify-between relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                <LogIn size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black leading-tight tracking-tighter">
                  Portal <br /> Universitario
                </h1>
                <p className="text-white/80 text-sm font-medium opacity-80 leading-relaxed mt-2">
                  Tu plataforma central de apoyo académico.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              {[
                { icon: <GraduationCap size={18} />, text: "Monitorías Personalizadas" },
                { icon: <Clock size={18} />, text: "Horarios Flexibles" },
                { icon: <UserCheck size={18} />, text: "Apoyo Directo" },

              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all border border-white/10">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-white/90">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold backdrop-blur-sm text-white/70">
              <p className="text-white uppercase tracking-widest mb-1 opacity-100">Seguridad</p>
              Verifica tu rol antes de continuar para acceder a tus funciones específicas.
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-center bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Iniciar Sesión</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Acceso Seguro</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {roles.map((r) => {
                  const rStyle = roleStyles[r.id];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r.id })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.role === r.id
                          ? `${rStyle.border} ${rStyle.lightBg} shadow-sm ${rStyle.shadow}`
                          : 'border-gray-50 bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      <div className={`${formData.role === r.id ? rStyle.bg : 'bg-gray-100'} ${formData.role === r.id ? 'text-white' : 'text-gray-400'} p-2 rounded-xl transition-colors`}>
                        {r.icon}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${formData.role === r.id ? rStyle.text : 'text-gray-400'
                        }`}>
                        {r.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <InputField 
                label="Nombre de Usuario" 
                icon={<UserCheck />} 
                value={formData.username} 
                onChange={e => setFormData({ ...formData, username: e.target.value })} 
                placeholder="usuario"
              />
              <InputField 
                label="Contraseña" 
                icon={<Lock />} 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({ ...formData, password: e.target.value })} 
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4 flex flex-col gap-4 border-t border-gray-50">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 ${currentStyle.bg} text-white font-black rounded-2xl shadow-xl ${currentStyle.shadow} hover:brightness-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm`}
              >
                {loading ? 'Firma...' : <>Entrar <ArrowRight size={18} /></>}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold">
                ¿No tienes cuenta? <Link to="/signup" className={`${currentStyle.text} hover:underline transition-colors`}>Regístrate Aquí</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
