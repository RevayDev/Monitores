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
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-brand-blue" size={20} />,
    notification: <Bell className="text-violet-500" size={20} />
  };

  const colors = {
    success: 'border-emerald-100 bg-white/90 shadow-emerald-500/10',
    error: 'border-red-100 bg-white/90 shadow-red-500/10',
    info: 'border-blue-100 bg-white/90 shadow-blue-500/10',
    notification: 'border-violet-100 bg-white/90 shadow-violet-500/10'
  };

  const isObjectMessage = typeof message === 'object' && message !== null;
  const title = isObjectMessage ? message.title : (type === 'success' ? 'Exito' : type === 'error' ? 'Error' : 'Aviso');
  const body = isObjectMessage ? message.body : message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`fixed bottom-6 right-6 z-[200] flex items-start gap-4 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl min-w-[320px] max-w-md ${colors[type] || colors.info}`}
    >
      <div className="mt-0.5 shrink-0">
        {icons[type] || icons.info}
      </div>
      
      <div className="flex-grow space-y-1">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">{title}</h4>
        <p className="text-[13px] font-bold text-gray-500 leading-snug">{body}</p>
      </div>

      <button 
        onClick={onClose} 
        className="shrink-0 p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-all active:scale-90"
      >
        <X size={16} />
      </button>

      <motion.div 
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 rounded-full ${
          type === 'success' ? 'bg-emerald-400' : 
          type === 'error' ? 'bg-red-400' : 
          type === 'notification' ? 'bg-violet-400' : 'bg-brand-blue'
        }`}
      />
    </motion.div>
  );
};

export default Toaster;
