import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupStudent, getSedes, getCuatrimestres, getMaintenanceConfig } from '../services/api';
import { ToastContext } from '../context/ToastContext';
import {
  User,
  UserCheck,
  Mail,
  Lock,
  LogIn,
  ArrowRight,
  CheckCircle2,
  MapPin,
  GraduationCap
} from 'lucide-react';
import InputField from '../components/InputField';
import { motion, AnimatePresence } from 'framer-motion';

const Signup = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
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
        if (config?.signup && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
          showToast('El registro de nuevos estudiantes está deshabilitado por mantenimiento.', 'error');
          navigate('/');
          return;
        }

        setDbSedes(sedesList || []);
        setDbCuatrimestres(cuatsList || []);

        setFormData(prev => ({
          ...prev,
          sede: prev.sede || (sedesList && sedesList[0]) || '',
          cuatrimestre: prev.cuatrimestre || (cuatsList && cuatsList[0]) || ''
        }));
      } catch (err) {
        console.error("Error fetching signup data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.nombre || !formData.password) {
      showToast("Por favor completa todos los campos de acceso", "error");
      return;
    }
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.sede || !formData.cuatrimestre) {
      showToast("Por favor completa los datos académicos", "error");
      return;
    }

    setLoading(true);
    try {
      await signupStudent(formData);
      setLoading(false);
      showToast('¡Cuenta creada correctamente! Bienvenido.', 'success');
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Hubo un error al crear la cuenta.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray flex items-center justify-center p-4">
      <div className="max-w-4xl w-full md:min-h-[640px] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row animate-scale-in">

        {/* Left Side: Branding */}
        <div className="md:w-5/12 bg-brand-blue p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          
          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md hover:bg-white/20 transition-all border border-white/10">
              <LogIn size={14} /> Volver
            </Link>
            
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
              <GraduationCap size={28} />
            </div>
            
            <div>
              <h1 className="text-3xl font-black leading-none tracking-tighter italic mb-3">Únete a la Red</h1>
              <p className="text-blue-100 text-xs font-medium opacity-80 leading-relaxed max-w-[200px]">
                El primer paso para potenciar tu éxito académico comienza aquí.
              </p>
            </div>

            <div className="space-y-3">
              {["Registro Instantáneo", "Seguimiento Académico"].map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="bg-white/10 p-1 rounded-lg text-blue-300">
                    <CheckCircle2 size={10} />
                  </div>
                  <span className="text-[10px] font-bold text-blue-50/80">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[9px] font-bold backdrop-blur-sm">
                <p className="opacity-40 uppercase tracking-widest mb-1">Paso {step} de 2</p>
                {step === 1 ? 'Configura tu acceso' : 'Añade tu info académica'}
            </div>
          </div>
        </div>

        {/* Right Side: Step Wizard Content */}
        <div className="md:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                 {[1, 2].map((i) => (
                   <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-brand-blue' : 'w-2 bg-gray-100'}`}></div>
                 ))}
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registro de Estudiante</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {step === 1 ? 'Crea tu cuenta institucional' : 'Detalles de tu carrera'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-[11px] font-bold border border-red-100 mb-6 flex items-center gap-2 shadow-sm animate-shake">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <InputField 
                      label="Nombre de Usuario" 
                      icon={<UserCheck />} 
                      value={formData.username} 
                      onChange={e => setFormData({ ...formData, username: e.target.value })} 
                      placeholder="Ej. jdoe"
                    />
                    <InputField 
                      label="Nombre Completo" 
                      icon={<User />} 
                      value={formData.nombre} 
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                      placeholder="Tu nombre completo"
                    />
                    <InputField 
                      label="Contraseña" 
                      icon={<Lock />} 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData({ ...formData, password: e.target.value })} 
                      placeholder="Crea una clave segura"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        label="Sede" 
                        icon={<MapPin />} 
                        type="select" 
                        value={formData.sede} 
                        onChange={e => setFormData({ ...formData, sede: e.target.value })} 
                        options={dbSedes}
                      />
                      <InputField 
                        label="Cuatrimestre" 
                        icon={<GraduationCap />} 
                        type="select" 
                        value={formData.cuatrimestre} 
                        onChange={e => setFormData({ ...formData, cuatrimestre: e.target.value })} 
                        options={dbCuatrimestres}
                      />
                    </div>
                    <InputField 
                      label="Email Institucional" 
                      icon={<Mail />} 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      placeholder="tu@u.edu"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-8 border-t border-gray-50 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-blue text-white font-black text-sm rounded-2xl shadow-xl shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : step === 1 ? <>Siguiente <ArrowRight size={18} /></> : <>Crear Mi Perfil <ArrowRight size={18} /></>}
                </button>

                {step === 2 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full py-3 bg-white text-gray-400 font-bold text-[11px] uppercase tracking-widest border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black"
                  >
                    Volver al paso anterior
                  </button>
                )}

                <p className="text-center text-[10px] text-gray-400 font-bold">
                  ¿Ya tienes cuenta? <Link to="/login" className="text-brand-blue hover:underline transition-colors uppercase tracking-widest">Inicia Sesión</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
