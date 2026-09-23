import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('smk_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('smk_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('smk_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode Terang (Light Mode)' : 'Mode Gelap (Dark Mode)'}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-300 select-none shadow-xs group ${
        isDark
          ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-800 hover:border-slate-600'
          : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-300 transition-transform duration-300 rotate-0 group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0 group-hover:rotate-45" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-semibold tracking-tight">
          {isDark ? 'Gelap' : 'Terang'}
        </span>
      ) : (
        <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};
