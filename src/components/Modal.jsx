import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] relative z-10 overflow-hidden animate-scale-in border border-white/20 flex flex-col">
        <div className="px-10 py-8 flex justify-between items-center bg-gray-50/50 border-b border-gray-100 shrink-0">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
            <div className="h-1 w-12 bg-brand-blue rounded-full"></div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white text-gray-400 hover:text-gray-900 rounded-2xl transition-all active:scale-90 shadow-sm border border-transparent hover:border-gray-100"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-10 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
