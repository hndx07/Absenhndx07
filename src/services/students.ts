import { Student } from '../types';
import { getSafeSupabaseClient } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { fetchAllPaginated } from './common';

export const DEFAULT_STUDENTS: Student[] = [
  {
    id: 'std_1',
    classId: 'class_1',
    no: 1,
    nisn: '0071234561',
    nama: 'Ahmad Dahlan Saputra',
    gender: 'L',
    catatanUmum: 'Siswa aktif, ketua IPM ranting',
    noHpOrangTua: '081234567890',
  },
  {
    id: 'std_2',
    classId: 'class_1',
    no: 2,
    nisn: '0071234562',
    nama: 'Aisyah Putri Wardani',
    gender: 'P',
    catatanUmum: 'Tertib dan rajin mengaji',
    noHpOrangTua: '081234567891',
  },
  {
    id: 'std_3',
    classId: 'class_1',
    no: 3,
    nisn: '0071234563',
    nama: 'Bagas Aditya Pratama',
    gender: 'L',
    catatanUmum: 'Minat tinggi di bidang perakitan komputer',
    noHpOrangTua: '081234567892',
  },
];

/**
 * Urutkan dan sesuaikan nomor absen murid berdasarkan abjad nama (A-Z).
 * Menjamin nomor absen otomatis berurutan dari 1 sampai N tanpa jeda jika ada siswa ditambah atau dihapus.
 */
export function resequenceStudentsAlphabetically(students: Student[], classId?: string): Student[] {
  if (!students || !Array.isArray(students) || students.length === 0) return [];

  const validStudents = students.filter((s) => Boolean(s && typeof s === 'object'));
  if (validStudents.length === 0) return [];

  const distinctClassIds = Array.from(new Set(validStudents.map((s) => s.classId).filter(Boolean)));
  const classIds = classId ? [classId] : (distinctClassIds.length > 0 ? distinctClassIds : ['__all__']);

  let result = [...validStudents];

  for (const cId of classIds) {
    const classStudents = cId === '__all__'
      ? [...result]
      : result.filter((s) => s.classId === cId);
    const otherStudents = cId === '__all__'
      ? []
      : result.filter((s) => s.classId !== cId);

    if (classStudents.length === 0) continue;

    const sorted = [...classStudents].sort((a, b) => {
      const nameA = String(a?.nama || '').trim();
      const nameB = String(b?.nama || '').trim();
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });

    const resequenced = sorted.map((std, index) => ({
      ...std,
      nama: std?.nama || 'Tanpa Nama',
      no: index + 1,
    }));

    result = [...otherStudents, ...resequenced];
  }

  return result;
}

export async function getStudents(classId?: string): Promise<Student[]> {
  const cacheKey = `students_${classId || 'all'}`;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('students').select('*').order('id', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const data = await fetchAllPaginated(query);
      if (data && data.length > 0) {
        const raw: Student[] = data.map((s: any) => ({
          id: s.id,
          classId: s.class_id,
          no: Number(s.no) || 0,
          nisn: s.nisn || '',
          nama: s.nama || 'Tanpa Nama',
          gender: (s.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
          catatanUmum: s.catatan_umum || '',
          noHpOrangTua: s.no_hp_orang_tua || '',
        }));
        const resequenced = resequenceStudentsAlphabetically(raw, classId);

        // Simpan hanya di SafeCache (memory + sessionStorage), bukan localStorage
        SafeCache.set(cacheKey, resequenced);
        return resequenced;
      }
    } catch (e) {
      console.warn('Supabase students fetch notice, using cached students:', e);
    }
  }

  // Fallback ke SafeCache jika ada
  const cached = SafeCache.get<Student[]>(cacheKey);
  if (cached && cached.length > 0) {
    return resequenceStudentsAlphabetically(cached, classId);
  }

  const defaults = classId ? DEFAULT_STUDENTS.filter((s) => s.classId === classId) : DEFAULT_STUDENTS;
  return resequenceStudentsAlphabetically(defaults, classId);
}

export async function createStudent(std: Student): Promise<Student> {
  const id = std.id || `std_${crypto.randomUUID()}`;
  const newStd = { ...std, id };

  const cacheKey = `students_${std.classId}`;
  const currentList = SafeCache.get<Student[]>(cacheKey) || [];
  const updated = [...currentList.filter((s) => s.id !== id), newStd];
  const resequenced = resequenceStudentsAlphabetically(updated, std.classId);
  SafeCache.set(cacheKey, resequenced);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('students').insert({
        id,
        class_id: std.classId,
        no: newStd.no,
        nisn: std.nisn || '',
        nama: std.nama,
        gender: std.gender,
        catatan_umum: std.catatanUmum || '',
        no_hp_orang_tua: std.noHpOrangTua || '',
      });
    } catch (e) {
      console.warn('Could not sync student to cloud:', e);
    }
  }

  return resequenced.find((s) => s.id === id) || newStd;
}

export async function updateStudent(std: Student): Promise<Student> {
  const cacheKey = `students_${std.classId}`;
  const currentList = SafeCache.get<Student[]>(cacheKey) || [];
  const updated = currentList.map((s) => (s.id === std.id ? std : s));
  const resequenced = resequenceStudentsAlphabetically(updated, std.classId);
  SafeCache.set(cacheKey, resequenced);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('students')
        .update({
          no: std.no,
          nisn: std.nisn || '',
          nama: std.nama,
          gender: std.gender,
          catatan_umum: std.catatanUmum || '',
          no_hp_orang_tua: std.noHpOrangTua || '',
        })
        .eq('id', std.id);
    } catch (e) {
      console.warn('Could not sync updateStudent to cloud:', e);
    }
  }

  return resequenced.find((s) => s.id === std.id) || std;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('students').delete().eq('id', studentId);
    } catch (e) {
      console.warn('Could not sync deleteStudent to cloud:', e);
    }
  }
}

export async function batchInsertStudents(studentsList: Student[]): Promise<void> {
  if (studentsList.length === 0) return;

  const targetClassId = studentsList[0].classId;
  if (targetClassId) {
    SafeCache.invalidate(`students_${targetClassId}`);
  }

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      const rows = studentsList.map((std) => ({
        id: std.id,
        class_id: std.classId,
        no: std.no,
        nisn: std.nisn,
        nama: std.nama,
        gender: std.gender,
        catatan_umum: std.catatanUmum || '',
        no_hp_orang_tua: std.noHpOrangTua || '',
      }));
      await supabase.from('students').upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync batch students to cloud:', e);
    }
  }
}
