import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, setSearchTerm, placeholder = "Buscar...", className = "" }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-blue transition-colors">
      <Search size={18} />
    </div>
    <input
      type="text"
      placeholder={placeholder}
      className="block w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none text-gray-900 font-bold transition-all text-sm group"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
);

export default SearchBar;
