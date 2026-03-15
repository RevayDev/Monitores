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
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Complaints from './pages/Complaints';
import Login from './pages/Login';
import Toast from './components/Toast';

export const ToastContext = React.createContext();

function AnimatedRoutes() {
  const location = useLocation();
  
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
        <Route path="/survey/:monitorId" element={<PageTransition><AttendanceSurvey /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [toast, setToast] = React.useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <AnimatedRoutes />
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
