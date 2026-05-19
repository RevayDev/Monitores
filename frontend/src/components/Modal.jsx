import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', role = 'student' }) => {
  const getRoleColor = (r) => {
    switch (r?.toLowerCase()) {
      case 'dev': return 'bg-purple-600';
      case 'admin': return 'bg-indigo-600';
      case 'monitor':
      case 'monitor_academico': return 'bg-emerald-600';
      default: return 'bg-brand-blue';
    }
  };
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const backdropVariants = {
    hidden: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
    visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 15, 
      scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', damping: 25, stiffness: 350 }
    },
    exit: { 
      opacity: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.9 : 0, 
      y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 15, 
      scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.95,
      transition: { duration: 0.18, ease: 'easeInOut' }
    }
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (window.confirm('¿Estás seguro de que deseas cerrar esta ventana?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8">
          {/* Backdrop */}
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-[6px] z-0" 
            onClick={handleClose}
          />
          
          {/* Modal Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            className={`bg-white rounded-t-[24px] sm:rounded-[32px] w-full ${maxWidth} relative z-10 overflow-hidden border border-white/40 flex flex-col max-h-[92vh] sm:max-h-[90vh]`}
          >
            {title && (
              <div className="px-5 py-4 sm:px-8 sm:py-6 flex justify-between items-center bg-white border-b border-slate-50 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">{title}</h3>
                  <div className={`h-1 w-10 sm:h-1.5 sm:w-12 ${getRoleColor(role)} rounded-full`}></div>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-1.5 sm:p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all active:scale-90 border border-transparent hover:border-slate-100"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-5 sm:p-8">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
