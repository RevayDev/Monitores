import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/complaints" element={<Complaints />} />

            <Route path="/monitorias" element={<Monitorias />} />
            <Route path="/mis-monitorias" element={<MisMonitorias />} />
            <Route path="/monitor-dashboard" element={<MonitorDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/survey/:monitorId" element={<AttendanceSurvey />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-sm font-medium">
          &copy; 2024 Gestión de Monitorías Universitarias - Todos los derechos reservados.
        </footer>
      </div>
    </Router>
  );
}

export default App
