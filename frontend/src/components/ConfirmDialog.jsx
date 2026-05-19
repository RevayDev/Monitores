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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop for premium feel */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-0"
          />

          {/* Dialog Card - Matching Image 3 aesthetics */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="relative bg-white w-full max-w-lg rounded-t-[24px] sm:rounded-[32px] shadow-[0_32px_100px_rgba(0,0,0,0.25)] overflow-hidden z-10 border border-white/40 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
          >
            {/* Top border indicator style */}
            <div className="h-1 w-full bg-slate-100 relative shrink-0">
               <div className="absolute left-6 sm:left-10 top-0 h-full w-12 sm:w-16 bg-[#1e40af]"></div>
            </div>

            {/* Close button */}
            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 text-slate-300 hover:text-slate-500 transition-all hover:bg-slate-50 rounded-full z-20">
              <X size={18} />
            </button>

            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto">
              {/* Header section */}
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight text-left border-l-4 border-[#1e40af] pl-3 sm:pl-4">
                 {title}
              </h3>

              {/* Message Box with yellow warning icon - Image 3 style */}
              <div className="bg-amber-50/40 rounded-[20px] sm:rounded-[28px] p-6 sm:p-8 border border-amber-100/50 flex flex-col items-center gap-4 sm:gap-6 text-center shadow-inner">
                 <div className="bg-white p-3 sm:p-4 rounded-full shadow-sm text-amber-500 border border-amber-100">
                    <AlertTriangle size={36} className="sm:w-12 sm:h-12" strokeWidth={2.5} />
                 </div>
                 
                 <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                      {description}
                    </p>
                 </div>
              </div>

              {/* Password verification logic remains available but matching style */}
              {requirePassword && (
                <div className="space-y-2 animate-fade-in px-2">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest px-1 flex items-center gap-1.5">
                    <ShieldCheck size={11} className="sm:w-3 sm:h-3" /> Validación de Seguridad
                  </label>
                  <input 
                    type="password"
                    autoFocus
                    value={passwordValue}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="Tu contraseña aquí..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-slate-900 focus:border-[#1e40af] outline-none transition-all shadow-sm"
                  />
                </div>
              )}

              {/* Actions area - Institutional Blue as requested */}
              <div className="flex flex-col items-center gap-3 sm:gap-4 shrink-0">
                 <button 
                    onClick={onConfirm}
                    disabled={requirePassword && !passwordValue}
                    className="w-full py-4 bg-[#1e40af] text-white font-black rounded-xl sm:rounded-2xl shadow-[0_12px_24px_-5px_rgba(30,64,175,0.35)] hover:bg-[#1e3a8a] active:scale-[0.98] transition-all text-xs sm:text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
                 >
                    {confirmText}
                 </button>
                 
                 <button 
                    onClick={onClose}
                    className="text-[10px] sm:text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors py-1.5 sm:py-2"
                 >
                    {cancelText}
                 </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
