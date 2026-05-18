import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'student',
  setTheme: () => {},
  role: 'student',
});

const roleToTheme = (role) => {
  if (!role) return 'student';
  const r = role.toLowerCase();
  if (r.includes('dev')) return 'dev';
  if (r.includes('admin')) return 'admin';
  if (r.includes('monitor')) return 'monitor';
  return 'student';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const raw = localStorage.getItem('monitores_current_role');
      const session = JSON.parse(raw || '{}');
      return roleToTheme(session.role || session.baseRole);
    } catch {
      return 'student';
    }
  });

  const applyTheme = useCallback((themeName) => {
    document.documentElement.dataset.theme = themeName;
  }, []);

  const setTheme = useCallback((themeOrRole) => {
    // Accept either a theme name or a role name
    const resolved = ['admin', 'monitor', 'dev', 'student'].includes(themeOrRole)
      ? themeOrRole
      : roleToTheme(themeOrRole);
    setThemeState(resolved);
    applyTheme(resolved);
  }, [applyTheme]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for auth/role changes
  useEffect(() => {
    const syncTheme = () => {
      try {
        const raw = localStorage.getItem('monitores_current_role');
        const session = JSON.parse(raw || '{}');
        const newTheme = roleToTheme(session.role || session.baseRole);
        setThemeState(newTheme);
        applyTheme(newTheme);
      } catch {
        // no-op
      }
    };
    window.addEventListener('profile-updated', syncTheme);
    window.addEventListener('data-updated', syncTheme);
    return () => {
      window.removeEventListener('profile-updated', syncTheme);
      window.removeEventListener('data-updated', syncTheme);
    };
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, role: theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { ThemeContext, roleToTheme };
export default ThemeContext;
