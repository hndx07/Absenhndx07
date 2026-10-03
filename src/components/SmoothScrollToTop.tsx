import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { smoothScrollToTop } from '../utils/smoothScroll';

interface SmoothScrollToTopProps {
  threshold?: number;
  className?: string;
  showPercent?: boolean;
}

export const SmoothScrollToTop: React.FC<SmoothScrollToTopProps> = ({
  threshold = 220,
  className = '',
  showPercent = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY =
            window.scrollY ||
            window.pageYOffset ||
            document.documentElement.scrollTop;
          const docHeight =
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight;
          const progress = docHeight > 0 ? Math.min(100, Math.max(0, (currentY / docHeight) * 100)) : 0;

          setScrollProgress(progress);
          setIsVisible(currentY > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  if (!isVisible) return null;

  // SVG circular progress calculation (radius = 18, circumference = 2 * PI * 18 ≈ 113.1)
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ease-out transform ${
        isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-4 pointer-events-none'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => smoothScrollToTop(480)}
        aria-label="Kembali ke atas dengan animasi halus"
        title={`Kembali ke Atas (${Math.round(scrollProgress)}%)`}
        className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white text-slate-800 shadow-xl border border-emerald-100 hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-3 focus:ring-emerald-400/50"
      >
        {/* Animated Circular SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 44 44"
        >
          {/* Background circle */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-slate-100"
          />
          {/* Active progress track with gradient stroke */}
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="transparent"
            stroke="url(#scrollGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-out"
          />
          <defs>
            <linearGradient id="scrollGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#009B62" />
              <stop offset="50%" stopColor="#008276" />
              <stop offset="100%" stopColor="#292E82" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Icon & Optional Percent */}
        <div className="relative z-10 flex flex-col items-center justify-center text-emerald-700 group-hover:text-emerald-800 transition-colors">
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:-translate-y-0.5" />
          {showPercent && (
            <span className="text-[9px] font-mono font-bold leading-none -mt-1 text-slate-500">
              {Math.round(scrollProgress)}%
            </span>
          )}
        </div>

        {/* Tooltip on Hover */}
        <span className="absolute bottom-full mb-2 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900/90 backdrop-blur-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap transform translate-y-1 group-hover:translate-y-0">
          Kembali ke Atas
        </span>
      </button>
    </div>
  );
};
