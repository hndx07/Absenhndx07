/**
 * Smooth Scrolling Utility & Animations
 * SMK Muhammadiyah Bawang Attendance & Grading System
 */

// Custom cubic easing function for natural, silky-smooth deceleration
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutQuint = (t: number): number =>
  1 - Math.pow(1 - t, 5);

export interface SmoothScrollOptions {
  duration?: number;
  offset?: number;
  container?: HTMLElement | Window;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

/**
 * Animated smooth vertical scroll to a specific Y coordinate using RAF
 */
export function smoothScrollTo(
  targetY: number,
  options: SmoothScrollOptions = {}
): void {
  if (typeof window === 'undefined') return;

  const {
    duration = 420,
    container = window,
    easing = easeInOutCubic,
    onComplete,
  } = options;

  const isWindow = container === window;
  const startY = isWindow
    ? window.scrollY || window.pageYOffset || document.documentElement.scrollTop
    : (container as HTMLElement).scrollTop;

  const difference = targetY - startY;
  if (Math.abs(difference) < 2) {
    if (onComplete) onComplete();
    return;
  }

  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easing(progress);
    const nextY = startY + difference * eased;

    if (isWindow) {
      window.scrollTo(0, nextY);
    } else {
      (container as HTMLElement).scrollTop = nextY;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Ensure final position is set exactly
      if (isWindow) {
        window.scrollTo(0, targetY);
      } else {
        (container as HTMLElement).scrollTop = targetY;
      }
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(step);
}

/**
 * Animated smooth scroll to the very top of the page
 */
export function smoothScrollToTop(duration = 420): void {
  smoothScrollTo(0, { duration, easing: easeOutQuint });
}

/**
 * Animated smooth scroll to an element by selector, ID, or HTMLElement reference
 */
export function smoothScrollToElement(
  target: string | HTMLElement,
  options: SmoothScrollOptions = {}
): void {
  if (typeof window === 'undefined') return;

  const { offset = 84, duration = 450, onComplete } = options;

  let el: HTMLElement | null = null;
  if (typeof target === 'string') {
    el =
      document.getElementById(target.replace(/^#/, '')) ||
      document.querySelector(target);
  } else {
    el = target;
  }

  if (!el) return;

  const rect = el.getBoundingClientRect();
  const currentScrollY =
    window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  const targetY = Math.max(0, rect.top + currentScrollY - offset);

  smoothScrollTo(targetY, { duration, onComplete });
}

/**
 * Smooth horizontal scroll for wide tables and horizontal navigation bars
 */
export function smoothScrollHorizontal(
  container: HTMLElement,
  delta: number,
  duration = 320
): void {
  if (!container) return;

  const startX = container.scrollLeft;
  const targetX = Math.max(
    0,
    Math.min(startX + delta, container.scrollWidth - container.clientWidth)
  );
  const difference = targetX - startX;

  if (Math.abs(difference) < 2) return;

  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    container.scrollLeft = startX + difference * eased;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      container.scrollLeft = targetX;
    }
  }

  requestAnimationFrame(step);
}
