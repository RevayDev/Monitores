import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Bell } from 'lucide-react';

const Toaster = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={16} />,
    error: <AlertCircle className="text-red-500" size={16} />,
    info: <Info className="text-brand-blue" size={16} />,
    notification: <Bell className="text-violet-500" size={16} />
  };

  const colors = {
    success: 'border-emerald-100 bg-white/95 shadow-emerald-500/5',
    error: 'border-red-100 bg-white/95 shadow-red-500/5',
    info: 'border-blue-100 bg-white/95 shadow-blue-500/5',
    notification: 'border-violet-100 bg-white/95 shadow-violet-500/5'
  };

  const isObjectMessage = typeof message === 'object' && message !== null;
  const title = isObjectMessage ? message.title : (type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Aviso');
  const body = isObjectMessage ? message.body : message;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`fixed top-24 right-4 left-4 sm:top-4 sm:left-auto z-[9999] flex items-start gap-2.5 p-3 rounded-xl border shadow-lg backdrop-blur-md sm:min-w-[280px] sm:max-w-sm ${colors[type] || colors.info}`}
    >
      <div className="mt-0.5 shrink-0">
        {icons[type] || icons.info}
      </div>

      <div className="flex-grow space-y-0.5">
        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{title}</h4>
        <p className="text-xs font-bold text-gray-500 leading-snug">{body}</p>
      </div>

      <button
        onClick={onClose}
        className="shrink-0 p-0.5 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded transition-all active:scale-95"
      >
        <X size={14} />
      </button>

      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 rounded-full ${type === 'success' ? 'bg-emerald-400' :
          type === 'error' ? 'bg-red-400' :
            type === 'notification' ? 'bg-violet-400' : 'bg-brand-blue'
          }`}
      />
    </motion.div>
  );
};

export default Toaster;
