import React from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'monitores_beta_banner_closed';

const BetaBanner = () => {
  const [visible, setVisible] = React.useState(() => localStorage.getItem(STORAGE_KEY) !== '1');

  if (!visible) return null;

  const closeBanner = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="bg-brand-blue relative border-b border-blue-700 text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-center px-4 sm:px-6 py-3 sm:py-3.5">

        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-center pr-10">
          Proyecto en crecimiento · Versión Beta
        </p>

        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={closeBanner}
          className="absolute right-4 sm:right-6 inline-flex items-center justify-center rounded-lg border border-white/20 w-8 h-8 hover:bg-white/10 active:scale-95 transition-all duration-200"
        >
          <X size={15} />
        </button>

      </div>
    </div>
  );
};

export default BetaBanner;
