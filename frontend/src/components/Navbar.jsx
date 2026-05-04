import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  ChevronDown
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { getCurrentUser, switchRole, logout as apiLogout, getNotifications, markNotificationsRead, deleteNotification as apiDeleteNotification } from '../services/api';
import { io } from 'socket.io-client';
import { ToastContext } from '../context/ToastContext';

const getRoleColor = (role) => {
  if (role?.includes('dev')) return { bg: 'bg-violet-600', bgLight: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' };
  if (role?.includes('admin')) return { bg: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
  if (role?.includes('monitor')) return { bg: 'bg-emerald-600', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
  return { bg: 'bg-blue-600', bgLight: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const notificationRef = React.useRef(null);
  const prevUnreadRef = React.useRef(0);
  const [bellAnimating, setBellAnimating] = useState(false);
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

    // Socket connection for notifications (Restored)
    let socket;
    if (user?.id) {
      socket = io('http://localhost:3000');
      socket.emit('join_user', user.id);
      socket.on('new_notification', (data) => {
        if (data?.event === 'notifications_read_all') {
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
          return;
        }

        if (data?.event === 'notification_deleted') {
          setNotifications((prev) => prev.filter((n) => Number(n.id) !== Number(data.notificationId)));
          return;
        }

        const activeForumId = localStorage.getItem('monitores_active_forum_id');
        const notificationForumId = data.metadata?.forumId || data.metadata?.forum_id;

        // Only show toast if NOT looking at that specific forum thread
        if (!activeForumId || String(activeForumId) !== String(notificationForumId)) {
          showToast(data.message || { title: data.title, body: data.body }, 'notification');
        }

        // Prepend new notification to state immediately for real-time bubble update
        setNotifications(prev => {
          if (prev.find(n => n.id === data.id)) return prev;
          return [data, ...prev];
        });

        // Trigger visceral shake animation for ALL incoming notifications
        setBellAnimating(true);
        setTimeout(() => setBellAnimating(false), 600);
      });
    }

    // Re-fetch user when profile is updated from another page
    window.addEventListener('profile-updated', fetchUser);
    window.addEventListener('notifications-updated', loadNotifications);
    return () => {
      if (socket) socket.close();
      window.removeEventListener('profile-updated', fetchUser);
      window.removeEventListener('notifications-updated', loadNotifications);
    };
  }, [user?.id]);

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
  const roleColor = user ? getRoleColor(user.role) : getRoleColor('student');

  const markAllNotificationsAsRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // no-op
    }
  };

  const resolveNotificationLink = (item) => {
    if (item?.link) return item.link;
    const metadata = item?.metadata || {};
    const forumId = metadata.forumId || metadata.forum_id;
    const moduleId = metadata.moduleId || metadata.module_id;
    if (forumId && moduleId) return '/modules/' + moduleId + '/forum?forumId=' + forumId;
    if (moduleId) return '/modules/' + moduleId + '/forum';
    return null;
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
    const targetLink = resolveNotificationLink(item);
    if (targetLink) navigate(targetLink);
  };

  const isNewlyCreated = (dateString) => {
    if (!dateString) return false;
    const diff = (new Date() - new Date(dateString)) / 1000 / 60; // en minutos
    return diff < 5;
  };

  const getNotificationTypeLabel = (type) => {
    const map = {
      mencion_foro: 'Mencion en foro',
      respuesta_foro: 'Respuesta a tu pregunta',
      actividad_foro_monitor: 'Actividad del modulo',
      lunch_delivered: 'Almuerzo registrado',
      account_created: 'Cuenta creada',
      account_created_by_admin: 'Cuenta creada por administrador',
      forum_mention: 'Mencion en foro',
      forum_reply: 'Respuesta a tu pregunta',
      forum_activity: 'Actividad del modulo',
      forum_new_question: 'Nueva pregunta en modulo'
    };
    return map[String(type || '').toLowerCase()] || String(type || 'Notificacion').replace(/_/g, ' ');
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

  const NotificationBell = () => (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setNotificationsOpen(!notificationsOpen);
          if (!notificationsOpen) markAllNotificationsAsRead();
        }}
        className={`relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all active:scale-95 ${bellAnimating ? 'animate-shake-bell' : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full ${roleColor.bg} text-white text-[10px] font-bold grid place-items-center shadow-sm`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {notificationsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-auto bg-white rounded-xl shadow-lg border border-slate-200 z-[100] animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Notificaciones</span>
            <span className="text-[10px] text-slate-400">{notifications.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {notifications.length ? notifications.map((n) => {
              const isRecent = isNewlyCreated(n.created_at);
              const typeNormalized = String(n.type || '').toLowerCase();
              const isMention = ['forum_mention', 'mencion_foro'].includes(typeNormalized);
              return (
                <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-all hover:bg-slate-50 group ${isRecent ? (isMention ? `${roleColor.bgLight} border-l-4 ${roleColor.border}` : 'bg-blue-50 border-l-4 border-l-blue-400') : ''}`}>
                  <button onClick={() => handleNotificationClick(n)} className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[11px] font-semibold uppercase tracking-tight ${isRecent ? (isMention ? roleColor.text : 'text-blue-600') : 'text-slate-700'}`}>
                        {getNotificationTypeLabel(n.type)}
                      </p>
                      {isRecent && (
                        <span className={`${isMention ? `${roleColor.bgLight} ${roleColor.text}` : 'bg-blue-100 text-blue-700'} text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-tight`}>
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }} className="p-1.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-90 opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            }) : <p className="px-4 py-8 text-sm text-slate-400 text-center">Sin notificaciones</p>}
          </div>
        </div>
      )}
    </div>
  );

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
                className="px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                {link.name}
              </Link>
            ))}



            <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
              {!isGuest && <NotificationBell />}

              {/* Dedicated Panel Buttons based on baseRole */}
              {!isGuest && (user.role === 'monitor' || user.role === 'monitor_academico' || user.role === 'monitor_administrativo' || user.role === 'admin' || user.role === 'dev' || user.baseRole === 'monitor' || user.baseRole === 'monitor_academico' || user.baseRole === 'monitor_administrativo' || user.baseRole === 'admin' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/monitor-dashboard')}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                >
                  <Users size={13} /> Monitor
                </button>
              )}

              {!isGuest && (user.role === 'admin' || user.baseRole === 'admin') && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-orange-600 active:scale-95 transition-all shadow-sm"
                >
                  <ShieldCheck size={13} /> Admin
                </button>
              )}

              {!isGuest && (user.role === 'dev' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/dev-dashboard')}
                  className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-violet-700 active:scale-95 transition-all shadow-sm"
                >
                  <Wrench size={13} /> Dev
                </button>
              )}

              {isGuest ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/signup')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[11px] font-semibold rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider"
                  >
                    <UserPlus size={14} /> Registrarse
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 text-[11px] font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 active:scale-95 transition-all uppercase tracking-wider"
                  >
                    <LogIn size={14} /> Ingresar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
                    className={`flex items-center gap-2 p-1 pl-2 rounded-xl transition-all border group ${roleColor.bgLight} border-transparent hover:border-slate-200`}
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-semibold text-slate-900 leading-none">{user.nombre || 'Usuario'}</p>
                      <p className={`text-[8px] font-semibold uppercase leading-none mt-1 tracking-wide ${roleColor.text}`}>{user.role}</p>
                    </div>
                    <UserAvatar user={user} size="md" />
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-fade-in z-50">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <User size={16} /> Mi Perfil
                      </button>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          showToast("Estamos trabajando en esta función", "info");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <HelpCircle size={16} /> Ayuda
                      </button>
                      <div className="h-px bg-slate-100 my-1 mx-3"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-all"
                      >
                        <LogOut size={16} /> Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {!isGuest && <NotificationBell />}
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
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-slate-200 shadow-lg animate-fade-in z-50">
          <div className="px-4 pt-3 pb-6 space-y-1">
            {/* Nav links */}
            {currentLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all"
              >
                {link.name}
              </Link>
            ))}

            <div className="h-px bg-slate-100 my-3"></div>

            {isGuest ? (
              /* Guest: login/signup buttons */
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => { setIsOpen(false); navigate('/signup'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider"
                >
                  <UserPlus size={18} /> Crear Cuenta
                </button>
                <button
                  onClick={() => { setIsOpen(false); navigate('/login'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 text-sm font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 active:scale-95 transition-all uppercase tracking-wider"
                >
                  <LogIn size={18} /> Ingresar
                </button>
              </div>
            ) : (
              /* Logged-in user */
              <>
                {/* User info */}
                <div className={`flex items-center gap-3 px-4 py-4 ${roleColor.bgLight} rounded-xl border ${roleColor.border}`}>
                  <UserAvatar user={user} size="md" />
                  <div className="min-w-0 flex-grow">
                    <p className="text-sm font-semibold text-slate-900 leading-none truncate">{user.nombre || 'Usuario'}</p>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide mt-1 ${roleColor.text}`}>
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Mi Perfil & Ayuda */}
                <button
                  onClick={() => { setIsOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <User size={16} /> Mi Perfil
                </button>
                <button
                  onClick={() => { setIsOpen(false); showToast("Estamos trabajando en esta función", "info"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <HelpCircle size={16} /> Ayuda
                </button>

                {/* Mobile Dashboards Container */}
                <div className="flex flex-col gap-2 pt-2 pb-1">
                  {(user.role === 'monitor' || user.role === 'monitor_academico' || user.role === 'monitor_administrativo' || user.role === 'admin' || user.role === 'dev' || user.baseRole === 'monitor' || user.baseRole === 'monitor_academico' || user.baseRole === 'monitor_administrativo' || user.baseRole === 'admin' || user.baseRole === 'dev') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/monitor-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm uppercase tracking-wider"
                    >
                      <Users size={18} /> Monitor
                    </button>
                  )}

                  {(user.role === 'admin' || user.baseRole === 'admin') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/admin-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all shadow-sm uppercase tracking-wider"
                    >
                      <ShieldCheck size={18} /> Admin
                    </button>
                  )}

                  {(user.role === 'dev' || user.baseRole === 'dev') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/dev-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-all shadow-sm uppercase tracking-wider"
                    >
                      <Wrench size={18} /> Dev
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-2"></div>
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all"
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



