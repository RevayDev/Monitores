import React, { useState } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InputField = ({ 
  label, 
  icon, 
  type = "text", 
  placeholder = "", 
  value, 
  onChange, 
  options = [], 
  required = true, 
  disabled = false,
  error = "",
  className = "",
  role = "student"
}) => {
  const getRoleColorClass = (r) => {
    switch (r?.toLowerCase()) {
      case 'dev': return {
        text: 'text-purple-600',
        border: 'border-purple-600',
        ring: 'ring-purple-600/10',
        shadow: 'shadow-purple-600/5',
        themeVar: 'var(--color-dev)',
        glow: 'from-purple-600/20 via-purple-600/5 to-purple-600/20'
      };
      case 'admin': return {
        text: 'text-indigo-600',
        border: 'border-indigo-600',
        ring: 'ring-indigo-600/10',
        shadow: 'shadow-indigo-600/5',
        themeVar: 'var(--color-admin)',
        glow: 'from-indigo-600/20 via-indigo-600/5 to-indigo-600/20'
      };
      case 'monitor':
      case 'monitor_academico': return {
        text: 'text-emerald-600',
        border: 'border-emerald-600',
        ring: 'ring-emerald-600/10',
        shadow: 'shadow-emerald-600/5',
        themeVar: 'var(--color-monitor)',
        glow: 'from-emerald-600/20 via-emerald-600/5 to-emerald-600/20'
      };
      default: return {
        text: 'text-brand-blue',
        border: 'border-brand-blue',
        ring: 'ring-brand-blue/10',
        shadow: 'shadow-brand-blue/5',
        themeVar: 'var(--color-student)',
        glow: 'from-brand-blue/20 via-brand-blue/5 to-brand-blue/20'
      };
    }
  };
  const roleColor = getRoleColorClass(role);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
 
  const containerVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
  };
 
  const labelVariants = {
    unfocused: { scale: 1, color: "var(--color-slate-500)" },
    focused: { scale: 1, color: roleColor.themeVar }
  };
 
  const inputBaseClasses = `
    w-full rounded-2xl text-base font-semibold transition-all duration-300 outline-none border
    ${disabled 
      ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100 opacity-80" 
      : "bg-white border-slate-200 text-slate-900 hover:border-slate-300"}
    ${error ? "border-rose-400" : "border-slate-200"}
    ${isFocused && !error ? `${roleColor.border}` : ""}
    ${icon ? 'pl-12' : 'pl-4'}
  `;
 
  return (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={`space-y-1.5 text-left group w-full ${className}`}
    >
      {label && (
        <motion.label 
          animate={isFocused ? "focused" : "unfocused"}
          variants={labelVariants}
          className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-2 block pointer-events-none"
        >
          {label}
        </motion.label>
      )}
      
      <div className="relative group/field">
        {icon && (
          <div className={`
            absolute inset-y-0 left-0 pl-4 flex items-center transition-all duration-300 z-10 pointer-events-none
            ${isFocused ? `${roleColor.text}` : "text-slate-400"}
          `}>
            {React.cloneElement(icon, { size: 18, strokeWidth: isFocused ? 2.5 : 2 })}
          </div>
        )}
        
        {type === 'select' ? (
          <div className="relative">
            <select
              required={required}
              disabled={disabled}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`${inputBaseClasses} pr-10 py-4 appearance-none cursor-pointer`}
              value={value}
              onChange={onChange}
            >
              <option value="" disabled className="text-slate-400 italic">Seleccionar...</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value !== undefined ? opt.value : opt} className="font-semibold text-slate-900 py-2">
                  {opt.label || opt}
                </option>
              ))}
            </select>
            <div className={`absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors duration-300 ${isFocused ? roleColor.text : 'text-slate-400'}`}>
              <ChevronDown size={18} strokeWidth={3} />
            </div>
          </div>
        ) : type === 'textarea' ? (
          <textarea
            required={required}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`${inputBaseClasses} pr-4 py-4 h-32 resize-none placeholder-slate-300`}
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`${inputBaseClasses} ${isPassword ? 'pr-12' : 'pr-4'} py-4 placeholder-slate-300`}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
            />
            
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-blue transition-all duration-300 z-10 focus:outline-none"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </motion.div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] font-black text-rose-500 uppercase tracking-wider ml-3 mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InputField;

