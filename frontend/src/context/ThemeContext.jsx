import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

// BehaviorShield is dark-only. Kept as a provider (rather than deleting it
// outright) so main.jsx needs no changes, and so any `useTheme()` call
// elsewhere still resolves safely instead of throwing.
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);