import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, setSearchTerm, placeholder = "Buscar...", className = "" }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-blue/60 group-hover:text-brand-blue/80 transition-colors z-10">
      <Search size={18} strokeWidth={2.5} />
    </div>
    <input
      type="text"
      placeholder={placeholder}
      className="block w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl outline-none text-slate-900 font-semibold transition-all text-sm shadow-sm group"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
);

export default SearchBar;
