import { TeacherProfile, ClassRoom } from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { getNonSensitiveLocalItem, setNonSensitiveLocalItem } from './common';
import { getStudents } from './students';
import { getAttendanceSessions } from './attendance';
import { getStudentGrades } from './grades';

export const DEFAULT_TEACHER: TeacherProfile = {
  id: 'teacher_default_1',
  namaGuru: 'Hendra A.Md.Kom',
  nip: '',
  nbm: '1234567',
  namaSekolah: SCHOOL_CONFIG.namaSekolah,
  namaKepalaSekolah: 'Imam Fathoni, S.Ag.',
  nipKepalaSekolah: '',
  nbmKepalaSekolah: '865882',
  mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
  tahunAjaran: '2025/2026',
  semester: 'Genap',
  email: 'hendraguru@smkmuhbawang.sch.id',
  isLoggedIn: true,
};

export const DEFAULT_CLASSES: ClassRoom[] = [
  {
    id: 'class_1',
    namaKelas: 'X TJKT 1',
    mataPelajaran: 'Dasar-Dasar Kejuruan TJKT',
    kkm: 75,
    jurusan: 'TJKT',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-01-01',
  },
  {
    id: 'class_2',
    namaKelas: 'XI TKJ 2',
    mataPelajaran: 'Administrasi Infrastruktur Jaringan',
    kkm: 78,
    jurusan: 'TJKT',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-01-02',
  },
  {
    id: 'class_3',
    namaKelas: 'XII TKJ 1',
    mataPelajaran: 'Teknologi Layanan Jaringan',
    kkm: 80,
    jurusan: 'TJKT',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-01-03',
  },
];

// ============================================================================
// 1. TEACHER PROFILE SERVICE
// ============================================================================

export async function getTeacherProfile(force = false): Promise<TeacherProfile | null> {
  if (!force) {
    const cached = SafeCache.get<TeacherProfile>('teacher_profile');
    if (cached) return cached;
  }

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();

  if (supabase && user) {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const profile: TeacherProfile = {
          id: data.id,
          namaGuru: data.nama_guru || user.user_metadata?.nama_guru || DEFAULT_TEACHER.namaGuru,
          nip: '',
          nbm: data.nbm || '',
          namaSekolah: data.nama_sekolah || SCHOOL_CONFIG.namaSekolah,
          namaKepalaSekolah: data.nama_kepala_sekolah || user.user_metadata?.nama_kepala_sekolah || DEFAULT_TEACHER.namaKepalaSekolah,
          nipKepalaSekolah: '',
          nbmKepalaSekolah: data.nbm_kepala_sekolah || user.user_metadata?.nbm_kepala_sekolah || DEFAULT_TEACHER.nbmKepalaSekolah,
          mataPelajaranUtama: data.mata_pelajaran_utama || 'Konsentrasi Keahlian TKJ',
          tahunAjaran: data.tahun_ajaran || '2025/2026',
          semester: (data.semester as 'Ganjil' | 'Genap') || 'Genap',
          email: data.email || user.email || '',
          avatarUrl: data.avatar_url,
          activeClassId: data.active_class_id,
          isLoggedIn: true,
        };
        SafeCache.set('teacher_profile', profile);
        setNonSensitiveLocalItem('muhiba_teacher_profile', profile);
        return profile;
      }
    } catch (e) {
      console.warn('Supabase profile fetch notice, using local profile:', e);
    }
  }

  // Fallback to local profile or default
  const localProfile = getNonSensitiveLocalItem<TeacherProfile | null>('muhiba_teacher_profile', null);
  const result = localProfile || {
    ...DEFAULT_TEACHER,
    namaGuru: user?.user_metadata?.nama_guru || DEFAULT_TEACHER.namaGuru,
    email: user?.email || DEFAULT_TEACHER.email,
  };

  SafeCache.set('teacher_profile', result);
  setNonSensitiveLocalItem('muhiba_teacher_profile', result);
  return result;
}

export async function createOrUpdateTeacherProfile(
  profile: Partial<TeacherProfile>
): Promise<TeacherProfile> {
  const current = (await getTeacherProfile()) || DEFAULT_TEACHER;
  const user = await getAuthUser();
  const userId = user?.id || 'guru_offline_id';

  const updated: TeacherProfile = {
    ...current,
    ...profile,
    id: profile.id || current.id || `teacher_${userId.slice(0, 8)}`,
    namaGuru: profile.namaGuru ?? current.namaGuru,
    email: user?.email || profile.email || current.email,
    isLoggedIn: true,
  };

  SafeCache.set('teacher_profile', updated);
  setNonSensitiveLocalItem('muhiba_teacher_profile', updated);

  const supabase = getSafeSupabaseClient();
  if (supabase && user) {
    try {
      const payload: Record<string, any> = {
        id: updated.id,
        user_id: user.id,
        nama_guru: updated.namaGuru,
        nip: '',
        nbm: updated.nbm || '',
        nama_sekolah: updated.namaSekolah,
        nama_kepala_sekolah: updated.namaKepalaSekolah || '',
        nip_kepala_sekolah: '',
        nbm_kepala_sekolah: updated.nbmKepalaSekolah || '',
        mata_pelajaran_utama: updated.mataPelajaranUtama,
        tahun_ajaran: updated.tahunAjaran,
        semester: updated.semester,
        email: updated.email,
        avatar_url: updated.avatarUrl || '',
        active_class_id: updated.activeClassId || null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('teacher_profiles').upsert(payload, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Could not sync teacher profile to Supabase, saved locally:', e);
    }
  }

  return updated;
}

// ============================================================================
// 2. CLASSES SERVICE
// ============================================================================

export async function getClasses(): Promise<ClassRoom[]> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const classes: ClassRoom[] = data.map((c: any) => ({
          id: c.id,
          namaKelas: c.nama_kelas,
          mataPelajaran: c.mata_pelajaran,
          kkm: Number(c.kkm) || 75,
          jurusan: c.jurusan || 'TKJ',
          keterangan: c.keterangan,
          createdAt: c.created_at,
        }));
        SafeCache.set('all_classes', classes);
        setNonSensitiveLocalItem('smk_classes', classes);
        return classes;
      }
    } catch (e) {
      console.warn('Supabase classes fetch notice, using cached classes:', e);
    }
  }

  // Fallback to cache / non-sensitive local storage
  const cachedClasses = SafeCache.get<ClassRoom[]>('all_classes');
  if (cachedClasses && cachedClasses.length > 0) return cachedClasses;

  let localClasses = getNonSensitiveLocalItem<ClassRoom[]>('smk_classes', []);
  if (localClasses.length === 0) {
    localClasses = [...DEFAULT_CLASSES];
    setNonSensitiveLocalItem('smk_classes', localClasses);
  }
  return localClasses;
}

export async function createClass(cls: ClassRoom): Promise<ClassRoom> {
  const localClasses = getNonSensitiveLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = [...localClasses.filter((c) => c.id !== cls.id), cls];
  setNonSensitiveLocalItem('smk_classes', updatedClasses);
  SafeCache.set('all_classes', updatedClasses);

  const supabase = getSafeSupabaseClient();
  const user = await getAuthUser();
  if (supabase && user) {
    try {
      await supabase.from('classes').insert({
        id: cls.id,
        user_id: user.id,
        nama_kelas: cls.namaKelas,
        mataPelajaran: cls.mataPelajaran,
        kkm: cls.kkm,
        jurusan: cls.jurusan,
        keterangan: cls.keterangan || '',
      });
    } catch (e) {
      console.warn('Could not sync class to cloud, saved locally:', e);
    }
  }

  return cls;
}

export async function updateClass(cls: ClassRoom): Promise<ClassRoom> {
  const localClasses = getNonSensitiveLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = localClasses.map((c) => (c.id === cls.id ? cls : c));
  setNonSensitiveLocalItem('smk_classes', updatedClasses);
  SafeCache.set('all_classes', updatedClasses);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('classes')
        .update({
          nama_kelas: cls.namaKelas,
          mata_pelajaran: cls.mataPelajaran,
          kkm: cls.kkm,
          jurusan: cls.jurusan,
          keterangan: cls.keterangan || '',
        })
        .eq('id', cls.id);
    } catch (e) {
      console.warn('Could not sync updateClass to cloud:', e);
    }
  }

  return cls;
}

export async function deleteClass(classId: string): Promise<void> {
  const localClasses = getNonSensitiveLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = localClasses.filter((c) => c.id !== classId);
  setNonSensitiveLocalItem('smk_classes', updatedClasses);
  SafeCache.set('all_classes', updatedClasses);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('classes').delete().eq('id', classId);
    } catch (e) {
      console.warn('Could not sync deleteClass to cloud:', e);
    }
  }
}

export async function getClassDependencyCounts(classId: string): Promise<{
  studentsCount: number;
  attendanceCount: number;
  gradesCount: number;
}> {
  try {
    const students = await getStudents(classId);
    const attendance = await getAttendanceSessions(classId);
    const grades = await getStudentGrades(classId);
    return {
      studentsCount: students.length,
      attendanceCount: attendance.length,
      gradesCount: grades.length,
    };
  } catch {
    return { studentsCount: 0, attendanceCount: 0, gradesCount: 0 };
  }
}
