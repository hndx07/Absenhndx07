interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const MEMORY_CACHE: Record<string, CacheEntry<any>> = {};

function isSensitiveCacheKey(key: string): boolean {
  return (
    key.startsWith('pub_share_') ||
    key.startsWith('students_') ||
    key.startsWith('grades_') ||
    key.startsWith('att_') ||
    key.startsWith('savings_') ||
    key.startsWith('agendas_') ||
    key.startsWith('class_data_')
  );
}

// Bersihkan cache legacy 'cache_*' dan payload sensitif (nilai, absensi, tabungan, siswa, share payload) di localStorage & sessionStorage saat startup aplikasi
if (typeof window !== 'undefined') {
  try {
    const sensitiveKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        if (
          k.startsWith('cache_') ||
          k.startsWith('smk_grades') ||
          k.startsWith('smk_attendance') ||
          k.startsWith('smk_savings') ||
          k.startsWith('smk_students') ||
          (k.startsWith('pub_share_') && !k.startsWith('pub_share_token_'))
        ) {
          sensitiveKeys.push(k);
        }
      }
    }
    sensitiveKeys.forEach((k) => localStorage.removeItem(k));

    // Bersihkan juga cache sensitif dari sessionStorage
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const sk = sessionStorage.key(i);
      if (sk && (sk.startsWith('cache_pub_share_') || sk.startsWith('cache_students_') || sk.startsWith('cache_grades_') || sk.startsWith('cache_att_') || sk.startsWith('cache_savings_') || sk.startsWith('cache_class_data_'))) {
        sessionKeysToRemove.push(sk);
      }
    }
    sessionKeysToRemove.forEach((sk) => sessionStorage.removeItem(sk));
  } catch {}
}

export class SafeCache {
  static get<T = any>(key: string): T | null {
    const mem = MEMORY_CACHE[key];
    if (mem !== undefined) {
      if (Date.now() <= mem.expiresAt) {
        return mem.data as T;
      } else {
        delete MEMORY_CACHE[key];
      }
    }
    if (typeof window === 'undefined') return null;
    // Data sensitif hanya disimpan di memori
    if (isSensitiveCacheKey(key)) return null;

    try {
      const item = sessionStorage.getItem(`cache_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === 'object' && 'expiresAt' in parsed) {
        if (Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem(`cache_${key}`);
          return null;
        }
        MEMORY_CACHE[key] = { data: parsed.data, expiresAt: parsed.expiresAt };
        return parsed.data as T;
      }
      return parsed as T;
    } catch {
      return null;
    }
  }

  static set<T = any>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;
    MEMORY_CACHE[key] = { data, expiresAt };
    if (typeof window === 'undefined') return;

    // JANGAN dump data murid / nilai / tabungan / presensi ke sessionStorage!
    // Data sensitif tetap berada di RAM (in-memory) selama sesi aktif
    if (isSensitiveCacheKey(key)) {
      return;
    }

    try {
      const payload = {
        data,
        expiresAt,
      };
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('SafeCache set error in sessionStorage:', e);
    }
  }

  static invalidate(key: string): void {
    delete MEMORY_CACHE[key];
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(`cache_${key}`);
    } catch {}
  }

  static clear(): void {
    for (const k in MEMORY_CACHE) {
      delete MEMORY_CACHE[k];
    }
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('cache_')) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
}

export class UiStatePersistence {
  static get<T = any>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const val = localStorage.getItem(`ui_${key}`);
      if (val === null) return defaultValue;
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  }

  static set<T = any>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`ui_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('UiStatePersistence error:', e);
    }
  }
}

const RAW_MEMORY_CACHE: Record<string, any> = {};

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    if (RAW_MEMORY_CACHE[key] !== undefined) {
      return RAW_MEMORY_CACHE[key] as T;
    }
    return fallback;
  }
}

export function safeSetLocalStorage<T>(key: string, value: T): void {
  RAW_MEMORY_CACHE[key] = value;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`LocalStorage quota exceeded or error for key ${key}:`, e);
  }
}

export function safeRemoveLocalStorage(key: string): void {
  delete RAW_MEMORY_CACHE[key];
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
