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
  UserPlus,
  Users,
  ShieldCheck,
  Wrench,
  Bell,
  Trash2
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { getCurrentUser, switchRole, logout as apiLogout, getNotifications, markNotificationsRead, deleteNotification as apiDeleteNotification } from '../services/api';
import { ToastContext } from '../App';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const notificationRef = React.useRef(null);
  const prevUnreadRef = React.useRef(0);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    fetchUser();
    const loadNotifications = async () => {
      try {
        const rows = await getNotifications();
        setNotifications(rows || []);
      } catch {
        setNotifications([]);
      }
    };
    loadNotifications();
    // Re-fetch user when profile is updated from another page
    window.addEventListener('profile-updated', fetchUser);
    window.addEventListener('notifications-updated', loadNotifications);
    return () => {
      window.removeEventListener('profile-updated', fetchUser);
      window.removeEventListener('notifications-updated', loadNotifications);
    };
  }, []);

  useEffect(() => {
    const currentUnread = notifications.filter((n) => !n.is_read).length;
    if (currentUnread > prevUnreadRef.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.04;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch {
        // no-op
      }
    }
    prevUnreadRef.current = currentUnread;
  }, [notifications]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function fetchUser() {
    const data = await getCurrentUser();
    setUser(data);
  }

  const handleRoleChange = async (role, shouldNavigate = true) => {
    const newUser = await switchRole(role, user?.nombre ? { nombre: user.nombre, email: user.email } : {});
    setUser(newUser);
    if (shouldNavigate) {
      navigate('/');
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setProfileOpen(false);
    navigate('/');
    window.location.reload();
  };

  const isGuest = !user?.nombre;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllNotificationsAsRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // no-op
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await apiDeleteNotification(id);
      setNotifications((prev) => prev.filter((n) => Number(n.id) !== Number(id)));
    } catch (error) {
      showToast(error.message || 'No se pudo eliminar la notificacion.', 'error');
    }
  };

  const handleNotificationClick = async (item) => {
    setNotificationsOpen(false);
    if (item?.link) navigate(item.link);
  };

  const navLinks = {
    guest: [
      { name: 'Inicio', path: '/' },
      { name: 'Monitorias', path: '/monitorias' },
    ],
    student: [
      { name: 'Inicio', path: '/' },
      { name: 'Monitorías', path: '/monitorias' },
      { name: 'Mis Monitorías', path: '/mis-monitorias' },
    ]
  };

  const currentLinks = isGuest ? navLinks.guest : navLinks.student;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group min-w-max">
              <div className="p-1.5 bg-brand-blue rounded-lg text-white group-hover:rotate-6 transition-transform shadow-md shadow-brand-blue/20 shrink-0">
                <GraduationCap size={22} />
              </div>
              <span className="text-lg font-black text-gray-900 tracking-tighter whitespace-nowrap">
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
              {!isGuest && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      if (!notificationsOpen) markAllNotificationsAsRead();
                    }}
                    className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-brand-blue"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 text-xs font-black uppercase tracking-widest text-gray-500">Notificaciones</div>
                      <div className="divide-y divide-gray-100">
                        {notifications.length ? notifications.map((n, idx) => (
                          <div key={n.id} className={`px-4 py-3 flex items-start gap-2 ${!n.is_read && idx === 0 ? 'bg-amber-50' : ''}`}>
                            <button onClick={() => handleNotificationClick(n)} className="flex-1 text-left">
                              <p className="text-xs font-black text-gray-900">{n.type}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            </button>
                            <button onClick={() => handleDeleteNotification(n.id)} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )) : <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin notificaciones</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Dedicated Panel Buttons based on baseRole */}
              {!isGuest && (user.role === 'monitor' || user.role === 'monitor_administrativo' || user.role === 'admin' || user.role === 'dev' || user.baseRole === 'monitor' || user.baseRole === 'monitor_administrativo' || user.baseRole === 'admin' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/monitor-dashboard')}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Users size={13} /> Panel Monitor
                </button>
              )}

              {!isGuest && (user.role === 'admin' || user.baseRole === 'admin') && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-600/20"
                >
                  <ShieldCheck size={13} /> Panel Admin
                </button>
              )}

              {!isGuest && (user.role === 'dev' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/dev-dashboard')}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-600/20"
                >
                  <Wrench size={13} /> Panel DEV
                </button>
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
                    className="flex items-center gap-2 p-1 pl-2 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-gray-900 leading-none">{user.nombre || 'Usuario'}</p>
                      <p className="text-[8px] font-bold text-brand-blue uppercase leading-none mt-1 tracking-tighter">{user.role}</p>
                    </div>
                    <UserAvatar user={user} size="md" rounded="rounded-xl" />
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
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-gray-100 shadow-xl animate-fade-in z-50">
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
                <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 rounded-2xl">
                  <UserAvatar user={user} size="md" />
                  <div className="min-w-0 flex-grow">
                    <p className="text-sm font-black text-gray-900 leading-none truncate">{user.nombre || 'Usuario'}</p>
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mt-1.5 opacity-80">
                      {user.role}
                    </p>
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

                {/* Mobile Dashboards Container */}
                <div className="flex flex-col gap-2 pt-2 pb-1">
                  {(user.role === 'monitor' || user.role === 'monitor_administrativo' || user.role === 'admin' || user.role === 'dev' || user.baseRole === 'monitor' || user.baseRole === 'monitor_administrativo' || user.baseRole === 'admin' || user.baseRole === 'dev') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/monitor-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 uppercase tracking-widest"
                    >
                      <Users size={18} /> Panel Monitor
                    </button>
                  )}

                  {(user.role === 'admin' || user.baseRole === 'admin') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/admin-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-600 text-white text-sm font-black rounded-xl hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20 uppercase tracking-widest"
                    >
                      <ShieldCheck size={18} /> Panel Admin
                    </button>
                  )}

                  {(user.role === 'dev' || user.baseRole === 'dev') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/dev-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-purple-600 text-white text-sm font-black rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 uppercase tracking-widest"
                    >
                      <Wrench size={18} /> Panel DEV
                    </button>
                  )}
                </div>

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
