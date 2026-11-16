import React, { createContext, useContext, useState } from 'react';
import { THEMES } from './colors';

const ThemeContext = createContext({
  theme: THEMES.light,
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {}
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  const toggleTheme = () => {
    setMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'terminal';
      return 'light';
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
