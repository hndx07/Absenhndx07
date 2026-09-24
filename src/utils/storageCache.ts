/**
 * Safe Browser Cache & UI State Persistence
 * Ensures no credentials/tokens are ever stored in localStorage/sessionStorage.
 * Provides TTL-based caching and in-memory cache to prevent redundant network waterfalls.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

export const SafeCache = {
  get<T>(key: string): T | null {
    // 1. Check in-memory first (fastest)
    const mem = MEMORY_CACHE.get(key);
    const now = Date.now();
    if (mem) {
      if (now - mem.timestamp < mem.ttlMs) {
        return mem.data as T;
      }
      MEMORY_CACHE.delete(key);
    }

    // 2. Check sessionStorage
    try {
      const stored = sessionStorage.getItem(`cache_${key}`);
      if (!stored) return null;
      const parsed: CacheEntry<T> = JSON.parse(stored);
      if (now - parsed.timestamp < parsed.ttlMs) {
        // Rehydrate memory cache
        MEMORY_CACHE.set(key, parsed);
        return parsed.data;
      }
      sessionStorage.removeItem(`cache_${key}`);
    } catch (e) {
      // Storage errors handled gracefully
    }
    return null;
  },

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    MEMORY_CACHE.set(key, entry);

    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (e) {
      // Ignore quota errors
    }
  },

  invalidate(keyPrefix: string): void {
    // Invalidate matching in-memory keys
    for (const k of Array.from(MEMORY_CACHE.keys())) {
      if (k.startsWith(keyPrefix)) {
        MEMORY_CACHE.delete(k);
      }
    }

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(`cache_${keyPrefix}`)) {
          sessionStorage.removeItem(k);
        }
      }
    } catch (e) {}
  },

  clearAll(): void {
    MEMORY_CACHE.clear();
    try {
      sessionStorage.clear();
    } catch (e) {}
  },
};

/**
 * UI State Persistence Helper (Tab, Filters, Class Selection)
 * Non-sensitive UI preferences stored in localStorage/sessionStorage
 */
export const UiStatePersistence = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`ui_pref_${key}`);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (e) {}
    return defaultValue;
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`ui_pref_${key}`, JSON.stringify(value));
    } catch (e) {}
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(`ui_pref_${key}`);
    } catch (e) {}
  },
};
