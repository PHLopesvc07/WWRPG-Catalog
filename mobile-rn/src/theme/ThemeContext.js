import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES } from './colors';
import { rnPersistentStorageAdapter } from '../services/nativeCacheAdapter';

const THEME_CACHE_KEY = 'wwrpg-theme';

const ThemeContext = createContext({
  theme: THEMES.light,
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {}
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    rnPersistentStorageAdapter.getItem(THEME_CACHE_KEY).then(savedMode => {
      if (savedMode && THEMES[savedMode]) {
        setMode(savedMode);
      }
    });
  }, []);

  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'terminal' : 'light';
      rnPersistentStorageAdapter.setItem(THEME_CACHE_KEY, next);
      return next;
    });
  };

  const theme = THEMES[mode] || THEMES.light;

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
