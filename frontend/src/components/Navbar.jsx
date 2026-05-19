import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import Modal from './Modal';
import { getCurrentUser, switchRole, logout as apiLogout, getNotifications, markNotificationsRead, deleteNotification as apiDeleteNotification } from '../services/api';
import { io } from 'socket.io-client';
import { ToastContext } from '../context/ToastContext';

const getRoleColor = (role) => {
  if (role?.includes('dev')) return { bg: 'bg-violet-600', gradient: 'from-violet-600 to-indigo-600', bgLight: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' };
  if (role?.includes('admin')) return { bg: 'bg-indigo-600', gradient: 'from-indigo-600 to-indigo-700', bgLight: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
  if (role?.includes('monitor')) return { bg: 'bg-emerald-600', gradient: 'from-emerald-600 to-teal-600', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
  return { bg: 'bg-blue-600', gradient: 'from-blue-600 to-indigo-600', bgLight: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const notificationRef = React.useRef(null);
  const profileRef = React.useRef(null);
  const prevUnreadRef = React.useRef(0);
  const [bellAnimating, setBellAnimating] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
      socket = io(socketUrl);
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
        const notificationForumId = data.metadata?.forumId || data.metadata?.forum_id || data.metadata?.threadId || data.metadata?.thread_id;

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
      window.dispatchEvent(new Event('profile-updated'));
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      setUser(null);
      window.dispatchEvent(new Event('profile-updated'));
      setProfileOpen(false);
      setIsLogoutConfirmOpen(false);
      navigate('/login');
    } catch (error) {
      showToast('Error al cerrar sesión', 'error');
    }
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

  const renderNotificationBell = () => (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setNotificationsOpen(!notificationsOpen);
          if (!notificationsOpen) markAllNotificationsAsRead();
        }}
        className={`relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all active:scale-95 ${bellAnimating ? 'animate-shake-bell' : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full ${roleColor.bg} text-white text-[9px] font-bold grid place-items-center`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {notificationsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-3 w-80 max-h-[420px] overflow-auto bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 z-[100] animate-scale-in origin-top-right max-sm:fixed max-sm:top-20 max-sm:right-4 max-sm:left-4 max-sm:w-auto max-sm:max-h-[360px]"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Notificaciones</span>
            <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{notifications.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {notifications.length ? notifications.map((n) => {
              const isRecent = isNewlyCreated(n.created_at);
              const typeNormalized = String(n.type || '').toLowerCase();
              const isMention = ['forum_mention', 'mencion_foro'].includes(typeNormalized);
              return (
                <div key={n.id} className={`px-5 py-4 flex items-start gap-4 transition-all hover:bg-slate-50 group ${isRecent ? (isMention ? `${roleColor.bgLight} border-l-4 ${roleColor.border}` : 'bg-blue-50/50 border-l-4 border-l-blue-400') : ''}`}>
                  <button onClick={() => handleNotificationClick(n)} className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${isRecent ? (isMention ? roleColor.text : 'text-blue-600') : 'text-slate-700'}`}>
                        {getNotificationTypeLabel(n.type)}
                      </p>
                      {isRecent && (
                        <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-semibold">{new Date(n.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).toUpperCase()}</p>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            }) : (
              <div className="px-5 py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="text-slate-200" size={24} />
                </div>
                <p className="text-sm text-slate-400 font-medium">Sin notificaciones</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const currentLinks = isGuest ? navLinks.guest : navLinks.student;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group min-w-max">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white group-hover:rotate-6 group-hover:scale-110 transition-all shrink-0">
                <GraduationCap size={24} />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                MONI<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">TORES</span>
              </span>
            </Link>
          </div>


          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2">
            {currentLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-2 text-[13px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              >
                {link.name}
              </Link>
            ))}



            <div className="ml-6 pl-6 border-l border-slate-100 flex items-center gap-4">
              {!isGuest && renderNotificationBell()}

              {/* Dedicated Panel Buttons with Premium Styling */}
              {!isGuest && (user.role === 'monitor' || user.role === 'monitor_academico' || user.role === 'monitor_administrativo' || user.role === 'admin' || user.role === 'dev' || user.baseRole === 'monitor' || user.baseRole === 'monitor_academico' || user.baseRole === 'monitor_administrativo' || user.baseRole === 'admin' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/monitor-dashboard')}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 transition-all"
                >
                  <Users size={12} className="opacity-90" /> Monitor
                </button>
              )}

              {!isGuest && (user.role === 'admin' || user.baseRole === 'admin') && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <ShieldCheck size={12} className="opacity-90" /> Admin
                </button>
              )}

              {!isGuest && (user.role === 'dev' || user.baseRole === 'dev') && (
                <button
                  onClick={() => navigate('/dev-dashboard')}
                  className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-2 hover:bg-violet-700 transition-all"
                >
                  <Wrench size={12} className="opacity-90" /> Dev
                </button>
              )}

              {isGuest ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2.5 text-[11px] font-extrabold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-wider"
                  >
                    Ingresar
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-6 py-2.5  bg-brand-blue text-white text-[11px] font-extrabold rounded-xl hover:bg-black hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider"
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all border ${profileOpen ? 'border-slate-200 bg-white' : 'border-transparent hover:bg-slate-50'} group relative overflow-hidden`}
                  >
                    <UserAvatar user={user} size="md" className="group-hover:scale-105 transition-transform" />
                    <div className="text-left hidden sm:block relative z-10">
                      <p className="text-[11px] font-black text-gray-900 leading-tight tracking-tight">{user.nombre || 'Usuario'}</p>
                      <p className={`text-[8px] font-black uppercase leading-none mt-1 tracking-[0.1em] ${roleColor.text} opacity-70`}>
                        {user.role === 'dev' && (user.baseRole === 'monitor' || user.is_monitor || user.monitorId) ? 'Dev + Monitor' : user.role}
                      </p>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 group-hover:text-slate-600 transition-all ${profileOpen ? 'rotate-180 text-brand-blue' : ''}`} />

                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-[24px] border border-slate-100 py-3 z-50 overflow-hidden ring-1 ring-black/5"
                      >
                        <div className="px-5 py-3 mb-2 border-b border-slate-50/50 bg-slate-50/30">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sesión Activa</p>
                          <p className="text-[12px] font-black text-slate-900 truncate">{user.email || 'u@sede.edu'}</p>
                        </div>

                        <div className="px-2 space-y-1">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              navigate('/profile');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue rounded-xl transition-all group/item"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:bg-brand-blue/10 group-hover/item:text-brand-blue transition-colors">
                              <User size={16} />
                            </div>
                            <span className="flex-1 text-left">Mi Perfil</span>
                            <ChevronRight size={14} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                          </button>

                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              showToast("Centro de soporte en desarrollo", "info");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all group/item"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-white group-hover/item:text-slate-600 transition-colors">
                              <HelpCircle size={16} />
                            </div>
                            <span className="flex-1 text-left">Ayuda & Soporte</span>
                          </button>
                        </div>

                        <div className="h-px bg-slate-100/50 my-2 mx-5"></div>

                        <div className="px-2">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setIsLogoutConfirmOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-all group/item"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-400 group-hover/item:bg-rose-500 group-hover/item:text-white transition-all">
                              <LogOut size={16} />
                            </div>
                            <span>Cerrar Sesión</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <Modal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} maxWidth="max-w-md">
            <div className="relative p-8 md:p-10 text-center space-y-6">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>

              <div className="w-20 h-20 bg-rose-50 rounded-[24px] flex items-center justify-center mx-auto text-rose-500">
                <AlertCircle size={40} />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">¿Cerrar Sesión?</h3>
                <p className="text-sm font-bold text-slate-500 px-2 leading-relaxed">
                  Estás a punto de salir de tu cuenta corporativa. Deberás ingresar tus credenciales nuevamente para acceder.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
                >
                  Sí, cerrar sesión
                </button>
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="w-full py-4 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all uppercase tracking-widest text-[11px]"
                >
                  Seguir conectado
                </button>
              </div>
            </div>
          </Modal>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {!isGuest && renderNotificationBell()}
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-wider"
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all uppercase tracking-wider"
                    >
                      <Users size={18} /> Monitor
                    </button>
                  )}

                  {(user.role === 'admin' || user.baseRole === 'admin') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/admin-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all uppercase tracking-wider"
                    >
                      <ShieldCheck size={18} /> Admin
                    </button>
                  )}

                  {(user.role === 'dev' || user.baseRole === 'dev') && (
                    <button
                      onClick={() => { setIsOpen(false); navigate('/dev-dashboard'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-all uppercase tracking-wider"
                    >
                      <Wrench size={18} /> Dev
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-2"></div>
                <button
                  onClick={() => { setIsOpen(false); setIsLogoutConfirmOpen(true); }}
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



