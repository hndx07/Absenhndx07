import React, { useState, useEffect } from 'react';

interface ScrollProgressBarProps {
  className?: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({ className = '' }) => {
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
          const progress =
            docHeight > 0 ? Math.min(100, Math.max(0, (currentY / docHeight) * 100)) : 0;

          setScrollProgress(progress);
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
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none bg-slate-200/30 overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] transition-all duration-150 ease-out shadow-xs"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
