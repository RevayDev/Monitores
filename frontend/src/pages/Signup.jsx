import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupStudent, getSedes, getCuatrimestres, getMaintenanceConfig } from '../services/api';
import { ToastContext } from '../App';
import {
  User,
  UserCheck,
  Mail,
  Lock,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  MapPin,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    confirmarPassword: '',
    cuatrimestre: '',
    sede: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dbSedes, setDbSedes] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [config, sedesList, cuatsList] = await Promise.all([
          getMaintenanceConfig(),
          getSedes(),
          getCuatrimestres()
        ]);

        const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
        if (config?.registro && session?.baseRole !== 'dev' && session?.role !== 'dev') {
          showToast('Esta función está en mantenimiento', 'error');
          navigate('/');
          return;
        }

        setDbSedes(sedesList || []);
        setDbCuatrimestres(cuatsList || []);
      } catch (err) {
        console.error("Error fetching signup data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { confirmarPassword, ...submitData } = formData;
      await signupStudent(submitData);
      setLoading(false);
      showToast('¡Cuenta creada correctamente! Bienvenido.', 'success');
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError('Hubo un error al crear la cuenta.');
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-brand-blue/20 outline-none text-gray-900 font-bold text-[12px] shadow-inner transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col lg:flex-row animate-scale-in">

        {/* Left Side - hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/4 bg-brand-blue p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

          <div className="relative z-10 space-y-4">
            <div className="bg-white/20 p-3 rounded-2xl w-fit">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-black leading-none tracking-tighter italic">Únete a la Red</h1>
            <p className="text-blue-100 text-[10px] font-medium opacity-80 leading-relaxed">
              El primer paso para potenciar tu éxito académico comienza aquí.
            </p>

            <div className="space-y-3 pt-4">
              {["Monitorías Personalizadas", "Seguimiento de Progreso"].map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="bg-white/10 p-1 rounded-lg text-blue-300">
                    <CheckCircle2 size={12} />
                  </div>
                  <span className="text-[10px] font-bold text-blue-50">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-[8px] font-bold opacity-50 uppercase tracking-widest">
            © 2026 Sistema de Monitores
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="lg:w-3/4 p-5 sm:p-8 lg:p-10 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registro de Estudiante</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Información Personal y Académica</p>
              </div>
              <div className="hidden sm:block">
                <UserPlus size={40} className="text-gray-100" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-[11px] font-bold border border-red-100 flex items-center gap-2 animate-shake">
                <span className="bg-red-100 p-1 rounded-lg">⚠️</span> {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Row 1: Basicos */}
              <div className="space-y-2.5 lg:col-span-2">
                <label className={labelClass}><User size={12} /> Nombre Completo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <User size={14} />
                  </div>
                  <input
                    required
                    className={inputClass}
                    placeholder="Tu nombre completo"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className={labelClass}><UserCheck size={12} /> Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <UserCheck size={14} />
                  </div>
                  <input
                    required
                    className={inputClass}
                    placeholder="Ej. jdoe"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2: Academico & Email (Email widened to 2 cols) */}
              <div className="space-y-2.5 lg:col-span-2">
                <label className={labelClass}><Mail size={12} /> Email Institucional</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <Mail size={14} />
                  </div>
                  <input
                    required
                    type="email"
                    className={inputClass}
                    placeholder="tu@u.edu"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className={labelClass}><MapPin size={12} /> Sede</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <MapPin size={14} />
                  </div>
                  <select
                    required
                    className={`${inputClass} appearance-none cursor-pointer`}
                    value={formData.sede}
                    onChange={e => setFormData({ ...formData, sede: e.target.value })}
                  >
                    <option value="">Selecciona Sede</option>
                    {dbSedes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className={labelClass}><GraduationCap size={12} /> Cuatrimestre</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <GraduationCap size={14} />
                  </div>
                  <select
                    required
                    className={`${inputClass} appearance-none cursor-pointer`}
                    value={formData.cuatrimestre}
                    onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })}
                  >
                    <option value="">Selecciona ciclo</option>
                    {dbCuatrimestres.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Passwords (Contracted to 1 col each) */}
              <div className="space-y-2.5 lg:col-span-1">
                <label className={labelClass}><Lock size={12} /> Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <Lock size={14} />
                  </div>
                  <input
                    required
                    type="password"
                    className={inputClass}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5 lg:col-span-1">
                <label className={labelClass}><Lock size={12} />Repetir Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <ShieldCheck size={14} />
                  </div>
                  <input
                    required
                    type="password"
                    className={inputClass}
                    placeholder="Repite tu contraseña"
                    value={formData.confirmarPassword}
                    onChange={e => setFormData({ ...formData, confirmarPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-blue text-white font-black text-sm rounded-2xl shadow-xl shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : <>Crear Mi Perfil <ArrowRight size={18} /></>}
              </button>

              <p className="text-[11px] text-gray-400 font-bold">
                ¿Ya tienes cuenta? <Link to="/login" className="text-brand-blue hover:underline">Inicia Sesión</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
