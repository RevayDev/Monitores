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
import ModuleForum from './pages/ModuleForum';
import MonitorAttendanceSheet from './pages/MonitorAttendanceSheet';
import Toaster from './components/Toaster';
import BetaBanner from './components/BetaBanner';
import { getMaintenanceConfig, getCurrentUser } from './services/api';
import { Wrench, ShieldAlert } from 'lucide-react';
import HelpCenter from './pages/HelpCenter';

import { ToastContext } from './context/ToastContext';

const safeParse = (raw, fallback = {}) => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? fallback);
  } catch {
    return fallback;
  }
};

function AnimatedRoutes({ isMaintenance, userRole, isSuspended }) {
  const location = useLocation();

  // Suspension Guard
  if (isSuspended && userRole !== 'dev') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[32px] flex items-center justify-center animate-pulse">
          <ShieldAlert size={48} />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
            Cuenta Suspendida
          </h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            Tu cuenta ha sido dada de baja del sistema. Si crees que esto es un error, por favor contacta a la administración de tu sede.
          </p>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={async () => {
              const { logout } = await import('./services/api');
              await logout();
              window.dispatchEvent(new Event('profile-updated'));
            }}
            className="px-8 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Maintenance Guard: Only Devs can bypass
  if (isMaintenance && userRole !== 'dev') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-purple-200 text-purple-600 rounded-[32px] flex items-center justify-center animate-pulse">
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
            className="px-8 py-4 bg-brand-blue text-white font-black rounded-2xl hover:bg-brand-dark-blue active:scale-95 transition-all uppercase tracking-widest text-sm"
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
        <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />

        <Route path="/monitorias" element={<PageTransition><Monitorias /></PageTransition>} />
        <Route path="/mis-monitorias" element={<PageTransition><MisMonitorias /></PageTransition>} />
        <Route path="/monitor-dashboard" element={<PageTransition><MonitorDashboard /></PageTransition>} />
        <Route path="/admin-dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/dev-dashboard" element={<PageTransition><DevDashboard /></PageTransition>} />
        <Route path="/survey/:monitorId" element={<PageTransition><AttendanceSurvey /></PageTransition>} />
        <Route path="/attendance-template/:id" element={<PageTransition><AttendanceTemplate /></PageTransition>} />
        <Route path="/modules/:id/forum" element={<PageTransition><ModuleForum /></PageTransition>} />
        <Route path="/monitor-attendance/:id" element={<PageTransition><MonitorAttendanceSheet /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [toast, setToast] = React.useState(null);
  const [maintenance, setMaintenance] = React.useState({
    login: false,
    signup: false,
    monitorias: false,
    adminPanel: false,
    monitorPanel: false,
    global: false
  });
  const [userRole, setUserRole] = React.useState(() => {
    try {
      const u = safeParse(localStorage.getItem('monitores_current_role'), {});
      return u.role || 'student';
    } catch {
      return 'student';
    }
  });
  const [isSuspended, setIsSuspended] = React.useState(() => {
    try {
      const u = safeParse(localStorage.getItem('monitores_current_role'), {});
      const restrictions = safeParse(u.restrictions, {});
      return u.is_active === 0 || u.is_active === false || restrictions.login;
    } catch {
      return false;
    }
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  React.useEffect(() => {
    const checkStatus = async () => {
      // 1. Check local state first to resolve flicker instantly
      try {
        const localUser = safeParse(localStorage.getItem('monitores_current_role'), {});
        if (localUser && localUser.role) {
          setUserRole(localUser.role);
          const restrictions = safeParse(localUser.restrictions, {});
          setIsSuspended(localUser.is_active === 0 || localUser.is_active === false || restrictions.login);
        } else {
          setUserRole('student');
          setIsSuspended(false);
        }
      } catch (e) {
        console.error("Local status check failed:", e);
      }

      // 2. Fetch fresh status from the server
      try {
        const [config, user] = await Promise.all([
          getMaintenanceConfig(),
          getCurrentUser()
        ]);
        if (config) setMaintenance(config);
        
        if (user) {
          setUserRole(user.role);
          const restrictions = safeParse(user.restrictions, {});
            
          if (user.is_active === 0 || user.is_active === false || restrictions.login) {
            setIsSuspended(true);
          } else {
            setIsSuspended(false);
          }
        } else {
          setIsSuspended(false);
        }
      } catch (error) {
        console.error("Status check failed:", error);
      }
    };
    checkStatus();

    // Update on auth changes
    window.addEventListener('profile-updated', checkStatus);
    window.addEventListener('data-updated', checkStatus); // New listener for dashboard changes
    return () => {
      window.removeEventListener('profile-updated', checkStatus);
      window.removeEventListener('data-updated', checkStatus);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <BetaBanner />
          <Navbar />
          <main className="flex-grow">
            <AnimatedRoutes 
              isMaintenance={maintenance.global} 
              maintenance={maintenance}
              userRole={userRole} 
              isSuspended={isSuspended} 
            />
          </main>
          <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-sm font-medium">
            &copy; 2026 Gestión de Monitorías Universitarias - Todos los derechos reservados. Diseñado y programado por Roberto Jimenez
          </footer>
        </div>
      </Router>
      <AnimatePresence>
        {toast && (
          <Toaster
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
