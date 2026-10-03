import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { smoothScrollHorizontal } from '../utils/smoothScroll';

interface SmoothHorizontalScrollerProps {
  children: React.ReactNode;
  className?: string;
  scrollStep?: number;
  label?: string;
}

export const SmoothHorizontalScroller: React.FC<SmoothHorizontalScrollerProps> = ({
  children,
  className = '',
  scrollStep = 340,
  label = 'Tabel',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setHasOverflow(overflow);
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();

    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', checkScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const handleScrollLeft = () => {
    if (containerRef.current) {
      smoothScrollHorizontal(containerRef.current, -scrollStep, 320);
    }
  };

  const handleScrollRight = () => {
    if (containerRef.current) {
      smoothScrollHorizontal(containerRef.current, scrollStep, 320);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Top Floating Control Bar for Wide Tables if overflow exists */}
      {hasOverflow && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 text-slate-600 text-[11px] font-semibold border-b border-slate-200/80 rounded-t-2xl">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Geser {label} secara horizontal atau gunakan navigasi:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={handleScrollLeft}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer flex items-center gap-0.5 text-[11px] font-bold"
              title="Gulir ke Kiri"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiri</span>
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={handleScrollRight}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer flex items-center gap-0.5 text-[11px] font-bold"
              title="Gulir ke Kanan"
            >
              <span className="hidden sm:inline">Kanan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Overflow container with smooth scrolling */}
      <div
        ref={containerRef}
        className="overflow-x-auto smooth-scroll scroll-smooth-all"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </div>

      {/* Left Gradient Indicator */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-8 bottom-0 w-8 bg-gradient-to-r from-black/10 to-transparent transition-opacity" />
      )}

      {/* Right Gradient Indicator */}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-8 bottom-0 w-8 bg-gradient-to-l from-black/10 to-transparent transition-opacity" />
      )}
    </div>
  );
};
