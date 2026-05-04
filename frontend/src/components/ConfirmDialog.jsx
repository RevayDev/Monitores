import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Confirmar Registro?', 
  description = 'Esta acción es permanente y no se puede deshacer.', 
  confirmText = 'SÍ, REGISTRARME AHORA', 
  cancelText = 'Cancelar',
  requirePassword = false,
  passwordValue = '',
  onPasswordChange = () => {},
  type = 'warning' 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop for premium feel */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />

        {/* Dialog Card - Matching Image 3 aesthetics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative bg-white w-full max-w-lg rounded-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden"
        >
          {/* Top border indicator style */}
          <div className="h-1.5 w-full bg-slate-100 relative">
             <div className="absolute left-10 top-0 h-full w-16 bg-[#1e40af]"></div>
          </div>

          {/* Close button */}
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-all hover:bg-slate-50 rounded-full">
            <X size={20} />
          </button>

          <div className="p-8 sm:p-12 space-y-10">
            {/* Header section */}
            <h3 className="text-xl font-black text-slate-900 tracking-tight text-left border-l-4 border-[#1e40af] pl-4">
               {title}
            </h3>

            {/* Message Box with yellow warning icon - Image 3 style */}
            <div className="bg-amber-50/40 rounded-[28px] p-10 border border-amber-100/50 flex flex-col items-center gap-6 text-center shadow-inner">
               <div className="bg-white p-4 rounded-full shadow-sm text-amber-500 border border-amber-100">
                  <AlertTriangle size={48} strokeWidth={2.5} />
               </div>
               
               <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                    {description}
                  </p>
               </div>
            </div>

            {/* Password verification logic remains available but matching style */}
            {requirePassword && (
              <div className="space-y-3 animate-fade-in px-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 flex items-center gap-2">
                  <ShieldCheck size={12} /> Validación de Seguridad
                </label>
                <input 
                  type="password"
                  autoFocus
                  value={passwordValue}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Tu contraseña aquí..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 focus:border-[#1e40af] outline-none transition-all shadow-sm"
                />
              </div>
            )}

            {/* Actions area - Institutional Blue as requested */}
            <div className="flex flex-col items-center gap-4">
               <button 
                  onClick={onConfirm}
                  disabled={requirePassword && !passwordValue}
                  className="w-full py-5 bg-[#1e40af] text-white font-black rounded-2xl shadow-[0_15px_30px_-5px_rgba(30,64,175,0.4)] hover:bg-[#1e3a8a] active:scale-[0.98] transition-all text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
               >
                  {confirmText}
               </button>
               
               <button 
                  onClick={onClose}
                  className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors py-2"
               >
                  {cancelText}
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
