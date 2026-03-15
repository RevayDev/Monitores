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
import { ToastContext } from '../App';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    fetchUser();
    // Re-fetch user when profile is updated from another page
    window.addEventListener('profile-updated', fetchUser);
    return () => window.removeEventListener('profile-updated', fetchUser);
  }, []);

  const fetchUser = async () => {
    const data = await getCurrentUser();
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
                    <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center text-[13px] font-black shadow-sm shadow-brand-blue/20 group-hover:scale-105 transition-transform overflow-hidden">
                      {user.foto ? (
                        <img src={user.foto} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        user.nombre?.charAt(0) || 'U'
                      )}
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 animate-scale-in z-50">
                      <button 
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                      >
                        <User size={18} /> Mi Perfil
                      </button>
                      <button 
                        onClick={() => {
                          setProfileOpen(false);
                          showToast("Estamos trabajando en esta función", "info");
                        }}
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
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl animate-fade-in">
          <div className="px-4 pt-3 pb-6 space-y-1">
            {/* Nav links */}
            {currentLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3.5 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-xl transition-all"
              >
                {link.name}
              </Link>
            ))}

            <div className="h-px bg-gray-100 my-3"></div>

            {isGuest ? (
              /* Guest: login/signup buttons */
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => { setIsOpen(false); navigate('/signup'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-brand-blue text-white text-sm font-black rounded-xl shadow-md shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all"
                >
                  <UserPlus size={18} /> Crear Mi Cuenta
                </button>
                <button
                  onClick={() => { setIsOpen(false); navigate('/login'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-white text-brand-blue text-sm font-black rounded-xl border-2 border-brand-blue/20 hover:bg-brand-blue/5 active:scale-95 transition-all"
                >
                  <LogIn size={18} /> Iniciar Sesión
                </button>
              </div>
            ) : (
              /* Logged-in user */
              <>
                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center text-base font-black shadow-sm shadow-brand-blue/20 shrink-0 overflow-hidden">
                    {user.foto ? (
                      <img src={user.foto} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.nombre?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 leading-none truncate">{user.nombre || 'Usuario'}</p>
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider mt-0.5">{user.role}</p>
                  </div>
                </div>

                {/* Mi Perfil & Ayuda */}
                <button
                  onClick={() => { setIsOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-xl transition-all"
                >
                  <User size={18} /> Mi Perfil
                </button>
                <button
                  onClick={() => { setIsOpen(false); showToast("Estamos trabajando en esta función", "info"); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-gray-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-xl transition-all"
                >
                  <HelpCircle size={18} /> Ayuda
                </button>

                {/* Role switcher — only for admin/monitor */}
                {(user.baseRole === 'admin' || user.baseRole === 'monitor') && (
                  <>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 pt-1 pb-0.5">Vista actual</p>
                    <div className="flex flex-col gap-1 p-1 bg-gray-50 rounded-xl">
                      {['student', 'monitor', ...(user.baseRole === 'admin' ? ['admin'] : [])].map(role => (
                        <button
                          key={role}
                          onClick={() => { handleRoleChange(role); setIsOpen(false); }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                            user.role === role
                              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <span>{role === 'student' ? '🎓' : role === 'monitor' ? '🧑‍🏫' : '🛡️'}</span>
                          <span>{role === 'student' ? 'Estudiante' : role === 'monitor' ? 'Monitor' : 'Administrador'}</span>
                          {user.role === role && (
                            <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Activo</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="h-px bg-gray-100 my-2"></div>
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                >
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
