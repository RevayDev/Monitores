import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { Mail, Lock, LogIn, GraduationCap, Shield, UserCheck, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.role, formData.password);
      navigate('/');
      window.location.reload();
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', name: 'Estudiante', icon: <GraduationCap size={18} />, color: 'bg-blue-50 text-brand-blue' },
    { id: 'monitor', name: 'Monitor', icon: <UserCheck size={18} />, color: 'bg-green-50 text-green-600' },
    { id: 'admin', name: 'Admin', icon: <Shield size={18} />, color: 'bg-yellow-50 text-yellow-600' }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-3">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in">
        
        {/* Left Side: Branding */}
        <div className="md:w-5/12 bg-brand-blue p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <LogIn size={20} />
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tighter">
              Portal <br /> Universitario
            </h1>
            <p className="text-blue-100 text-xs font-medium opacity-80 leading-relaxed max-w-[180px]">
              Accede a tus monitorías y certificados.
            </p>
          </div>
          <div className="relative z-10 bg-white/5 p-3 rounded-2xl border border-white/10 text-[10px] font-bold">
            Verifica tu rol antes de continuar.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-7/12 p-8 flex flex-col justify-center bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Iniciar Sesión</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Acceso Seguro</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      formData.role === r.id 
                        ? 'border-brand-blue bg-brand-blue/5 shadow-sm' 
                        : 'border-gray-50 bg-gray-50 hover:bg-gray-100 hover:border-gray-100'
                    }`}
                  >
                    <div className={`${r.color} p-2 rounded-xl`}>
                      {r.icon}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      formData.role === r.id ? 'text-brand-blue' : 'text-gray-400'
                    }`}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Institucional</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-300 group-focus-within:text-brand-blue transition-colors">
                    <Mail size={16} />
                  </div>
                  <input 
                    required
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 outline-none text-black font-bold text-[13px] shadow-inner transition-all"
                    placeholder="usuario@u.edu"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
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
