import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser, updateUser, deleteUser, logout } from '../services/api';
import { useNavigate } from 'react-router-dom';
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
  Check
} from 'lucide-react';
import Modal from '../components/Modal';
import { ToastContext } from '../App';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '' });
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const data = await getCurrentUser();
    if (data) {
      setUser(data);
      setFormData({ nombre: data.nombre || '', email: data.email || '' });
      setPhotoPreview(data.foto || null);
    }
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
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setPhotoPreview(base64);
      // Save to user record
      await updateUser(user.id, { foto: base64 });
      // Update session user too
      const users = JSON.parse(localStorage.getItem('monitores_users') || '[]');
      const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
      const updatedSession = { ...currentSession, foto: base64 };
      localStorage.setItem('monitores_current_role', JSON.stringify(updatedSession));
      setUser(updatedSession);
      setUploadingPhoto(false);
      showToast('¡Foto de perfil actualizada!', 'success');
      // Notify other components (e.g. Navbar) that the profile was updated
      window.dispatchEvent(new Event('profile-updated'));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    await updateUser(user.id, formData);
    // Also update session
    const currentSession = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
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
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver
        </button>

        {/* Profile Header */}
        <header className="flex flex-col sm:flex-row gap-6 items-center bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100">
          {/* Photo */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[32px] bg-brand-blue text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-brand-blue/30 overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                user.nombre?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Cambiar foto de perfil"
              className="absolute -bottom-2 -right-2 p-2.5 bg-white text-brand-blue rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={18} />
              )}
            </button>
          </div>

          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">{user.nombre || 'Tu Perfil'}</h1>
            <p className="text-gray-400 font-medium text-sm">{user.email}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/5 text-brand-blue rounded-full">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{user.role} Institucional</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Toca el ícono <Camera size={11} className="inline" /> para cambiar tu foto · Máx. 2MB
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <User className="text-brand-blue" /> Datos Personales
            </h2>
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Institucional</label>
                <input
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-lg hover:bg-brand-dark-blue active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                <Save size={18} /> Guardar Cambios
              </button>
            </form>
          </section>

          {/* Security */}
          <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <Lock className="text-brand-blue" /> Seguridad
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                <input
                  type="password"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm"
                  placeholder="••••••••"
                  value={passwords.old}
                  onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                <input
                  type="password"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm"
                  placeholder="••••••••"
                  value={passwords.new}
                  onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-black font-bold transition-all text-sm"
                  placeholder="••••••••"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-gray-50 text-gray-900 border-2 border-gray-100 font-black rounded-2xl hover:bg-gray-100 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                <Check size={18} /> Actualizar Contraseña
              </button>
            </form>
          </section>
        </div>

        {/* Account Deletion */}
        <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl font-black text-red-600">Zona de Peligro</h2>
            <p className="text-sm text-gray-400 font-medium">Una vez eliminada la cuenta, no hay vuelta atrás. Tus datos serán borrados permanentemente.</p>
          </div>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="shrink-0 px-6 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <Trash2 size={18} /> Eliminar Cuenta
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
