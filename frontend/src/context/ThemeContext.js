import React, { createContext, useState, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

export const ThemeContext = createContext({
  toggleTheme: () => {},
});

export const ThemeContextProvider = ({ children }) => {
  const [mode, setMode] = useState('light'); // 'light' ou 'dark'

  const themeAPI = useMemo(
    () => ({
      toggleTheme: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={themeAPI}>
      {/* On passe le thème et le mode au provider MUI */}
      {React.cloneElement(children, { theme: theme, mode: mode })}
    </ThemeContext.Provider>
  );
};