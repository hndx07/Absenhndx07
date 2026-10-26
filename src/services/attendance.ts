import { AttendanceSession } from '../types';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { fetchAllPaginated } from './common';

export const DEFAULT_ATTENDANCE_SESSIONS: AttendanceSession[] = [
  {
    id: 'att_1',
    classId: 'class_1',
    tanggal: '2025-01-06',
    pertemuanKe: 1,
    topikMateri: 'Pengenalan Topologi Jaringan Komputer',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
    },
  },
  {
    id: 'att_2',
    classId: 'class_1',
    tanggal: '2025-01-13',
    pertemuanKe: 2,
    topikMateri: 'Konfigurasi IP Addressing dan Subnetting',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'S', catatan: 'Izin sakit flu' },
      std_3: { status: 'H' },
    },
  },
];

export async function getAttendanceSessions(classId?: string): Promise<AttendanceSession[]> {
  const cacheKey = `att_${classId || 'all'}`;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase
        .from('attendance_sessions')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const data = await fetchAllPaginated(query);
      if (data && data.length > 0) {
        const sessions: AttendanceSession[] = data.map((row: any) => ({
          id: row.id,
          classId: row.class_id,
          tanggal: row.tanggal,
          pertemuanKe: Number(row.pertemuan_ke),
          topikMateri: row.topik_materi || '',
          records: row.records || {},
        }));

        SafeCache.set(cacheKey, sessions);
        return sessions;
      }
    } catch (e) {
      console.warn('Supabase attendance fetch notice, using cached attendance:', e);
    }
  }

  const cached = SafeCache.get<AttendanceSession[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  return classId ? DEFAULT_ATTENDANCE_SESSIONS.filter((s) => s.classId === classId) : DEFAULT_ATTENDANCE_SESSIONS;
}

export async function saveAttendanceSession(session: AttendanceSession): Promise<AttendanceSession> {
  const cacheKey = `att_${session.classId}`;
  const current = SafeCache.get<AttendanceSession[]>(cacheKey) || [];
  const updated = [...current.filter((s) => s.id !== session.id), session];
  SafeCache.set(cacheKey, updated);

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      const payload = {
        id: session.id,
        class_id: session.classId,
        user_id: user.id,
        tanggal: session.tanggal,
        pertemuan_ke: session.pertemuanKe,
        topik_materi: session.topikMateri || '',
        records: session.records || {},
        updated_at: new Date().toISOString(),
      };
      await supabase.from('attendance_sessions').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync attendance session to cloud:', e);
    }
  }

  return session;
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('attendance_sessions').delete().eq('id', sessionId);
    } catch (e) {
      console.warn('Could not sync delete attendance to cloud:', e);
    }
  }
}
