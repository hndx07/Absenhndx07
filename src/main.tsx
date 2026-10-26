import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getPublicShareRefFromLocation } from './utils/publicShareUrl';
import './index.css';

// Ensure dark mode is permanently disabled and light theme is enforced
try {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  localStorage.removeItem('theme');
  localStorage.removeItem('color-theme');
} catch {
  // ignore
}

const publicShareRef = getPublicShareRefFromLocation();
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  if (publicShareRef) {
    // Mode publik: HANYA dynamic import PublicSharePage, TIDAK membawa App.tsx (LoginView, tab guru, modal guru, dsb.)
    const PublicSharePage = React.lazy(() =>
      import('./components/PublicSharePage').then((m) => ({ default: m.PublicSharePage }))
    );

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
                <div className="flex flex-col items-center gap-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-[#009B62]/30 border border-emerald-400/40 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-emerald-300 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold tracking-wide text-slate-300">
                    Memuat portal publik SMK Muhammadiyah Bawang...
                  </p>
                </div>
              </div>
            }
          >
            <PublicSharePage
              type={publicShareRef.type}
              shareId={publicShareRef.shareId}
            />
          </Suspense>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    // Mode guru / default: dynamic import App
    const App = React.lazy(() => import('./App'));

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
                <div className="flex flex-col items-center gap-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-indigo-300 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold tracking-wide text-slate-300">
                    Memuat Sistem Informasi SMK Muhammadiyah Bawang...
                  </p>
                </div>
              </div>
            }
          >
            <App />
          </Suspense>
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
}
