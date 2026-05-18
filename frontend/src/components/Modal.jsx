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
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 400 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2 }
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Backdrop */}
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[8px] z-0" 
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            className={`bg-white rounded-[32px] shadow-[0_32px_120px_rgba(0,0,0,0.3)] w-full ${maxWidth} relative z-10 overflow-hidden border border-white/40 flex flex-col max-h-[90vh]`}
          >
            {title && (
              <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-50 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">{title}</h3>
                  <div className={`h-1.5 w-12 ${getRoleColor(role)} rounded-full shadow-sm`}></div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all active:scale-90 border border-transparent hover:border-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-8">
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
