import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Users } from 'lucide-react';
import { getAllUsers, getMaintenanceConfig } from '../services/api';
import StaffCard from '../components/StaffCard';
import PageTransition from '../components/PageTransition';

const Home = () => {
  const navigate = useNavigate();
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
        const filteredStaff = allUsers.filter(u => u.role === 'monitor' || u.role === 'admin' || u.role === 'dev');
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

  const filteredStaff = staff.filter(member => member.role === activeTab);

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
                  className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-brand-blue font-black rounded-2xl shadow-xl hover:bg-gray-50 active:scale-95 transition-all text-sm sm:text-base text-center"
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

        {/* Benefits Section */}
        <section className="py-10 sm:py-16 md:py-20 bg-gray-50 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { title: 'Excelencia Académica', desc: 'Monitores seleccionados por su alto rendimiento y compromiso pedagógico.', color: 'bg-blue-50 text-brand-blue' },
                { title: 'Flexibilidad Total', desc: 'Modalidades presenciales y virtuales adaptadas a tu ritmo de estudio.', color: 'bg-green-50 text-green-600' },
                { title: 'Gestión Transparente', desc: 'Poder seleconar tu propia monitoria.', color: 'bg-yellow-50 text-yellow-600' }
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start gap-4 hover:shadow-lg transition-all group cursor-pointer">
                  <div className={`${item.color} w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-xl group-hover:rotate-6 transition-transform`}>
                    0{i + 1}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-xl font-black text-gray-900 mb-1 tracking-tight">{item.title}</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
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
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'monitor' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    MONITORES
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'admin' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    ADMINS
                  </button>
                  <button
                    onClick={() => setActiveTab('dev')}
                    className={`flex-grow sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'dev' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-gray-400 hover:text-gray-600'
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
                className="self-start sm:self-auto px-5 py-3 bg-gray-50 text-gray-900 font-bold rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
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
