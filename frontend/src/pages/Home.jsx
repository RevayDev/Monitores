import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Users, Trophy, Zap, Sparkles } from 'lucide-react';
import { getAllUsers, getMaintenanceConfig } from '../services/api';
import StaffCard from '../components/StaffCard';
import PageTransition from '../components/PageTransition';
import { ToastContext } from '../context/ToastContext';

const Home = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [staff, setStaff] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('monitor');
  const [config, setConfig] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [allUsers, configData] = await Promise.all([
          getAllUsers(),
          getMaintenanceConfig()
        ]);
        const filteredStaff = allUsers.filter(u => ['monitor', 'monitor_academico', 'monitor_administrativo', 'admin', 'dev'].includes(u.role));
        setStaff(filteredStaff);
        if (configData) setConfig(configData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Re-fetch when admin updates data
    window.addEventListener('data-updated', fetchData);
    return () => window.removeEventListener('data-updated', fetchData);
  }, []);

  const filteredStaff = staff.filter(member => {
    if (activeTab === 'monitor') {
      return ['monitor', 'monitor_academico', 'monitor_administrativo'].includes(member.role);
    }
    return member.role === activeTab;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } }
  };

  return (
    <PageTransition>
      <div className="bg-white min-h-[calc(100vh-80px)] font-sans">

        {/* Hero Section */}
        <section className="relative min-h-[360px] bg-brand-blue overflow-hidden flex items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue to-brand-dark-blue opacity-95"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full py-14 sm:py-20">
            <div className="max-w-3xl space-y-4 sm:space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                <span className={`w-2 h-2 rounded-full animate-pulse ${config?.global || config?.monitorias ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${config?.global || config?.monitorias ? 'text-yellow-400' : 'text-white'}`}>
                  {config?.global ? 'SISTEMA EN MANTENIMIENTO' : config?.monitorias ? 'PORTAL DE MONITORÍAS EN MANTENIMIENTO' : 'Portal Académico Activo'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                Potencia tu{' '}
                <span className="text-blue-300">Aprendizaje</span>
              </h1>

              <p className="text-sm sm:text-base text-blue-100 font-medium leading-relaxed max-w-xl opacity-90">
                Conecta con los mejores estudiantes de tu facultad. Gestiona tus monitorías y alcanza la excelencia académica.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-brand-blue font-black rounded-2xl shadow-xl hover:bg-gray-100 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base text-center"
                >
                  Crear Mi Cuenta 🎓
                </button>
                <button
                  onClick={() => {
                    const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
                    if (config?.monitorias && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
                      showToast('El sistema de monitorías está en mantenimiento técnico.', 'error');
                      return;
                    }
                    navigate('/monitorias');
                  }}
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-transparent border-2 border-white/30 text-white font-black rounded-2xl hover:bg-white/10 active:scale-95 transition-all text-sm sm:text-base text-center"
                >
                  Ver Monitorías 📋
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-16 md:py-20 bg-gray-50 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                {
                  title: 'Excelencia Académica',
                  desc: 'Monitores seleccionados por su alto rendimiento y compromiso pedagógico.',
                  gradient: 'from-blue-700 via-blue-600 to-blue-500',
                  bg: 'bg-blue-50',
                  icon: <Trophy size={24} />
                },
                {
                  title: 'Flexibilidad Total',
                  desc: 'Modalidades presenciales y virtuales adaptadas a tu ritmo de estudio.',
                  gradient: 'from-emerald-600 via-emerald-500 to-teal-400',
                  bg: 'bg-emerald-50',
                  icon: <Zap size={24} />
                },
                {
                  title: 'Gestión Transparente',
                  desc: 'Poder seleccionar tu propia monitoría con claridad total.',
                  gradient: 'from-amber-600 via-orange-500 to-yellow-400',
                  bg: 'bg-amber-50',
                  icon: <Sparkles size={24} />
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: "circOut" }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="relative group cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-[40px] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                  <div className="relative bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col gap-6 overflow-hidden">
                    {/* Background number accent */}
                    <div className="absolute -top-6 -right-6 text-[120px] font-black text-gray-50 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity select-none italic pointer-events-none">
                      {i + 1}
                    </div>

                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-xl shadow-blue-500/10 group-hover:rotate-12 transition-transform duration-500`}>
                      {item.icon}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed opacity-80">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Staff Section */}
        <section className="py-10 sm:py-16 md:py-24 bg-white px-4 sm:px-6">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 md:space-y-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 rounded-full border border-brand-blue/20">
                  <span className="text-brand-blue text-[10px] font-black uppercase tracking-widest">Nuestro Equipo</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">
                  Conoce a nuestros <span className="text-brand-blue">Especialistas</span>
                </h2>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 p-1 bg-gray-50 rounded-2xl w-full sm:w-fit mt-2">
                  <button
                    onClick={() => setActiveTab('monitor')}
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'monitor' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:bg-brand-dark-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    MONITORES
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'admin' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:bg-brand-dark-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    ADMINS
                  </button>
                  <button
                    onClick={() => setActiveTab('dev')}
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'dev' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:bg-brand-dark-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    DEVS
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
                  if (config?.monitorias && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
                    showToast('El sistema de monitorías está en mantenimiento técnico.', 'error');
                    return;
                  }
                  navigate('/monitorias');
                }}
                className="self-start sm:self-auto px-5 py-3 bg-gray-50 text-gray-900 font-black rounded-2xl border border-gray-100 hover:bg-gray-900 hover:text-white hover:border-gray-900 hover:shadow-xl active:scale-95 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                Ver Monitorías <PlusCircle size={16} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-8"
                >
                  {filteredStaff.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-gray-400 font-bold">
                      No hay {activeTab === 'monitor' ? 'monitores' : activeTab === 'admin' ? 'administradores' : 'miembros del equipo dev'} registrados.
                    </div>
                  ) : filteredStaff.map(member => (
                    <motion.div key={member.id} variants={cardVariants}>
                      <StaffCard user={member} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default Home;
