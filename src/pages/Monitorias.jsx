import React, { useState, useEffect } from 'react';
import { getMonitorias, registerMonitoria, getCurrentUser, getMisMonitorias, getAllRegistrations } from '../services/api';
import MonitorCard from '../components/MonitorCard';
import Modal from '../components/Modal';
import { Search, Filter, Info, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToastContext } from '../App';

const Monitorias = () => {
  const [monitorias, setMonitorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingMonitoria, setPendingMonitoria] = useState(null);
  const [registeredName, setRegisteredName] = useState('');
  const [user, setUser] = useState(null);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const filteredFromRegistration = location.state?.selectedModulo || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser?.email) {
          const regs = await getMisMonitorias(currentUser.email);
          setRegisteredIds(regs.map(r => r.id));
        }

        const [data, registrations] = await Promise.all([
          getMonitorias(),
          getAllRegistrations()
        ]);
        
        setAllRegistrations(registrations || []);
        let filteredData = data || [];
        
        if (filteredFromRegistration) {
          filteredData = filteredData.filter(m => m.modulo === filteredFromRegistration);
        }

        // Filter by Sede OR Virtual modality if user has a sede
        if (currentUser?.sede) {
          filteredData = filteredData.filter(m => 
            m.sede === currentUser.sede || m.modalidad === 'Virtual'
          );
        }

        setMonitorias(filteredData);
      } catch (error) {
        console.error("Error fetching monitorias:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.addEventListener('data-updated', fetchData);
    return () => window.removeEventListener('data-updated', fetchData);
  }, [filteredFromRegistration]);

  const handleRegister = (monitoria) => {
    if (!user || !user.nombre) {
      navigate('/signup');
      return;
    }

    if (user.role !== 'student') {
      showToast("Solo los estudiantes pueden registrarse en monitorías.", "error");
      return;
    }

    if (monitoria.monitorId === user.id) {
      showToast("No puedes registrarte en tu propia monitoría.", "error");
      return;
    }

    setPendingMonitoria(monitoria);
    setIsConfirmOpen(true);
  };

  const confirmRegistration = async () => {
    if (!pendingMonitoria) return;
    
    setIsConfirmOpen(false);
    try {
      await registerMonitoria(pendingMonitoria, user);
      setRegisteredName(pendingMonitoria.modulo);
      setIsSuccessOpen(true);
      setRegisteredIds([...registeredIds, pendingMonitoria.id]);
    } catch (error) {
      showToast(error.message || "Error al registrarse", "error");
    } finally {
      setPendingMonitoria(null);
    }
  };

  const filteredMonitorias = monitorias.filter(m => 
    m.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.monitor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Monitorías Disponibles
          </h1>
          <p className="text-lg text-gray-600">
            Encuentra el apoyo académico que necesitas en las diferentes sedes y modalidades.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar por módulo o monitor..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={18} />
            <span>{filteredMonitorias.length} Resultados</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          </div>
        ) : filteredMonitorias.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMonitorias.map(m => (
              <MonitorCard 
                key={m.id} 
                data={m} 
                onAction={handleRegister} 
                actionLabel={registeredIds.includes(m.id) ? "Ir al Recurso" : "Registrarse"}
                isRegistered={registeredIds.includes(m.id)}
                showDescription={false}
                registrationCount={allRegistrations.filter(r => r.id === m.id).length}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
            <Info size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-500 font-medium">No se encontraron monitorías que coincidan con tu búsqueda.</p>
          </div>
        )}
        {/* Modal de Confirmación */}
        <Modal 
          isOpen={isConfirmOpen} 
          onClose={() => setIsConfirmOpen(false)} 
          title="Confirmar Registro"
        >
          <div className="text-center space-y-6">
            <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-100/50">
              <Info size={40} className="mx-auto text-amber-500 mb-3" />
              <p className="text-sm font-bold text-gray-800 leading-relaxed">
                ¿Estás seguro de que deseas registrarte en la monitoría de:
              </p>
              <h3 className="text-xl font-black text-brand-blue mt-2 italic">
                {pendingMonitoria?.modulo}
              </h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">
                Con {pendingMonitoria?.monitor}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmRegistration}
                className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Sí, Registrarme Ahora
              </button>
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="w-full py-3 text-gray-400 font-bold hover:bg-gray-50 rounded-xl transition-all text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de Éxito */}
        <Modal 
          isOpen={isSuccessOpen} 
          onClose={() => setIsSuccessOpen(false)} 
          title="¡Registro Exitoso!"
        >
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 p-4 rounded-full text-green-600">
                <CheckCircle2 size={48} />
              </div>
            </div>
            <p className="text-lg text-gray-700">
              Te has registrado correctamente en la monitoría de <span className="font-bold text-brand-blue">{registeredName}</span>.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => navigate('/mis-monitorias')}
                className="w-full py-4 rounded-xl bg-brand-blue text-white font-bold text-lg hover:bg-brand-dark-blue shadow-lg transition-all"
              >
                Ir a Mis Monitorías
              </button>
              <button 
                onClick={() => setIsSuccessOpen(false)}
                className="w-full py-2 text-gray-500 font-semibold hover:bg-gray-100 rounded-lg transition-all"
              >
                Seguir buscando
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Monitorias;
