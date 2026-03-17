import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMaintenanceConfig } from '../services/api';
import { Mail, Lock, LogIn, GraduationCap, Shield, UserCheck, ArrowRight, Clock, Wrench } from 'lucide-react';
import { ToastContext } from '../App';

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
    // Check Maintenance
    const config = getMaintenanceConfig();
    const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    if (config?.login && session?.baseRole !== 'dev' && session?.role !== 'dev') {
      showToast('Esta función está en mantenimiento', 'error');
      navigate('/');
    }
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
    { id: 'student', name: 'Estudiante', icon: <GraduationCap size={18} />, color: 'bg-blue-50 text-brand-blue' },
    { id: 'monitor', name: 'Monitor', icon: <UserCheck size={18} />, color: 'bg-green-50 text-green-600' },
    { id: 'admin', name: 'Admin', icon: <Shield size={18} />, color: 'bg-amber-50 text-amber-600' },
    { id: 'dev', name: 'Dev', icon: <Wrench size={18} />, color: 'bg-purple-50 text-purple-600' }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-3">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in">

        {/* Left Side: Branding - hidden on mobile */}
        <div className="hidden md:flex md:w-5/12 bg-brand-blue p-8 text-white flex-col justify-between relative overflow-hidden">
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
                <p className="text-blue-100 text-sm font-medium opacity-80 leading-relaxed mt-2">
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
                  <span className="text-xs font-bold text-blue-50/90">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-[10px] font-bold backdrop-blur-sm">
              <p className="text-blue-200 uppercase tracking-widest mb-1">Seguridad</p>
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
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.role === r.id
                        ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                        : 'border-gray-50 bg-gray-50 hover:bg-gray-100 hover:border-gray-100'
                      }`}
                  >
                    <div className={`${r.color} p-2 rounded-xl`}>
                      {r.icon}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${formData.role === r.id ? 'text-brand-blue' : 'text-gray-400'
                      }`}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <UserCheck size={16} />
                  </div>
                  <input
                    required
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 outline-none text-black font-bold text-[13px] shadow-inner transition-all"
                    placeholder="usuario"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    required
                    type="password"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 outline-none text-black font-bold text-[13px] shadow-inner transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-4 border-t border-gray-50">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? 'Firma...' : <>Entrar <ArrowRight size={18} /></>}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold">
                ¿No tienes cuenta? <Link to="/signup" className="text-brand-blue hover:underline">Regístrate Aquí</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
