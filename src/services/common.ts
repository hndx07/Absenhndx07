/**
 * Common data service utilities and helpers
 */
import { SafeCache } from '../utils/storageCache';

/**
 * Helper pagination untuk query Supabase yang berpotensi melebihi default limit 1000 baris.
 * Menggunakan .range(from, to) secara bertahap dalam loop hingga seluruh data terambil.
 */
export async function fetchAllPaginated<T = any>(
  queryBuilder: any,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;
    const { data, error } = await queryBuilder.range(from, to);
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allRows;
}

/**
 * Storage accessor yang aman untuk metadata atau data non-sensitif saja.
 * TIDAK MENYIMPAN data siswa, nilai, presensi detail, atau riwayat tabungan.
 */
export function getNonSensitiveLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setNonSensitiveLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
