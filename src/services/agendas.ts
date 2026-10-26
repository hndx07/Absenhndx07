import { TeachingAgenda, AttendanceSession, ClassRoom, TeacherProfile, Student } from '../types';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { fetchAllPaginated } from './common';

export const DEFAULT_AGENDAS: TeachingAgenda[] = [
  {
    id: 'ag_1',
    classId: 'class_1',
    classNameSnapshot: 'X TJKT 1',
    mataPelajaran: 'Dasar-Dasar Kejuruan TJKT',
    guruName: 'Hendra A.Md.Kom',
    tanggal: '2025-01-06',
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07:15 - 09:15 WIB',
    materiAjar: 'Pengenalan Topologi Jaringan Komputer',
    kegiatan: 'Pemaparan teori dasar Bus, Star, Ring, dan Mesh dilanjutkan diskusi kelompok.',
    catatan: 'Seluruh siswa hadir tertib.',
    hadirCount: 3,
    tidakHadirCount: 0,
    pertemuanKe: 1,
    created_at: '2025-01-06T07:15:00Z',
    updated_at: '2025-01-06T09:15:00Z',
  },
  {
    id: 'ag_2',
    classId: 'class_1',
    classNameSnapshot: 'X TJKT 1',
    mataPelajaran: 'Dasar-Dasar Kejuruan TJKT',
    guruName: 'Hendra A.Md.Kom',
    tanggal: '2025-01-13',
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07:15 - 09:15 WIB',
    materiAjar: 'Konfigurasi IP Addressing dan Subnetting',
    kegiatan: 'Praktik perhitungan IPv4 kelas C di buku catatan dan simulator Packet Tracer.',
    catatan: 'Aisyah Putri izin sakit flu.',
    hadirCount: 2,
    tidakHadirCount: 1,
    pertemuanKe: 2,
    created_at: '2025-01-13T07:15:00Z',
    updated_at: '2025-01-13T09:15:00Z',
  },
];

export async function getTeachingAgendas(classId?: string): Promise<TeachingAgenda[]> {
  const cacheKey = `agendas_${classId || 'all'}`;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase
        .from('teaching_agendas')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const data = await fetchAllPaginated(query);
      if (data && data.length > 0) {
        const agendas: TeachingAgenda[] = data.map((row: any) => ({
          id: row.id,
          classId: row.class_id,
          tanggal: row.tanggal,
          hari: row.hari,
          jamKe: row.jam_ke,
          rentangJam: row.rentang_jam,
          materiAjar: row.materi_ajar,
          kegiatan: row.kegiatan || '',
          catatan: row.catatan || '',
          hadirCount: Number(row.hadir_count || 0),
          tidakHadirCount: Number(row.tidak_hadir_count || 0),
        }));

        SafeCache.set(cacheKey, agendas);
        return agendas;
      }
    } catch (e) {
      console.warn('Supabase agendas fetch notice, using cached agendas:', e);
    }
  }

  const cached = SafeCache.get<TeachingAgenda[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  return classId ? DEFAULT_AGENDAS.filter((a) => a.classId === classId) : DEFAULT_AGENDAS;
}

export async function saveTeachingAgenda(agenda: TeachingAgenda): Promise<TeachingAgenda> {
  const cacheKey = `agendas_${agenda.classId}`;
  const current = SafeCache.get<TeachingAgenda[]>(cacheKey) || [];
  const updated = [...current.filter((a) => a.id !== agenda.id), agenda];
  SafeCache.set(cacheKey, updated);

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      const payload = {
        id: agenda.id,
        class_id: agenda.classId,
        user_id: user.id,
        tanggal: agenda.tanggal,
        hari: agenda.hari,
        jam_ke: agenda.jamKe,
        rentang_jam: agenda.rentangJam,
        materi_ajar: agenda.materiAjar,
        kegiatan: agenda.kegiatan || '',
        catatan: agenda.catatan || '',
        hadir_count: agenda.hadirCount || 0,
        tidak_hadir_count: agenda.tidakHadirCount || 0,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('teaching_agendas').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync teaching agenda to cloud:', e);
    }
  }

  return agenda;
}

export async function deleteTeachingAgenda(agendaId: string): Promise<void> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('teaching_agendas').delete().eq('id', agendaId);
    } catch (e) {
      console.warn('Could not sync delete agenda to cloud:', e);
    }
  }
}

export async function syncAttendanceSessionToAgenda(
  session: AttendanceSession,
  classRoom?: ClassRoom,
  teacher?: TeacherProfile,
  students: Student[] = []
): Promise<TeachingAgenda> {
  const currentAgendas = await getTeachingAgendas(session.classId);

  // 1. Hitung Kehadiran dan Ketidakhadiran
  let hadirCount = 0;
  let tidakHadirCount = 0;
  const absentDetails: string[] = [];

  const records = session.records || {};
  const recordStudentIds = Object.keys(records);

  if (students && students.length > 0) {
    students.forEach((std) => {
      const rec = records[std.id];
      const status = rec?.status || 'H';
      if (status === 'H' || status === 'D') {
        hadirCount++;
      } else {
        tidakHadirCount++;
        const label = status === 'S' ? 'Sakit' : status === 'I' ? 'Izin' : 'Alpa';
        const note = rec?.catatan ? `: ${rec.catatan}` : '';
        absentDetails.push(`${std.nama} (${label}${note})`);
      }
    });
  } else if (recordStudentIds.length > 0) {
    recordStudentIds.forEach((stdId) => {
      const rec = records[stdId];
      const status = rec?.status || 'H';
      if (status === 'H' || status === 'D') {
        hadirCount++;
      } else {
        tidakHadirCount++;
        const label = status === 'S' ? 'Sakit' : status === 'I' ? 'Izin' : 'Alpa';
        absentDetails.push(`Murid #${stdId} (${label})`);
      }
    });
  }

  let summaryCatatan = 'Seluruh siswa hadir tertib.';
  if (absentDetails.length > 0) {
    summaryCatatan = `Tidak hadir: ${absentDetails.join(', ')}`;
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  let hari = session.hari?.trim() || 'Senin';
  if (!session.hari) {
    try {
      const d = new Date(session.tanggal);
      if (!isNaN(d.getTime())) {
        hari = dayNames[d.getDay()] || 'Senin';
      }
    } catch {}
  }

  const topic = session.topikMateri?.trim() || `Pertemuan Pembelajaran Rutin Ke-${session.pertemuanKe}`;

  const linkedId = `ag_att_${session.id}`;
  let existing = currentAgendas.find((a) => a.id === linkedId);
  if (!existing) {
    existing = currentAgendas.find((a) => a.classId === session.classId && a.tanggal === session.tanggal);
  }
  if (!existing) {
    existing = currentAgendas.find((a) => a.classId === session.classId && a.pertemuanKe === session.pertemuanKe);
  }

  let finalCatatan = session.catatan?.trim() || '';
  if (!finalCatatan) {
    finalCatatan = summaryCatatan;
  } else if (absentDetails.length > 0 && !finalCatatan.includes('Tidak hadir:')) {
    finalCatatan = `${finalCatatan} (${summaryCatatan})`;
  }

  let agendaToSave: TeachingAgenda;

  if (existing) {
    agendaToSave = {
      ...existing,
      pertemuanKe: session.pertemuanKe,
      tanggal: session.tanggal,
      hari: session.hari || hari || existing.hari,
      jamKe: session.jamKe || existing.jamKe || '1 - 4',
      rentangJam: session.rentangJam || existing.rentangJam || '07:15 - 09:15 WIB',
      materiAjar: session.topikMateri?.trim() ? session.topikMateri.trim() : (existing.materiAjar || topic),
      kegiatan: session.kegiatan?.trim() || existing.kegiatan || `Pembelajaran tatap muka pertemuan ke-${session.pertemuanKe}`,
      catatan: finalCatatan,
      hadirCount,
      tidakHadirCount,
      classNameSnapshot: classRoom?.namaKelas || existing.classNameSnapshot || '',
      mataPelajaran: classRoom?.mataPelajaran || existing.mataPelajaran || teacher?.mataPelajaranUtama || '',
      guruName: teacher?.namaGuru || existing.guruName,
      updated_at: new Date().toISOString(),
    };
  } else {
    agendaToSave = {
      id: linkedId,
      classId: session.classId,
      classNameSnapshot: classRoom?.namaKelas || '',
      mataPelajaran: classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || '',
      guruName: teacher?.namaGuru || 'Pendidik',
      tanggal: session.tanggal,
      hari,
      jamKe: session.jamKe || '1 - 4',
      rentangJam: session.rentangJam || '07:15 - 09:15 WIB',
      materiAjar: topic,
      kegiatan: session.kegiatan?.trim() || `Pembelajaran tatap muka pertemuan ke-${session.pertemuanKe}`,
      catatan: finalCatatan,
      hadirCount,
      tidakHadirCount,
      pertemuanKe: session.pertemuanKe,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return await saveTeachingAgenda(agendaToSave);
}

export async function batchSaveTeachingAgendas(agendas: TeachingAgenda[]): Promise<TeachingAgenda[]> {
  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user && agendas.length > 0) {
    try {
      const payloads = agendas.map((agenda) => ({
        id: agenda.id,
        class_id: agenda.classId,
        user_id: user.id,
        tanggal: agenda.tanggal,
        hari: agenda.hari,
        jam_ke: agenda.jamKe,
        rentang_jam: agenda.rentangJam,
        materi_ajar: agenda.materiAjar,
        kegiatan: agenda.kegiatan || '',
        catatan: agenda.catatan || '',
        hadir_count: agenda.hadirCount || 0,
        tidak_hadir_count: agenda.tidakHadirCount || 0,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('teaching_agendas').upsert(payloads, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not batch sync teaching agendas to cloud:', e);
    }
  }

  return agendas;
}
