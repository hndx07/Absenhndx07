import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Permanently purge any dark mode class and enforce static light theme
if (typeof window !== 'undefined') {
  document.documentElement.classList.remove('dark');
  try {
    localStorage.removeItem('smk_theme');
    localStorage.setItem('smk_theme', 'light');
  } catch {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

