import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Menu, 
  X, 
  User, 
  LogOut, 
  HelpCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { getCurrentUser, switchRole, logout as apiLogout } from '../services/api';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const data = await getCurrentUser();
    // In our mock logic, if there's no name, we treat as guest
    setUser(data);
  };

  const handleRoleChange = async (role) => {
    const newUser = await switchRole(role, user?.nombre ? { nombre: user.nombre, email: user.email } : {});
    setUser(newUser);
    navigate('/');
    window.location.reload();
  };

  const handleLogout = async () => {
    await apiLogout();
    setProfileOpen(false);
    navigate('/');
    window.location.reload();
  };

  const isGuest = !user?.nombre;

  const navLinks = {
    guest: [
      { name: 'Inicio', path: '/' },
      { name: 'Monitorias', path: '/monitorias' },
    ],
    student: [
      { name: 'Inicio', path: '/' },
      { name: 'Monitorías', path: '/monitorias' },
      { name: 'Mis Monitorías', path: '/mis-monitorias' },
    ],
    monitor: [
      { name: 'Inicio', path: '/' },
      { name: 'Panel Monitor', path: '/monitor-dashboard' },
    ],
    admin: [
      { name: 'Inicio', path: '/' },
      { name: 'Panel Admin', path: '/admin-dashboard' },
    ]
  };

  const currentLinks = isGuest ? navLinks.guest : navLinks[user.role];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-1.5 bg-brand-blue rounded-lg text-white group-hover:rotate-6 transition-transform shadow-md shadow-brand-blue/20">
                <GraduationCap size={22} />
              </div>
              <span className="text-lg font-black text-gray-900 tracking-tighter">
                MONI<span className="text-brand-blue">TORES</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {currentLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-3 py-1.5 text-[13px] font-bold text-gray-500 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all"
              >
                {link.name}
              </Link>
            ))}
            
            <div className="ml-4 pl-4 border-l border-gray-100 flex items-center gap-3">
              {!isGuest && (user.baseRole === 'admin' || user.baseRole === 'monitor') && (
                <select 
                  value={user.role} 
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="bg-gray-50 border-2 border-transparent text-[10px] font-black rounded-lg px-3 py-1.5 focus:border-brand-blue/20 outline-none cursor-pointer text-gray-500 hover:bg-gray-100 transition-all uppercase tracking-widest"
                >
                  <option value="student">🎓 Estudiante</option>
                  <option value="monitor">🧑‍🏫 Monitor</option>
                  {user.baseRole === 'admin' && <option value="admin">🛡️ Admin</option>}
                </select>
              )}

              {isGuest ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate('/signup')}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-[11px] font-black rounded-lg shadow-md shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all uppercase tracking-widest"
                  >
                    <UserPlus size={14} /> Registrarse
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue text-[11px] font-black rounded-lg border border-brand-blue/20 hover:bg-brand-blue/5 active:scale-95 transition-all uppercase tracking-widest"
                  >
                    <LogIn size={14} /> Ingresar
                  </button>

                </div>
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setProfileOpen(!profileOpen)}
                    onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
                    className="flex items-center gap-2 p-1 pl-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-gray-900 leading-none">{user.nombre || 'Usuario'}</p>
                      <p className="text-[8px] font-bold text-brand-blue uppercase leading-none mt-1 tracking-tighter">{user.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-[13px] font-black shadow-sm shadow-brand-blue/20 group-hover:scale-105 transition-transform">
                      {user.nombre?.charAt(0) || 'U'}
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 animate-scale-in z-50">
                      <button 
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                      >
                        <User size={18} /> Mi Perfil
                      </button>
                      <button 
                        onClick={() => navigate('/complaints')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                      >
                        <HelpCircle size={18} /> Ayuda
                      </button>
                      <div className="h-px bg-gray-50 my-2 mx-3"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut size={18} /> Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-50 px-4 pt-2 pb-6 space-y-2 animate-fade-in shadow-xl">
          {currentLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-4 text-base font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-2xl transition-all"
            >
              {link.name}
            </Link>
          ))}
          {!isGuest && (
            <>
              <div className="h-px bg-gray-50 my-4"></div>
              <select 
                value={user.role} 
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent text-sm font-black rounded-2xl outline-none"
              >
                <option value="student">Estudiante</option>
                <option value="monitor">Monitor</option>
                <option value="admin">Admin</option>
              </select>
              <button 
                onClick={handleLogout}
                className="w-full p-4 text-red-500 font-bold bg-red-50 rounded-2xl text-center flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> Cerrar Sesión
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
