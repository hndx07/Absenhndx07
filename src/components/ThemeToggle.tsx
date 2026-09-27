import React, { useEffect } from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

// Dark mode has been permanently removed in favor of static Muhammadiyah theme
export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.removeItem('smk_theme');
        localStorage.setItem('smk_theme', 'light');
      } catch {
        // ignore
      }
    }
  }, []);

  return null;
};

