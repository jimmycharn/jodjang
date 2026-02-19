import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('money_tracker_theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('money_tracker_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const themeStyles = `
    :root {
      --bg-primary: ${theme === 'dark' ? '#0a0a0a' : '#F5F7FA'};
      --bg-secondary: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF'};
      --text-primary: ${theme === 'dark' ? '#FFFFFF' : '#1E293B'};
      --text-secondary: ${theme === 'dark' ? '#9CA3AF' : '#64748B'};
      --accent-color: #D4AF37;
      --glass-bg: ${theme === 'dark' ? 'rgba(20, 20, 20, 0.7)' : 'rgba(255, 255, 255, 0.8)'};
      --glass-border: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
      --card-shadow: ${theme === 'dark' ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' : '0 4px 20px rgba(0, 0, 0, 0.05)'};
    }
    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
    .glass-dark {
      background: var(--glass-bg) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid var(--glass-border) !important;
      box-shadow: var(--card-shadow) !important;
    }
    .gold-text { color: var(--accent-color) !important; }
    .gold-bg { background-color: var(--accent-color) !important; }
    .text-gray-500, .text-gray-600, .text-gray-400 { color: var(--text-secondary) !important; }
    .text-white { color: var(--text-primary) !important; }
    .bg-\\[\\#1a1a1a\\] { background-color: var(--bg-secondary) !important; }
    .border-\\[\\#0a0a0a\\] { border-color: var(--bg-primary) !important; }
    .bg-\\[\\#0a0a0a\\] { background-color: var(--bg-primary) !important; }
    .bg-white\\/5 { background-color: var(--bg-secondary) !important; }
    .border-white\\/10 { border-color: var(--glass-border) !important; }
  `;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <style>{themeStyles}</style>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
