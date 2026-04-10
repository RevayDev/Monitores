import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser, getUserById, updateUser, deleteUser, logout, uploadImage, getSedes, getCuatrimestres } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Trash2,
  Camera,
  ShieldCheck,
  ArrowLeft,
  Save,
  AlertCircle,
  Check,
  MapPin,
  BookOpen,
  LogOut as LogOutIcon,
  Search,
  Activity,
  Settings,
  AlertTriangle
} from 'lucide-react';
import Modal from '../components/Modal';
import { ToastContext } from '../App';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import QrCard from '../components/QrCard';
import ProfileMedicalHistory from '../components/ProfileMedicalHistory';
import RoleStatsPanel from '../components/RoleStatsPanel';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', sede: '', cuatrimestre: '' });
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [dbSedes, setDbSedes] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    fetchUser();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [sedes, cuats] = await Promise.all([getSedes(), getCuatrimestres()]);
      setDbSedes(sedes || []);
      setDbCuatrimestres(cuats || []);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchUser = async () => {
    try {
      const sessionUser = await getCurrentUser();
      if (sessionUser && sessionUser.id) {
        const dbUser = await getUserById(sessionUser.id);
        if (dbUser) {
          const syncedUser = { ...dbUser, baseRole: dbUser.role };
          setUser(syncedUser);
          setFormData({
            nombre: dbUser.nombre || '',
            email: dbUser.email || '',
            sede: dbUser.sede || '',
            cuatrimestre: dbUser.cuatrimestre || ''
          });
          setPhotoPreview(dbUser.foto || null);

          // Update session to keep it synced
          localStorage.setItem('monitores_current_role', JSON.stringify(syncedUser));
          window.dispatchEvent(new Event('profile-updated'));
          return;
        }
      }
      if (sessionUser) {
        setUser(sessionUser);
        setFormData({
          nombre: sessionUser.nombre || '',
          email: sessionUser.email || '',
          sede: sessionUser.sede || '',
          cuatrimestre: sessionUser.cuatrimestre || ''
        });
        setPhotoPreview(sessionUser.foto || null);
      }
    } catch (error) {
      console.error("Error fetching user from DB:", error);
    }
  };

  const getRoleTheme = (role) => {
    // Standardizing all roles to professional brand-blue as requested
    return {
      bg: 'bg-blue-50',
      text: 'text-brand-blue',
      border: 'border-brand-blue/10'
    };
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size (max 2MB)
    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no debe pesar más de 2MB.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const { url } = await uploadImage(file);
      setPhotoPreview(url);

      // Save to user record
      await updateUser(user.id, { foto: url });

      // Update session user
      const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      const updatedSession = { ...currentSession, foto: url };
      localStorage.setItem('monitores_current_role', JSON.stringify(updatedSession));
      setUser(updatedSession);

      showToast('¡Foto de perfil actualizada!', 'success');
      window.dispatchEvent(new Event('profile-updated'));
    } catch (error) {
      showToast('Error al subir la imagen.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setPhotoPreview(null);
    await updateUser(user.id, { foto: null });
    const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    const updatedSession = { ...currentSession };
    delete updatedSession.foto; // Remove foto property
    localStorage.setItem('monitores_current_role', JSON.stringify(updatedSession));
    setUser(updatedSession);
    showToast('¡Foto de perfil eliminada!', 'success');
    window.dispatchEvent(new Event('profile-updated'));
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
    const restrictions = typeof currentSession?.restrictions === 'string' 
      ? JSON.parse(currentSession.restrictions) 
      : (currentSession?.restrictions || {});

    if (restrictions.management && currentSession?.baseRole !== 'dev' && currentSession?.role !== 'dev' && !currentSession?.is_principal) {
      showToast('Tu capacidad de modificar datos ha sido restringida.', 'error');
      return;
    }
    await updateUser(user.id, formData);
    // Also update session
    const updatedSession = { ...currentSession, ...formData };
    localStorage.setItem('monitores_current_role', JSON.stringify(updatedSession));
    setUser(updatedSession);
    fetchUser();
    showToast('¡Información actualizada correctamente!', 'success');
    // Notify Navbar and other components
    window.dispatchEvent(new Event('profile-updated'));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.new) {
      showToast('Ingresa la nueva contraseña.', 'error');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showToast('Las contraseñas no coinciden.', 'error');
      return;
    }
    await updateUser(user.id, { password: passwords.new });
    setPasswords({ old: '', new: '', confirm: '' });
    showToast('¡Contraseña actualizada con éxito!', 'success');
  };

  const handleDeleteAccount = async () => {
    await deleteUser(user.id);
    await logout();
    navigate('/');
    window.location.reload();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-brand-blue font-bold transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>

        {/* Account Status / Restrictions Alert - ONLY show if there are active restrictions */}
        {(() => {
          const restrictions = typeof user.restrictions === 'string' 
            ? JSON.parse(user.restrictions) 
            : (user.restrictions || {});
          
          const activeRestrictions = Object.entries(restrictions).filter(([_, v]) => v);
          
          if (activeRestrictions.length === 0 && user.is_active !== 0 && user.is_active !== false) return null;

          const isBlocked = user.is_active === 0 || user.is_active === false || restrictions.login;
          const statusColor = isBlocked ? 'red' : 'amber';

          return (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border-2 border-${statusColor}-100 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-${statusColor}-500/5 relative overflow-hidden group`}
            >
              <div className={`absolute top-0 right-0 p-8 text-${statusColor}-100/20 rotate-12 group-hover:scale-110 transition-transform`}>
                <AlertTriangle size={120} />
              </div>
              
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${statusColor}-100 text-${statusColor}-600 rounded-xl`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Estado de tu Cuenta</h2>
                    <p className={`text-sm font-bold text-${statusColor}-500 uppercase tracking-widest`}>
                      {isBlocked ? 'Acceso al Sistema Bloqueado' : 'Restricciones de Acceso Activas'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {restrictions.login && (
                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                      <LogOutIcon size={18} className="text-red-600" />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Login Bloqueado</span>
                    </div>
                  )}
                  {restrictions.search && (
                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                      <Search size={18} className="text-red-600" />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Búsqueda Restringida</span>
                    </div>
                  )}
                  {restrictions.dashboards && (
                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                      <Activity size={18} className="text-red-600" />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Paneles Bloqueados</span>
                    </div>
                  )}
                  {restrictions.registrations && (
                    <div className={`bg-${statusColor}-50/50 p-4 rounded-2xl border border-${statusColor}-100 flex items-center gap-3`}>
                      <BookOpen size={18} className={`text-${statusColor}-600`} />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Monitorías Restringidas</span>
                    </div>
                  )}
                  {(user.is_active === 0 || user.is_active === false) && !restrictions.login && (
                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                      <Lock size={18} className="text-red-600" />
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Cuenta Suspendida</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400 font-medium italic">
                  * Si crees que esto es un error, por favor contacta con el administrador principal de tu sede.
                </p>
              </div>
            </motion.div>
          );
        })()}

        {/* Profile Header */}
        <header className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100">

          {/* Photo Management Area */}
          <div className="relative shrink-0">

            <UserAvatar
              user={user}
              size="xl"
              className="ring-8 ring-white"
              key={user.foto || 'no-photo'}
            />

            {/* Overlay Buttons */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between items-end p-0 pointer-events-none translate-y-3 px-3">

              {/* Trash - Left */}
              {user?.foto ? (
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleDeletePhoto}
                  title="Eliminar foto"
                  className="pointer-events-auto p-2.5 bg-white text-red-500 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 flex items-center justify-center ring-4 ring-red-500/5 -translate-x-3"
                >
                  <Trash2 size={18} />
                </motion.button>
              ) : <div />}

              {/* Camera - Right */}
              <div className="relative pointer-events-auto translate-x-3">

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  title="Cambiar foto"
                  className="relative p-2.5 bg-white text-brand-blue rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 flex items-center justify-center ring-4 ring-brand-blue/5 overflow-hidden"
                >
                  <Camera size={18} />

                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handlePhotoChange}
                    accept="image/*"
                  />
                </motion.button>

              </div>

            </div>
          </div>

          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.nombre}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 items-center">
              <span className="text-gray-400 font-medium text-sm">{user.email || 'Sin correo configurado'}</span>
              <span className={`text-[10px] bg-brand-blue/5 text-brand-blue px-3 py-1 rounded-full border border-brand-blue/10 flex items-center gap-1.5 font-bold`}>
                <ShieldCheck size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">{user.role} Institucional</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Usa los botones <Camera size={11} className="inline text-brand-blue" /> y <Trash2 size={11} className="inline text-red-500" /> para gestionar tu foto · Máx. 2MB
            </p>
          </div>
        </header>

        <QrCard />
        <RoleStatsPanel />
        <ProfileMedicalHistory />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <User className="text-brand-blue" /> Datos Personales
              {user.role !== 'admin' && user.role !== 'dev' && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 flex items-center gap-1 font-bold">
                  <Lock size={10} /> Solo Lectura
                </span>
              )}
            </h2>
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <InputField 
                label="Nombre Completo" 
                icon={<User />} 
                value={formData.nombre} 
                onChange={e => (user.role === 'admin' || user.role === 'dev') && setFormData({ ...formData, nombre: e.target.value })} 
                placeholder="Tu nombre completo"
              />
              <InputField 
                label="Email Institucional" 
                icon={<Mail />} 
                type="email" 
                value={formData.email} 
                onChange={e => (user.role === 'admin' || user.role === 'dev') && setFormData({ ...formData, email: e.target.value })} 
                placeholder="tu@u.edu"
              />

              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Sede" 
                  icon={<MapPin />} 
                  type="select" 
                  value={formData.sede} 
                  onChange={e => (user.role === 'admin' || user.role === 'dev') && setFormData({ ...formData, sede: e.target.value })} 
                  options={["Seleccionar Sede", ...dbSedes]}
                />
                <InputField 
                  label="Ciclo/Cuatrimestre" 
                  icon={<BookOpen />} 
                  type="select" 
                  value={formData.cuatrimestre} 
                  onChange={e => (user.role === 'admin' || user.role === 'dev') && setFormData({ ...formData, cuatrimestre: e.target.value })} 
                  options={["Seleccionar Cuatrimestre", ...dbCuatrimestres]}
                />
              </div>

              {(user.role === 'admin' || user.role === 'dev') && (
                <button type="submit" className="w-full py-4 bg-brand-blue hover:bg-brand-dark-blue text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                  <Save size={18} /> Guardar Cambios
                </button>
              )}
            </form>
          </section>

          {/* Security */}
          <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <Lock className="text-brand-blue" /> Seguridad
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <InputField 
                label="Contraseña Actual" 
                icon={<Lock />} 
                type="password" 
                value={passwords.old} 
                onChange={e => setPasswords({ ...passwords, old: e.target.value })} 
                placeholder="••••••••"
              />
              <InputField 
                label="Nueva Contraseña" 
                icon={<Lock />} 
                type="password" 
                value={passwords.new} 
                onChange={e => setPasswords({ ...passwords, new: e.target.value })} 
                placeholder="••••••••"
              />
              <InputField 
                label="Confirmar Contraseña" 
                icon={<Lock />} 
                type="password" 
                value={passwords.confirm} 
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} 
                placeholder="••••••••"
              />
              <button type="submit" className="w-full py-4 bg-gray-50 text-gray-900 border-2 border-gray-100 font-black rounded-2xl hover:bg-gray-100 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                <Check size={18} /> Actualizar Contraseña
              </button>
            </form>
          </section>
        </div>

        {/* Account Deletion Area - Available to all to manage their own account */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl font-black text-red-600">Zona de Peligro</h2>
            <p className="text-sm text-gray-400 font-medium">Una vez eliminada la cuenta, no hay vuelta atrás. Tus datos serán borrados permanentemente.</p>
          </div>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="shrink-0 px-6 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <Trash2 size={18} /> Eliminar Mi Cuenta
          </button>
        </section>
      </div>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="¿Confirmar Eliminación?">
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-[32px] inline-block text-red-600 animate-pulse">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-3">
            <p className="text-xl font-black text-gray-900 leading-tight">Estás por borrar tu cuenta</p>
            <p className="text-gray-400 font-medium text-sm px-4">Esta acción no se puede deshacer. Se perderán todos tus registros de monitorías y asistencia.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDeleteAccount}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
            >
              Sí, eliminar permanentemente
            </button>
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="w-full py-4 bg-gray-50 text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
