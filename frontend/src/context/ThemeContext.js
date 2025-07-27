import React, { createContext, useState, useMemo, useContext } from 'react';

// Création du contexte
const ThemeModeContext = createContext({
  toggleTheme: () => {},
  mode: 'light',
});

export const ThemeModeProvider = ({ children }) => {
  // On lit le thème depuis le localStorage, avec 'light' comme valeur par défaut
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');

  const themeModeAPI = useMemo(
    () => ({
      toggleTheme: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          // On sauvegarde le nouveau choix dans le localStorage
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
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

// Hook personnalisé
export const useThemeMode = () => {
  return useContext(ThemeModeContext);
};