import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import Home from './pages/Home';
import Monitorias from './pages/Monitorias';
import MisMonitorias from './pages/MisMonitorias';
import MonitorDashboard from './pages/MonitorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AttendanceSurvey from './pages/AttendanceSurvey';
import AttendanceTemplate from './pages/AttendanceTemplate';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Complaints from './pages/Complaints';
import DevDashboard from './pages/DevDashboard';
import Login from './pages/Login';
import Toast from './components/Toast';
import { getMaintenanceConfig, getCurrentUser } from './services/api';
import { Wrench, ShieldAlert } from 'lucide-react';

export const ToastContext = React.createContext();

function AnimatedRoutes({ isMaintenance, userRole }) {
  const location = useLocation();

  // Maintenance Guard: Only Devs can bypass
  if (isMaintenance && userRole !== 'dev') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-purple-200 text-purple-600 rounded-[32px] flex items-center justify-center animate-pulse shadow-xl shadow-purple-200/50">
          <Wrench size={48} />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
            Modo Mantenimiento
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            Estamos realizando mejoras en la plataforma para brindarte una mejor experiencia. Solo personal autorizado (DEVS) puede acceder en este momento.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Reintentar Acceso
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/complaints" element={<PageTransition><Complaints /></PageTransition>} />

        <Route path="/monitorias" element={<PageTransition><Monitorias /></PageTransition>} />
        <Route path="/mis-monitorias" element={<PageTransition><MisMonitorias /></PageTransition>} />
        <Route path="/monitor-dashboard" element={<PageTransition><MonitorDashboard /></PageTransition>} />
        <Route path="/admin-dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/dev-dashboard" element={<PageTransition><DevDashboard /></PageTransition>} />
        <Route path="/survey/:monitorId" element={<PageTransition><AttendanceSurvey /></PageTransition>} />
        <Route path="/attendance-template/:id" element={<PageTransition><AttendanceTemplate /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [toast, setToast] = React.useState(null);
  const [isMaintenance, setIsMaintenance] = React.useState(false);
  const [userRole, setUserRole] = React.useState('student');

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const [config, user] = await Promise.all([
          getMaintenanceConfig(),
          getCurrentUser()
        ]);
        if (config) setIsMaintenance(config.global);
        if (user) setUserRole(user.role);
      } catch (error) {
        console.error("Status check failed:", error);
      }
    };
    checkStatus();

    // Update on auth changes
    window.addEventListener('profile-updated', checkStatus);
    return () => window.removeEventListener('profile-updated', checkStatus);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <AnimatedRoutes isMaintenance={isMaintenance} userRole={userRole} />
          </main>
          <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-sm font-medium">
            &copy; 2026 Gestión de Monitorías Universitarias - Todos los derechos reservados. Diseñado y programado por Roberto Jimenez
          </footer>
        </div>
      </Router>
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export default App
