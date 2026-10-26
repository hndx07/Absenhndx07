import { StudentGrade, GradeColumn } from '../types';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { fetchAllPaginated } from './common';
import { DEFAULT_STUDENTS } from './students';
import { getLocalGradeColumns, setLocalGradeColumns, DEFAULT_GRADE_COLUMNS } from '../utils/storage';

export const DEFAULT_GRADES: StudentGrade[] = DEFAULT_STUDENTS.map((std, i) => ({
  id: `grd_${i + 1}`,
  studentId: std.id,
  classId: std.classId,
  formatif1: 80 + (i % 15),
  formatif2: 85 - (i % 10),
  formatif3: 78 + (i % 12),
  formatif4: 82,
  formatif5: null,
  formatif6: null,
  formatif7: null,
  formatif8: null,
  formatif9: null,
  formatif10: null,
  sumatifTengah: 84,
  sumatifAkhir: 88,
  catatan: 'Capaian pembelajaran kompeten',
}));

export { getLocalGradeColumns, setLocalGradeColumns, DEFAULT_GRADE_COLUMNS };

export async function getStudentGrades(classId?: string): Promise<StudentGrade[]> {
  const cacheKey = `grades_${classId || 'all'}`;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('student_grades').select('*').order('id', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const data = await fetchAllPaginated(query);
      if (data && data.length > 0) {
        const grades: StudentGrade[] = data.map((row: any) => ({
          id: row.id,
          studentId: row.student_id,
          classId: row.class_id,
          formatif1: row.formatif1 !== null ? Number(row.formatif1) : null,
          formatif2: row.formatif2 !== null ? Number(row.formatif2) : null,
          formatif3: row.formatif3 !== null ? Number(row.formatif3) : null,
          formatif4: row.formatif4 !== null ? Number(row.formatif4) : null,
          formatif5: row.formatif5 !== null ? Number(row.formatif5) : null,
          formatif6: row.formatif6 !== null ? Number(row.formatif6) : null,
          formatif7: row.formatif7 !== null ? Number(row.formatif7) : null,
          formatif8: row.formatif8 !== null ? Number(row.formatif8) : null,
          formatif9: row.formatif9 !== null ? Number(row.formatif9) : null,
          formatif10: row.formatif10 !== null ? Number(row.formatif10) : null,
          sumatifTengah: row.sumatif_tengah !== null ? Number(row.sumatif_tengah) : null,
          sumatifAkhir: row.sumatif_akhir !== null ? Number(row.sumatif_akhir) : null,
          catatan: row.catatan || '',
        }));

        SafeCache.set(cacheKey, grades);
        return grades;
      }
    } catch (e) {
      console.warn('Supabase grades fetch notice, using cached grades:', e);
    }
  }

  const cached = SafeCache.get<StudentGrade[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  return classId ? DEFAULT_GRADES.filter((g) => g.classId === classId) : DEFAULT_GRADES;
}

export async function saveStudentGrade(grade: StudentGrade): Promise<StudentGrade> {
  const cacheKey = `grades_${grade.classId}`;
  const current = SafeCache.get<StudentGrade[]>(cacheKey) || [];
  const updated = [...current.filter((g) => g.id !== grade.id), grade];
  SafeCache.set(cacheKey, updated);

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      const payload = {
        id: grade.id,
        student_id: grade.studentId,
        class_id: grade.classId,
        user_id: user.id,
        formatif1: grade.formatif1,
        formatif2: grade.formatif2,
        formatif3: grade.formatif3,
        formatif4: grade.formatif4,
        formatif5: grade.formatif5,
        formatif6: grade.formatif6,
        formatif7: grade.formatif7,
        formatif8: grade.formatif8,
        formatif9: grade.formatif9,
        formatif10: grade.formatif10,
        sumatif_tengah: grade.sumatifTengah,
        sumatif_akhir: grade.sumatifAkhir,
        catatan: grade.catatan || '',
        updated_at: new Date().toISOString(),
      };
      await supabase.from('student_grades').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync grade to cloud:', e);
    }
  }

  return grade;
}

export async function batchUpsertStudentGrades(gradesList: StudentGrade[]): Promise<void> {
  if (gradesList.length === 0) return;

  const targetClassId = gradesList[0].classId;
  if (targetClassId) {
    SafeCache.invalidate(`grades_${targetClassId}`);
  }

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      const now = new Date().toISOString();
      const rows = gradesList.map((g) => ({
        id: g.id,
        student_id: g.studentId,
        class_id: g.classId,
        user_id: user.id,
        formatif1: g.formatif1,
        formatif2: g.formatif2,
        formatif3: g.formatif3,
        formatif4: g.formatif4,
        formatif5: g.formatif5,
        formatif6: g.formatif6,
        formatif7: g.formatif7,
        formatif8: g.formatif8,
        formatif9: g.formatif9,
        formatif10: g.formatif10,
        sumatif_tengah: g.sumatifTengah,
        sumatif_akhir: g.sumatifAkhir,
        catatan: g.catatan || '',
        updated_at: now,
      }));
      await supabase.from('student_grades').upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not sync batch grades to cloud:', e);
    }
  }
}

export async function getGradeColumns(classId?: string): Promise<GradeColumn[]> {
  try {
    const raw = localStorage.getItem('muhiba_grade_columns');
    if (raw) {
      const all = JSON.parse(raw);
      if (classId && all[classId] && Array.isArray(all[classId]) && all[classId].length > 0) {
        return all[classId];
      }
    }
  } catch {}

  const supabase = getSafeSupabaseClient();
  if (supabase && classId) {
    try {
      const { data, error } = await supabase
        .from('grade_columns')
        .select('*')
        .eq('class_id', classId)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const cols: GradeColumn[] = data.map((d: any) => ({
          id: d.id,
          key: d.key,
          label: d.label,
          tanggal: d.tanggal || undefined,
          keterangan: d.keterangan || undefined,
          bobot: d.bobot ? Number(d.bobot) : undefined,
        }));
        return cols;
      }
    } catch (e) {
      console.warn('Could not fetch grade columns from Supabase:', e);
    }
  }

  return getLocalGradeColumns(classId);
}

export async function saveGradeColumns(columns: GradeColumn[], classId?: string): Promise<void> {
  try {
    if (classId) {
      const raw = localStorage.getItem('muhiba_grade_columns');
      const all = raw ? JSON.parse(raw) : {};
      all[classId] = columns;
      localStorage.setItem('muhiba_grade_columns', JSON.stringify(all));
    }
    setLocalGradeColumns(columns, classId);

    const supabase = getSafeSupabaseClient();
    const user = await getAuthUser();
    if (supabase && user && classId) {
      const rows = columns.map((c) => ({
        id: c.id.startsWith('col_') ? `${c.id}_${classId}` : c.id,
        user_id: user.id,
        class_id: classId,
        key: c.key,
        label: c.label,
        tanggal: c.tanggal || null,
        keterangan: c.keterangan || '',
        bobot: c.bobot || null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('grade_columns').upsert(rows, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Grade columns saved locally:', err);
  }
}
