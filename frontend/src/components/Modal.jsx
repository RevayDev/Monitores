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
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 16 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
    },
    exit: { 
      opacity: 0, 
      scale: 0.98, 
      y: 8,
      transition: { duration: 0.1, ease: 'easeIn' }
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
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            className={`bg-white rounded-t-[24px] sm:rounded-[32px] shadow-[0_32px_100px_rgba(0,0,0,0.25)] w-full ${maxWidth} relative z-10 overflow-hidden border border-white/40 flex flex-col max-h-[92vh] sm:max-h-[90vh]`}
          >
            {title && (
              <div className="px-5 py-4 sm:px-8 sm:py-6 flex justify-between items-center bg-white border-b border-slate-50 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">{title}</h3>
                  <div className={`h-1 w-10 sm:h-1.5 sm:w-12 ${getRoleColor(role)} rounded-full shadow-sm`}></div>
                </div>
                <button 
                  onClick={onClose}
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
