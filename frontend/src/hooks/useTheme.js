import { useState, useEffect } from 'react';

const KEY = 'pso-theme';

// Tema dark (default) / light. Aplica data-theme en <html> y persiste en localStorage.
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, setTheme, toggle };
}
