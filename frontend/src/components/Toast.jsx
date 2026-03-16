import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={18} />,
    error: <AlertCircle className="text-red-500" size={18} />,
    info: <Info className="text-brand-blue" size={18} />
  };

  const colors = {
    success: 'border-green-100 bg-green-50/80',
    error: 'border-red-100 bg-red-50/80',
    info: 'border-blue-100 bg-blue-50/80'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl backdrop-blur-md ${colors[type]}`}
    >
      {icons[type]}
      <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{message}</p>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default Toast;
