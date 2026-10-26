import { SavingTransaction } from '../types';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { fetchAllPaginated } from './common';

export async function getSavingTransactions(classId?: string): Promise<SavingTransaction[]> {
  const cacheKey = `savings_${classId || 'all'}`;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase
        .from('saving_transactions')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const data = await fetchAllPaginated(query);
      if (data) {
        const txs: SavingTransaction[] = data.map((row: any) => ({
          id: row.id,
          classId: row.class_id,
          studentId: row.student_id || undefined,
          isClassCash: Boolean(row.is_class_cash),
          tanggal: row.tanggal,
          tipe: row.tipe as 'masuk' | 'keluar',
          jumlah: Number(row.jumlah),
          keterangan: row.keterangan || '',
          pencatat: row.pencatat || '',
        }));

        SafeCache.set(cacheKey, txs);
        return txs;
      }
    } catch (e) {
      console.warn('Supabase savings fetch notice, using cached savings:', e);
    }
  }

  const cached = SafeCache.get<SavingTransaction[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  return [];
}

export async function saveSavingTransaction(tx: SavingTransaction): Promise<SavingTransaction> {
  const cacheKey = `savings_${tx.classId}`;
  const current = SafeCache.get<SavingTransaction[]>(cacheKey) || [];
  const updated = [...current.filter((s) => s.id !== tx.id), tx];
  SafeCache.set(cacheKey, updated);

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      const payload = {
        id: tx.id,
        class_id: tx.classId,
        user_id: user.id,
        student_id: tx.isClassCash ? null : (tx.studentId || null),
        is_class_cash: tx.isClassCash,
        tanggal: tx.tanggal,
        tipe: tx.tipe,
        jumlah: tx.jumlah,
        keterangan: tx.keterangan || '',
        pencatat: tx.pencatat || '',
        updated_at: new Date().toISOString(),
      };
      await supabase.from('saving_transactions').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync saving tx to cloud:', e);
    }
  }

  return tx;
}

export async function deleteSavingTransaction(txId: string): Promise<void> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('saving_transactions').delete().eq('id', txId);
    } catch (e) {
      console.warn('Could not sync delete saving tx to cloud:', e);
    }
  }
}
