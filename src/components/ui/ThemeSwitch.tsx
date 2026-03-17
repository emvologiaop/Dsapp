import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'ddu_theme';

export const ThemeSwitch: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    const nextDark = saved ? saved === 'dark' : Boolean(prefersDark);
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-full bg-muted text-muted-foreground hover:text-primary transition-all"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

