const MEMORY_CACHE: Record<string, any> = {};

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    if (MEMORY_CACHE[key] !== undefined) {
      return MEMORY_CACHE[key] as T;
    }
    return fallback;
  }
}

export function safeSetLocalStorage<T>(key: string, value: T): void {
  MEMORY_CACHE[key] = value;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`LocalStorage quota exceeded or error for key ${key}:`, e);
  }
}

export function safeRemoveLocalStorage(key: string): void {
  delete MEMORY_CACHE[key];
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
