import React, { createContext, useState, useMemo, useContext } from 'react';

// Création du contexte qui exposera le mode et la fonction pour le changer
const ThemeModeContext = createContext({
  toggleTheme: () => {},
  mode: 'light',
});

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');

  const themeModeAPI = useMemo(
    () => ({
      toggleTheme: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={themeModeAPI}>
      {children}
    </ThemeModeContext.Provider>
  );
};

// Hook personnalisé pour accéder facilement au contexte
export const useThemeMode = () => {
  return useContext(ThemeModeContext);
};