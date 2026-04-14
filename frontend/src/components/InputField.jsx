import React, { useState } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const InputField = ({ label, icon, type = "text", placeholder = "", value, onChange, options = [], required = true, disabled = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const disabledClasses = disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100 opacity-80" : "bg-white border-slate-200 text-slate-900";

  return (
    <div className="space-y-2 text-left group">
      {label && (
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1 transition-colors group-focus-within:text-brand-blue">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-brand-blue/60 group-hover:text-brand-blue/80 pointer-events-none group-focus-within:text-brand-blue transition-colors z-10">
            {React.cloneElement(icon, { size: 18, strokeWidth: 2.5 })}
          </div>
        )}
        
        {type === 'select' ? (
          <div className="relative">
            <select
              required={required}
              disabled={disabled}
              className={`w-full appearance-none ${icon ? 'pl-14' : 'pl-5'} pr-12 py-4 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none font-bold transition-all text-sm shadow-sm ${disabledClasses}`}
              value={value}
              onChange={onChange}
            >
                <option value="" disabled>Seleccionar...</option>
                {options.map((opt, i) => (
                  <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-slate-400">
              <ChevronDown size={18} strokeWidth={3} />
            </div>
          </div>
        ) : type === 'textarea' ? (
          <textarea
            required={required}
            disabled={disabled}
            className={`w-full h-32 ${icon ? 'pl-14' : 'pl-4'} pr-6 py-4 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none font-semibold transition-all text-sm placeholder-slate-300 shadow-sm resize-none ${disabledClasses}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
          />
        ) : (
          <div className="relative">
            <input
              type={inputType}
              required={required && type !== "password" && type !== "file"}
              disabled={disabled}
              className={`w-full ${icon ? 'pl-14' : 'pl-5'} ${isPassword ? 'pr-14' : 'pr-6'} py-4 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none font-bold transition-all text-sm placeholder-slate-300 shadow-sm ${disabledClasses}`}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-brand-blue transition-colors focus:outline-none z-10"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputField;
