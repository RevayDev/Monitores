import React from 'react';

const InputField = ({ label, icon, type = "text", placeholder = "", value, onChange, options = [] }) => (
  <div className="space-y-2 text-left group">
    {label && (
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-brand-blue">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-300 pointer-events-none group-focus-within:text-brand-blue transition-colors">
          {React.cloneElement(icon, { size: 20 })}
        </div>
      )}
      
      {type === 'select' ? (
        <select
          required
          className={`w-full ${icon ? 'pl-14' : 'pl-4'} pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 focus:ring-8 focus:ring-brand-blue/5 outline-none text-gray-900 font-bold transition-all text-sm shadow-inner appearance-none`}
          value={value}
          onChange={onChange}
        >
          {options.map((opt, i) => (
            <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          required
          className={`w-full h-32 ${icon ? 'pl-14' : 'pl-4'} pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 focus:ring-8 focus:ring-brand-blue/5 outline-none text-gray-900 font-bold transition-all text-sm placeholder-gray-300 shadow-inner resize-none`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      ) : (
        <input
          type={type}
          required={type !== "password" && type !== "file"}
          className={`w-full ${icon ? 'pl-14' : 'pl-4'} pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue/20 focus:ring-8 focus:ring-brand-blue/5 outline-none text-gray-900 font-bold transition-all text-sm placeholder-gray-300 shadow-inner`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  </div>
);

export default InputField;
