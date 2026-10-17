import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { SafeCache } from '../utils/storageCache';
import {
  getLocalGradeColumns,
  setLocalGradeColumns,
  DEFAULT_GRADE_COLUMNS,
} from '../utils/storage';
import {
  TeacherProfile,
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  SavingTransaction,
  PublicShareRecord,
} from '../types';

// ============================================================================
// DEFAULT SEED DATA (SMK MUHAMMADIYAH BAWANG - FALLBACK & OFFLINE FIRST)
// ============================================================================

export const DEFAULT_TEACHER: TeacherProfile = {
  id: 'teacher_default',
  namaGuru: 'Guru SMK Muhammadiyah Bawang',
  nip: '',
  nbm: '1122334',
  namaSekolah: SCHOOL_CONFIG.namaSekolah,
  namaKepalaSekolah: 'Imam Santoso, S.T., M.Pd.',
  nipKepalaSekolah: '',
  nbmKepalaSekolah: '998877',
  mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
  tahunAjaran: '2025/2026',
  semester: 'Genap',
  email: 'guru@smkmuhbawang.sch.id',
  activeClassId: 'class_tkj_1',
  isLoggedIn: true,
};

export const DEFAULT_CLASSES: ClassRoom[] = [
  {
    id: 'class_tkj_1',
    namaKelas: 'XII TKJ 1',
    mataPelajaran: 'Administrasi Infrastruktur Jaringan',
    kkm: 75,
    jurusan: 'TKJ',
    keterangan: 'Konsentrasi Keahlian Teknik Komputer & Jaringan',
    createdAt: '2026-01-05T07:00:00.000Z',
  },
  {
    id: 'class_tkj_2',
    namaKelas: 'XII TKJ 2',
    mataPelajaran: 'Administrasi Sistem Jaringan',
    kkm: 75,
    jurusan: 'TKJ',
    keterangan: 'Konsentrasi Keahlian Teknik Komputer & Jaringan',
    createdAt: '2026-01-05T07:00:00.000Z',
  },
];

export const DEFAULT_STUDENTS: Student[] = [
  // Murid Kelas XII TKJ 1
  { id: 'std_1', classId: 'class_tkj_1', no: 1, nisn: '0071234561', nama: 'Ahmad Fauzi', gender: 'L', catatanUmum: 'Aktif dalam praktik jaringan' },
  { id: 'std_2', classId: 'class_tkj_1', no: 2, nisn: '0071234562', nama: 'Anisa Rahmawati', gender: 'P', catatanUmum: 'Teliti & rajin' },
  { id: 'std_3', classId: 'class_tkj_1', no: 3, nisn: '0071234563', nama: 'Bagas Pratama', gender: 'L', catatanUmum: 'Paham konfigurasi mikrotik' },
  { id: 'std_4', classId: 'class_tkj_1', no: 4, nisn: '0071234564', nama: 'Dewi Anggraeni', gender: 'P', catatanUmum: 'Pengurus kas kelas' },
  { id: 'std_5', classId: 'class_tkj_1', no: 5, nisn: '0071234565', nama: 'Dimas Setiawan', gender: 'L', catatanUmum: 'Bagus dalam troubleshooting' },
  { id: 'std_6', classId: 'class_tkj_1', no: 6, nisn: '0071234566', nama: 'Fajar Hidayat', gender: 'L', catatanUmum: 'Disiplin hadir' },
  { id: 'std_7', classId: 'class_tkj_1', no: 7, nisn: '0071234567', nama: 'Nabila Putri', gender: 'P', catatanUmum: 'Sekretaris kelas' },
  { id: 'std_8', classId: 'class_tkj_1', no: 8, nisn: '0071234568', nama: 'Rizky Ramadhan', gender: 'L', catatanUmum: 'Terampil dynamic routing' },
  { id: 'std_9', classId: 'class_tkj_1', no: 9, nisn: '0071234569', nama: 'Siti Nurhaliza', gender: 'P', catatanUmum: 'Sangat rapi dalam dokumentasi' },
  { id: 'std_10', classId: 'class_tkj_1', no: 10, nisn: '0071234570', nama: 'Yusuf Maulana', gender: 'L', catatanUmum: 'Ketua kelas XII TKJ 1' },
  // Murid Kelas XII TKJ 2
  { id: 'std_201', classId: 'class_tkj_2', no: 1, nisn: '0071234581', nama: 'Aditya Pratama', gender: 'L', catatanUmum: 'Mahir sistem operasi jaringan' },
  { id: 'std_202', classId: 'class_tkj_2', no: 2, nisn: '0071234582', nama: 'Bella Safitri', gender: 'P', catatanUmum: 'Aktif diskusi & administrasi server' },
  { id: 'std_203', classId: 'class_tkj_2', no: 3, nisn: '0071234583', nama: 'Daffa Al-Ghifari', gender: 'L', catatanUmum: 'Terampil konfigurasi Linux' },
  { id: 'std_204', classId: 'class_tkj_2', no: 4, nisn: '0071234584', nama: 'Eka Nurjanah', gender: 'P', catatanUmum: 'Disiplin dan bertanggung jawab' },
  { id: 'std_205', classId: 'class_tkj_2', no: 5, nisn: '0071234585', nama: 'Galang Saputra', gender: 'L', catatanUmum: 'Cepat tanggap dalam troubleshooting' },
  { id: 'std_206', classId: 'class_tkj_2', no: 6, nisn: '0071234586', nama: 'Hana Maulida', gender: 'P', catatanUmum: 'Teliti dalam pembukuan kelas' },
  { id: 'std_207', classId: 'class_tkj_2', no: 7, nisn: '0071234587', nama: 'Irfan Hakim', gender: 'L', catatanUmum: 'Pengurus perlengkapan lab komputer' },
  { id: 'std_208', classId: 'class_tkj_2', no: 8, nisn: '0071234588', nama: 'Nadya Lutfiani', gender: 'P', catatanUmum: 'Rajin menyelesaikan tugas proyek' },
  { id: 'std_209', classId: 'class_tkj_2', no: 9, nisn: '0071234589', nama: 'Rian Syahputra', gender: 'L', catatanUmum: 'Aktif dalam konfigurasi server DNS & Web' },
  { id: 'std_210', classId: 'class_tkj_2', no: 10, nisn: '0071234590', nama: 'Zahra Aulia', gender: 'P', catatanUmum: 'Ketua kelas XII TKJ 2' },
];

const currentYear = new Date().getFullYear();

export const DEFAULT_ATTENDANCE_SESSIONS: AttendanceSession[] = [
  // Triwulan 1 - Bulan Januari
  {
    id: 'att_sess_1',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-01-12`,
    pertemuanKe: 1,
    topikMateri: 'Pengenalan Routing Statis & Mikrotik RouterOS',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
      std_4: { status: 'H' },
      std_5: { status: 'H' },
      std_6: { status: 'H' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
  {
    id: 'att_sess_2',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-01-26`,
    pertemuanKe: 2,
    topikMateri: 'Konfigurasi VLAN Trunking pada Cisco Catalyst',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'I', catatan: 'Izin urusan keluarga' },
      std_4: { status: 'H' },
      std_5: { status: 'H' },
      std_6: { status: 'H' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
  // Triwulan 1 - Bulan Februari
  {
    id: 'att_sess_3',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-02-09`,
    pertemuanKe: 3,
    topikMateri: 'Praktikum Routing Dinamis OSPF Single Area',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
      std_4: { status: 'S', catatan: 'Sakit flu' },
      std_5: { status: 'H' },
      std_6: { status: 'H' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
  {
    id: 'att_sess_4',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-02-23`,
    pertemuanKe: 4,
    topikMateri: 'Konfigurasi Firewall Filter Rules & NAT',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
      std_4: { status: 'H' },
      std_5: { status: 'H' },
      std_6: { status: 'D', catatan: 'Dispensasi Lomba LKS IT Network' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
  // Triwulan 1 - Bulan Maret
  {
    id: 'att_sess_5',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-03-08`,
    pertemuanKe: 5,
    topikMateri: 'Manajemen Bandwidth Simple Queue & PCQ',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
      std_4: { status: 'H' },
      std_5: { status: 'H' },
      std_6: { status: 'H' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
  {
    id: 'att_sess_6',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-03-22`,
    pertemuanKe: 6,
    topikMateri: 'Evaluasi & Uji Kompetensi Jaringan Triwulan 1',
    records: {
      std_1: { status: 'H' },
      std_2: { status: 'H' },
      std_3: { status: 'H' },
      std_4: { status: 'H' },
      std_5: { status: 'H' },
      std_6: { status: 'H' },
      std_7: { status: 'H' },
      std_8: { status: 'H' },
      std_9: { status: 'H' },
      std_10: { status: 'H' },
    },
  },
];

export const DEFAULT_GRADES: StudentGrade[] = DEFAULT_STUDENTS.map((std, i) => ({
  id: `grade_${std.id}`,
  studentId: std.id,
  classId: 'class_tkj_1',
  formatif1: 85 + (i % 8),
  formatif2: 80 + (i % 10),
  formatif3: 82 + (i % 7),
  formatif4: 88 + (i % 5),
  formatif5: 84 + (i % 9),
  formatif6: null,
  formatif7: null,
  formatif8: null,
  formatif9: null,
  formatif10: null,
  sumatifTengah: 84 + (i % 8),
  sumatifAkhir: 86 + (i % 6),
  catatan: 'Kompeten dalam praktik konfigurasi jaringan',
}));

export const DEFAULT_AGENDAS: TeachingAgenda[] = [
  {
    id: 'agenda_1',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-01-12`,
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07.00 - 10.00',
    materiAjar: 'Konsep Dasar Routing Statis & MikroTik',
    kegiatan: 'Penyampaian materi dan praktik simulasi Cisco Packet Tracer',
    catatan: 'Seluruh siswa antusias dan tuntas konfigurasi',
    hadirCount: 10,
    tidakHadirCount: 0,
  },
  {
    id: 'agenda_2',
    classId: 'class_tkj_1',
    tanggal: `${currentYear}-02-09`,
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07.00 - 10.00',
    materiAjar: 'Praktikum Routing Dinamis OSPF Single Area',
    kegiatan: 'Konfigurasi router MikroTik RB750Gr3 di laboratorium komputer',
    catatan: '1 siswa sakit, materi dilanjutkan pendampingan tutor sebaya',
    hadirCount: 9,
    tidakHadirCount: 1,
  },
];

// LocalStorage Helper Helpers
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

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
        setLocalItem('muhiba_teacher_profile', profile);
        return profile;
      }
    } catch (e) {
      console.warn('Supabase profile fetch notice, using local profile:', e);
    }
  }

  // Fallback to local profile or default
  const localProfile = getLocalItem<TeacherProfile | null>('muhiba_teacher_profile', null);
  const result = localProfile || {
    ...DEFAULT_TEACHER,
    namaGuru: user?.user_metadata?.nama_guru || DEFAULT_TEACHER.namaGuru,
    email: user?.email || DEFAULT_TEACHER.email,
  };

  SafeCache.set('teacher_profile', result);
  setLocalItem('muhiba_teacher_profile', result);
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
  setLocalItem('muhiba_teacher_profile', updated);

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
        setLocalItem('smk_classes', classes);
        return classes;
      }
    } catch (e) {
      console.warn('Supabase classes fetch notice, using local classes:', e);
    }
  }

  // Fallback to local storage
  let localClasses = getLocalItem<ClassRoom[]>('smk_classes', []);
  if (localClasses.length === 0) {
    localClasses = [...DEFAULT_CLASSES];
    setLocalItem('smk_classes', localClasses);
  }
  return localClasses;
}

export async function createClass(cls: ClassRoom): Promise<ClassRoom> {
  const localClasses = getLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = [...localClasses.filter((c) => c.id !== cls.id), cls];
  setLocalItem('smk_classes', updatedClasses);

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
  const localClasses = getLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = localClasses.map((c) => (c.id === cls.id ? cls : c));
  setLocalItem('smk_classes', updatedClasses);

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
  const localClasses = getLocalItem<ClassRoom[]>('smk_classes', DEFAULT_CLASSES);
  const updatedClasses = localClasses.filter((c) => c.id !== classId);
  setLocalItem('smk_classes', updatedClasses);

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


// ============================================================================
// 3. STUDENTS SERVICE & RESEQUENCING
// ============================================================================

/**
 * Urutkan dan sesuaikan nomor absen murid berdasarkan abjad nama (A-Z).
 * Menjamin nomor absen otomatis berurutan dari 1 sampai N tanpa jeda jika ada siswa ditambah atau dihapus.
 * Menghilangkan nomor absen yang kosong / acak secara otomatis (contoh: 1-10 dihapus no 6, maka no 7 otomatis jadi 6).
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
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('students').select('*');
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
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

        // Update local store for offline use
        const existingLocal = getLocalItem<Student[]>('smk_students', DEFAULT_STUDENTS);
        const merged = classId
          ? [...existingLocal.filter((s) => s.classId !== classId), ...resequenced]
          : resequenced;
        setLocalItem('smk_students', merged);

        return resequenced;
      }
    } catch (e) {
      console.warn('Supabase students fetch notice, using local students:', e);
    }
  }

  // Fallback local storage
  let localStudents = getLocalItem<Student[]>('smk_students', []);
  if (localStudents.length === 0) {
    localStudents = [...DEFAULT_STUDENTS];
    setLocalItem('smk_students', localStudents);
  }

  const filtered = classId ? localStudents.filter((s) => s.classId === classId) : localStudents;
  return resequenceStudentsAlphabetically(filtered, classId);
}

export async function createStudent(std: Student): Promise<Student> {
  const id = std.id || `std_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newStd = { ...std, id };

  const localStudents = getLocalItem<Student[]>('smk_students', DEFAULT_STUDENTS);
  const updated = [...localStudents.filter((s) => s.id !== id), newStd];
  const resequenced = resequenceStudentsAlphabetically(updated, std.classId);
  setLocalItem('smk_students', resequenced);

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
      console.warn('Could not sync student to cloud, saved locally:', e);
    }
  }

  return resequenced.find((s) => s.id === id) || newStd;
}

export async function updateStudent(std: Student): Promise<Student> {
  const localStudents = getLocalItem<Student[]>('smk_students', DEFAULT_STUDENTS);
  const updated = localStudents.map((s) => (s.id === std.id ? std : s));
  const resequenced = resequenceStudentsAlphabetically(updated, std.classId);
  setLocalItem('smk_students', resequenced);

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
  const localStudents = getLocalItem<Student[]>('smk_students', DEFAULT_STUDENTS);
  const target = localStudents.find((s) => s.id === studentId);
  const classId = target?.classId;

  const remaining = localStudents.filter((s) => s.id !== studentId);
  const resequenced = classId ? resequenceStudentsAlphabetically(remaining, classId) : remaining;
  setLocalItem('smk_students', resequenced);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('students').delete().eq('id', studentId);
      if (classId) {
        const classRemaining = resequenced.filter((s) => s.classId === classId);
        await batchInsertStudents(classRemaining);
      }
    } catch (e) {
      console.warn('Could not sync deleteStudent to cloud:', e);
    }
  }
}

export async function batchInsertStudents(studentsList: Student[]): Promise<void> {
  if (studentsList.length === 0) return;

  const localStudents = getLocalItem<Student[]>('smk_students', DEFAULT_STUDENTS);
  const ids = new Set(studentsList.map((s) => s.id));
  const others = localStudents.filter((s) => !ids.has(s.id));
  const merged = [...others, ...studentsList];
  setLocalItem('smk_students', merged);

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
      console.warn('Could not sync batch students to cloud, saved locally:', e);
    }
  }
}

// ============================================================================
// 4. ATTENDANCE SESSIONS SERVICE
// ============================================================================

export async function getAttendanceSessions(classId?: string): Promise<AttendanceSession[]> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('attendance_sessions').select('*').order('tanggal', { ascending: false });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const sessions: AttendanceSession[] = data.map((row: any) => ({
          id: row.id,
          classId: row.class_id,
          tanggal: row.tanggal,
          pertemuanKe: Number(row.pertemuan_ke),
          topikMateri: row.topik_materi || '',
          records: row.records || {},
        }));

        const existingLocal = getLocalItem<AttendanceSession[]>('smk_attendance', DEFAULT_ATTENDANCE_SESSIONS);
        const merged = classId
          ? [...existingLocal.filter((s) => s.classId !== classId), ...sessions]
          : sessions;
        setLocalItem('smk_attendance', merged);

        return sessions;
      }
    } catch (e) {
      console.warn('Supabase attendance fetch notice, using local attendance:', e);
    }
  }

  // Fallback local storage
  let localAttendance = getLocalItem<AttendanceSession[]>('smk_attendance', []);
  if (localAttendance.length === 0) {
    localAttendance = [...DEFAULT_ATTENDANCE_SESSIONS];
    setLocalItem('smk_attendance', localAttendance);
  }

  if (classId) {
    return localAttendance.filter((s) => s.classId === classId);
  }
  return localAttendance;
}

export async function saveAttendanceSession(session: AttendanceSession): Promise<AttendanceSession> {
  const localAttendance = getLocalItem<AttendanceSession[]>('smk_attendance', DEFAULT_ATTENDANCE_SESSIONS);
  const updated = [...localAttendance.filter((s) => s.id !== session.id), session];
  setLocalItem('smk_attendance', updated);

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
      console.warn('Could not sync attendance session to cloud, saved locally:', e);
    }
  }

  return session;
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const localAttendance = getLocalItem<AttendanceSession[]>('smk_attendance', DEFAULT_ATTENDANCE_SESSIONS);
  const updated = localAttendance.filter((s) => s.id !== sessionId);
  setLocalItem('smk_attendance', updated);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('attendance_sessions').delete().eq('id', sessionId);
    } catch (e) {
      console.warn('Could not sync delete attendance to cloud:', e);
    }
  }
}

// ============================================================================
// 5. STUDENT GRADES SERVICE
// ============================================================================

export async function getStudentGrades(classId?: string): Promise<StudentGrade[]> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('student_grades').select('*');
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
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

        const existingLocal = getLocalItem<StudentGrade[]>('smk_grades', DEFAULT_GRADES);
        const merged = classId
          ? [...existingLocal.filter((g) => g.classId !== classId), ...grades]
          : grades;
        setLocalItem('smk_grades', merged);

        return grades;
      }
    } catch (e) {
      console.warn('Supabase grades fetch notice, using local grades:', e);
    }
  }

  // Fallback local storage
  let localGrades = getLocalItem<StudentGrade[]>('smk_grades', []);
  if (localGrades.length === 0) {
    localGrades = [...DEFAULT_GRADES];
    setLocalItem('smk_grades', localGrades);
  }

  if (classId) {
    return localGrades.filter((g) => g.classId === classId);
  }
  return localGrades;
}

export async function saveStudentGrade(grade: StudentGrade): Promise<StudentGrade> {
  const localGrades = getLocalItem<StudentGrade[]>('smk_grades', DEFAULT_GRADES);
  const updated = [...localGrades.filter((g) => g.id !== grade.id), grade];
  setLocalItem('smk_grades', updated);

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
      console.warn('Could not sync grade to cloud, saved locally:', e);
    }
  }

  return grade;
}

export async function batchUpsertStudentGrades(gradesList: StudentGrade[]): Promise<void> {
  if (gradesList.length === 0) return;

  const localGrades = getLocalItem<StudentGrade[]>('smk_grades', DEFAULT_GRADES);
  const ids = new Set(gradesList.map((g) => g.id));
  const others = localGrades.filter((g) => !ids.has(g.id));
  const merged = [...others, ...gradesList];
  setLocalItem('smk_grades', merged);

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
      console.warn('Could not sync batch grades to cloud, saved locally:', e);
    }
  }
}

// ============================================================================
// 6. GRADE COLUMNS SERVICE
// ============================================================================

export { getLocalGradeColumns, setLocalGradeColumns, DEFAULT_GRADE_COLUMNS };

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

// ============================================================================
// 7. TEACHING AGENDAS SERVICE
// ============================================================================

export async function getTeachingAgendas(classId?: string): Promise<TeachingAgenda[]> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('teaching_agendas').select('*').order('tanggal', { ascending: false });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
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

        setLocalItem('smk_agendas', agendas);
        return agendas;
      }
    } catch (e) {
      console.warn('Supabase agendas fetch notice, using local agendas:', e);
    }
  }

  // Fallback local storage
  let localAgendas = getLocalItem<TeachingAgenda[]>('smk_agendas', []);
  if (localAgendas.length === 0) {
    localAgendas = [...DEFAULT_AGENDAS];
    setLocalItem('smk_agendas', localAgendas);
  }

  if (classId) {
    return localAgendas.filter((a) => a.classId === classId);
  }
  return localAgendas;
}

export async function saveTeachingAgenda(agenda: TeachingAgenda): Promise<TeachingAgenda> {
  const localAgendas = getLocalItem<TeachingAgenda[]>('smk_agendas', DEFAULT_AGENDAS);
  const updated = [...localAgendas.filter((a) => a.id !== agenda.id), agenda];
  setLocalItem('smk_agendas', updated);

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
      console.warn('Could not sync teaching agenda to cloud, saved locally:', e);
    }
  }

  return agenda;
}

export async function deleteTeachingAgenda(agendaId: string): Promise<void> {
  const localAgendas = getLocalItem<TeachingAgenda[]>('smk_agendas', DEFAULT_AGENDAS);
  const updated = localAgendas.filter((a) => a.id !== agendaId);
  setLocalItem('smk_agendas', updated);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('teaching_agendas').delete().eq('id', agendaId);
    } catch (e) {
      console.warn('Could not sync delete agenda to cloud:', e);
    }
  }
}

/**
 * Sinkronisasi instan & otomatis dari penginputan absen ke Agenda Mengajar Pendidik.
 * Menghitung hadir, sakit, izin, alpa, serta rangkuman catatan murid secara otomatis.
 */
export async function syncAttendanceSessionToAgenda(
  session: AttendanceSession,
  classRoom?: ClassRoom,
  teacher?: TeacherProfile,
  students: Student[] = []
): Promise<TeachingAgenda> {
  const localAgendas = getLocalItem<TeachingAgenda[]>('smk_agendas', DEFAULT_AGENDAS);

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

  // Hari dalam bahasa Indonesia
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

  // Cari apakah agenda untuk kelas dan tanggal atau pertemuan ini sudah ada
  const linkedId = `ag_att_${session.id}`;
  let existing = localAgendas.find((a) => a.id === linkedId);
  if (!existing) {
    existing = localAgendas.find((a) => a.classId === session.classId && a.tanggal === session.tanggal);
  }
  if (!existing) {
    existing = localAgendas.find((a) => a.classId === session.classId && a.pertemuanKe === session.pertemuanKe);
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

/**
 * Menyimpan banyak entri agenda sekaligus (Batch Save dari parser Excel)
 */
export async function batchSaveTeachingAgendas(agendas: TeachingAgenda[]): Promise<TeachingAgenda[]> {
  const localAgendas = getLocalItem<TeachingAgenda[]>('smk_agendas', DEFAULT_AGENDAS);
  const newMap = new Map<string, TeachingAgenda>();
  localAgendas.forEach((a) => newMap.set(a.id, a));
  agendas.forEach((a) => newMap.set(a.id, a));
  const merged = Array.from(newMap.values());
  setLocalItem('smk_agendas', merged);

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
      console.warn('Could not batch sync teaching agendas to cloud, saved locally:', e);
    }
  }

  return merged;
}

// ============================================================================
// 8. SAVING TRANSACTIONS SERVICE
// ============================================================================

export async function getSavingTransactions(classId?: string): Promise<SavingTransaction[]> {
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('saving_transactions').select('*').order('tanggal', { ascending: false });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (!error && data) {
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
        setLocalItem('smk_savings', txs);
        return txs;
      }
    } catch (e) {
      console.warn('Supabase savings fetch notice, using local savings:', e);
    }
  }

  const localSavings = getLocalItem<SavingTransaction[]>('smk_savings', []);
  if (classId) {
    return localSavings.filter((s) => s.classId === classId);
  }
  return localSavings;
}

export async function saveSavingTransaction(tx: SavingTransaction): Promise<SavingTransaction> {
  const localSavings = getLocalItem<SavingTransaction[]>('smk_savings', []);
  const updated = [...localSavings.filter((s) => s.id !== tx.id), tx];
  setLocalItem('smk_savings', updated);

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
      console.warn('Could not sync saving tx to cloud, saved locally:', e);
    }
  }

  return tx;
}

export async function deleteSavingTransaction(txId: string): Promise<void> {
  const localSavings = getLocalItem<SavingTransaction[]>('smk_savings', []);
  const updated = localSavings.filter((s) => s.id !== txId);
  setLocalItem('smk_savings', updated);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('saving_transactions').delete().eq('id', txId);
    } catch (e) {
      console.warn('Could not sync delete saving tx to cloud:', e);
    }
  }
}

// ============================================================================
// 9. PUBLIC SHARE SERVICE
// ============================================================================

export function maskNisn(nisn?: string | null): string {
  if (!nisn) return '';
  const str = String(nisn).trim();
  if (str.length <= 4) return str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

export function sanitizePublicStudent(student: any): any {
  if (!student || typeof student !== 'object') return student;
  const {
    noHpOrangTua,
    catatanUmum,
    no_hp_orang_tua,
    catatan_umum,
    nisn,
    ...rest
  } = student;

  return {
    ...rest,
    nisn: maskNisn(nisn),
  };
}

export async function createOrUpdatePublicShare(record: PublicShareRecord): Promise<string | null> {
  const content = record.payload || record.data || {};
  const strippedClassId = record.id.replace(/^(att_share_|grade_share_|nilai_share_|sav_share_|tabungan_share_|age_share_|agenda_share_|share_)/, '');
  const extractedClassId =
    record.classId ||
    (content as any).classId ||
    (strippedClassId !== record.id ? strippedClassId : undefined);

  const fullPayload = {
    id: record.id,
    type: record.type,
    classId: extractedClassId,
    title: record.title || 'Data Publik SMK Muhammadiyah Bawang',
    data: {
      ...content,
      classId: extractedClassId,
    },
    payload: {
      ...content,
      classId: extractedClassId,
    },
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  SafeCache.set(`pub_share_${record.id}`, fullPayload);
  try {
    localStorage.setItem(`pub_share_${record.id}`, JSON.stringify(fullPayload));
    if (extractedClassId) {
      localStorage.setItem(`pub_share_${record.type}_${extractedClassId}`, JSON.stringify(fullPayload));
      localStorage.setItem(`pub_share_class_${extractedClassId}`, JSON.stringify(fullPayload));
      if (record.type === 'nilai') {
        localStorage.setItem(`pub_share_grade_share_${extractedClassId}`, JSON.stringify(fullPayload));
        localStorage.setItem(`pub_share_nilai_share_${extractedClassId}`, JSON.stringify(fullPayload));
      } else if (record.type === 'tabungan') {
        localStorage.setItem(`pub_share_sav_share_${extractedClassId}`, JSON.stringify(fullPayload));
        localStorage.setItem(`pub_share_tabungan_share_${extractedClassId}`, JSON.stringify(fullPayload));
      } else if (record.type === 'absen') {
        localStorage.setItem(`pub_share_att_share_${extractedClassId}`, JSON.stringify(fullPayload));
        localStorage.setItem(`pub_share_absen_share_${extractedClassId}`, JSON.stringify(fullPayload));
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('public_share_updated', {
        detail: { id: record.id, type: record.type, classId: extractedClassId }
      }));
    } catch {}
  }

  let retrievedToken: string | null = null;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      const user = await getAuthUser();
      const row: any = {
        id: record.id,
        type: record.type,
        title: record.title || 'Data Publik SMK Muhammadiyah Bawang',
        payload: {
          ...content,
          classId: extractedClassId,
        },
        updated_at: new Date().toISOString(),
      };
      if (user?.id) {
        row.user_id = user.id;
      }
      if (extractedClassId) {
        row.class_id = extractedClassId;
      }
      await supabase.from('public_shares').upsert(row, { onConflict: 'id' });

      // Ambil share_token baris tersebut
      const { data: tokenRow } = await supabase
        .from('public_shares')
        .select('share_token')
        .eq('id', record.id)
        .maybeSingle();

      if (tokenRow?.share_token) {
        const tok = tokenRow.share_token;
        retrievedToken = tok;
        (record as any).share_token = tok;
        SafeCache.set(`pub_share_token_${record.id}`, tok);
        try {
          localStorage.setItem(`pub_share_token_${record.id}`, tok);
        } catch {}
      }
    } catch (err: any) {
      console.warn('Could not upsert public share to Supabase:', err.message);
    }
  }

  return retrievedToken;
}

export async function getPublicShareToken(shareId: string): Promise<string | null> {
  const cached = SafeCache.get<string>(`pub_share_token_${shareId}`);
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(`pub_share_token_${shareId}`);
    if (stored) return stored;
  } catch {}

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('public_shares')
        .select('share_token')
        .eq('id', shareId)
        .maybeSingle();
      if (data?.share_token) {
        SafeCache.set(`pub_share_token_${shareId}`, data.share_token);
        try {
          localStorage.setItem(`pub_share_token_${shareId}`, data.share_token);
        } catch {}
        return data.share_token;
      }
    } catch {}
  }
  return null;
}

export async function getPublicShare(
  shareId: string,
  since?: string | null
): Promise<PublicShareRecord | null> {
  const strippedClassId = shareId.replace(/^(att_share_|grade_share_|nilai_share_|sav_share_|tabungan_share_|age_share_|agenda_share_|share_)/, '');
  const candidateIds = Array.from(new Set([
    shareId,
    shareId.replace(/^nilai_/, 'grade_'),
    shareId.replace(/^grade_/, 'nilai_'),
    shareId.replace(/^tabungan_/, 'sav_'),
    shareId.replace(/^sav_/, 'tabungan_'),
    `grade_share_${strippedClassId}`,
    `nilai_share_${strippedClassId}`,
    `sav_share_${strippedClassId}`,
    `tabungan_share_${strippedClassId}`,
    `att_share_${strippedClassId}`,
    `absen_share_${strippedClassId}`,
    `agenda_share_${strippedClassId}`,
    strippedClassId,
  ])).filter(Boolean);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    // 1. Prioritas: Coba panggil RPC get_public_share terlebih dahulu
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_share', {
        p_key: shareId,
        p_since: since || null,
      });

      if (!rpcError && rpcData) {
        // Respons unchanged dari server untuk hemat bandwidth
        if (rpcData.unchanged === true) {
          return {
            id: shareId,
            type: 'nilai',
            title: '',
            payload: { unchanged: true },
            data: { unchanged: true },
          };
        }

        const payloadData = rpcData.payload || {};
        const extractedClassId =
          rpcData.class_id ||
          payloadData.classId ||
          (strippedClassId !== rpcData.id ? strippedClassId : undefined);

        const rec: PublicShareRecord = {
          id: rpcData.id,
          type: rpcData.type,
          classId: extractedClassId,
          title: rpcData.title,
          data: payloadData,
          payload: payloadData,
          created_at: rpcData.created_at,
          updated_at: rpcData.updated_at,
        };

        if (rpcData.share_token) {
          (rec as any).share_token = rpcData.share_token;
          SafeCache.set(`pub_share_token_${rec.id}`, rpcData.share_token);
          try {
            localStorage.setItem(`pub_share_token_${rec.id}`, rpcData.share_token);
          } catch {}
        }

        candidateIds.forEach((cid) => {
          SafeCache.set(`pub_share_${cid}`, rec);
          try {
            localStorage.setItem(`pub_share_${cid}`, JSON.stringify(rec));
          } catch {}
        });

        return rec;
      }
    } catch (rpcErr) {
      console.warn('RPC get_public_share notice:', rpcErr);
    }
  }

  // Fallback to cache / localStorage if offline or Supabase is not available
  for (const cid of candidateIds) {
    const cached = SafeCache.get<PublicShareRecord>(`pub_share_${cid}`);
    if (cached) return cached;
    const raw = getLocalItem<PublicShareRecord | null>(`pub_share_${cid}`, null);
    if (raw) {
      SafeCache.set(`pub_share_${cid}`, raw);
      return raw;
    }
  }

  if (strippedClassId && strippedClassId !== shareId) {
    for (const t of ['absen', 'nilai', 'tabungan', 'agenda']) {
      const byClass = getLocalItem<PublicShareRecord | null>(`pub_share_${t}_${strippedClassId}`, null);
      if (byClass) return byClass;
    }
    const genericByClass = getLocalItem<PublicShareRecord | null>(`pub_share_class_${strippedClassId}`, null);
    if (genericByClass) return genericByClass;
  }

  const classMatch = shareId.match(/class_[a-zA-Z0-9_-]+/);
  if (classMatch) {
    const classId = classMatch[0];
    for (const t of ['absen', 'nilai', 'tabungan', 'agenda']) {
      const byClass = getLocalItem<PublicShareRecord | null>(`pub_share_${t}_${classId}`, null);
      if (byClass) return byClass;
    }
  }

  return null;
}

export async function syncPublicAttendanceShare(params: {
  classRoom?: ClassRoom;
  students?: Student[];
  sessions: AttendanceSession[];
  teacher?: TeacherProfile;
}): Promise<void> {
  const { classRoom, students = [], sessions, teacher } = params;
  const classId = classRoom?.id || sessions[0]?.classId;
  if (!classId) return;

  const effectiveStudents = students.filter((s) => s.classId === classId);
  const effectiveSessions = sessions.filter((s) => s.classId === classId);
  const sanitizedStudents = effectiveStudents.map(sanitizePublicStudent);

  const shareRecord: PublicShareRecord = {
    id: `att_share_${classId}`,
    type: 'absen',
    classId: classId,
    title: `Presensi Murid Kelas ${classRoom?.namaKelas || 'Kelas'} - ${teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      className: classRoom?.namaKelas || 'Kelas',
      subject: classRoom?.mataPelajaran || 'Mata Pelajaran',
      teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      teacherName: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      teacherNip: '',
      teacherNbm: teacher?.nbm || '',
      school: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      namaKepalaSekolah: teacher?.namaKepalaSekolah || '',
      nipKepalaSekolah: '',
      nbmKepalaSekolah: teacher?.nbmKepalaSekolah || '',
      tahunAjaran: teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
      semester: teacher?.semester || SCHOOL_CONFIG.semester,
      students: sanitizedStudents,
      sessions: effectiveSessions,
    },
    payload: {
      className: classRoom?.namaKelas || 'Kelas',
      subject: classRoom?.mataPelajaran || 'Mata Pelajaran',
      teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      teacherName: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      teacherNip: '',
      teacherNbm: teacher?.nbm || '',
      school: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      namaKepalaSekolah: teacher?.namaKepalaSekolah || '',
      nipKepalaSekolah: '',
      nbmKepalaSekolah: teacher?.nbmKepalaSekolah || '',
      tahunAjaran: teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
      semester: teacher?.semester || SCHOOL_CONFIG.semester,
      students: sanitizedStudents,
      sessions: effectiveSessions,
    },
  };

  await createOrUpdatePublicShare(shareRecord);
}

export async function syncPublicGradesShare(params: {
  classRoom?: ClassRoom;
  students?: Student[];
  grades: StudentGrade[];
  gradeColumns?: GradeColumn[];
  teacher?: TeacherProfile;
}): Promise<void> {
  const { classRoom, students = [], grades, gradeColumns = [], teacher } = params;
  const classId = classRoom?.id || grades[0]?.classId;
  if (!classId) return;

  let effectiveStudents = students.filter((s) => s.classId === classId);
  if (effectiveStudents.length === 0) {
    try {
      effectiveStudents = await getStudents(classId);
    } catch {}
  }
  const sanitizedStudents = effectiveStudents.map(sanitizePublicStudent);
  const effectiveGrades = grades.filter((g) => g.classId === classId);
  let effectiveColumns = gradeColumns;
  if (!effectiveColumns || effectiveColumns.length === 0) {
    try {
      effectiveColumns = await getGradeColumns(classId);
    } catch {}
  }

  const payloadData = {
    className: classRoom?.namaKelas || 'Kelas',
    subject: classRoom?.mataPelajaran || 'Mata Pelajaran',
    kkm: classRoom?.kkm || 75,
    teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
    teacherName: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
    teacherNip: '',
    teacherNbm: teacher?.nbm || '',
    school: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
    namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
    namaKepalaSekolah: teacher?.namaKepalaSekolah || '',
    nipKepalaSekolah: '',
    nbmKepalaSekolah: teacher?.nbmKepalaSekolah || '',
    tahunAjaran: teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
    semester: teacher?.semester || SCHOOL_CONFIG.semester,
    students: sanitizedStudents,
    grades: effectiveGrades,
    gradeColumns: effectiveColumns,
    shareType: 'nilai',
  };

  const shareRecord: PublicShareRecord = {
    id: `grade_share_${classId}`,
    type: 'nilai',
    classId: classId,
    title: `Rekapitulasi Nilai Murid Kelas ${classRoom?.namaKelas || 'Kelas'} - ${teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: payloadData,
    payload: payloadData,
  };

  await createOrUpdatePublicShare(shareRecord);
}

export async function syncPublicAgendasShare(params: {
  agendas: TeachingAgenda[];
  classRoom?: ClassRoom;
  teacher?: TeacherProfile;
}): Promise<void> {
  const { agendas, classRoom, teacher } = params;
  const shareRecord: PublicShareRecord = {
    id: classRoom?.id ? `agenda_share_${classRoom.id}` : 'agenda_share_all',
    type: 'agenda',
    classId: classRoom?.id,
    title: `Agenda Mengajar Pendidik - ${teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      className: classRoom?.namaKelas || 'Semua Kelas',
      agendas,
      teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      shareType: 'agenda',
    },
    payload: {
      className: classRoom?.namaKelas || 'Semua Kelas',
      agendas,
      teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
      namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
      shareType: 'agenda',
    },
  };

  await createOrUpdatePublicShare(shareRecord);
}

export async function syncPublicSavingsShare(params: {
  classRoom?: ClassRoom;
  students?: Student[];
  transactions: SavingTransaction[];
  teacher?: TeacherProfile;
}): Promise<void> {
  const { classRoom, students = [], transactions, teacher } = params;
  const classId = classRoom?.id || transactions[0]?.classId;
  if (!classId) return;

  let effectiveStudents = students.filter((s) => s.classId === classId);
  if (effectiveStudents.length === 0) {
    try {
      effectiveStudents = await getStudents(classId);
    } catch {}
  }
  const effectiveTransactions = transactions.filter((t) => t.classId === classId);

  // Kalkulasi total kas kelas
  const classTxList = effectiveTransactions;
  const classCashBalance = classTxList
    .filter((tx) => tx.isClassCash)
    .reduce((acc, tx) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)), 0);
  const totalCashIn = classTxList
    .filter((tx) => tx.isClassCash && tx.tipe === 'masuk')
    .reduce((acc, tx) => acc + Number(tx.jumlah || 0), 0);
  const totalCashOut = classTxList
    .filter((tx) => tx.isClassCash && tx.tipe === 'keluar')
    .reduce((acc, tx) => acc + Number(tx.jumlah || 0), 0);
  const cashTransactions = classTxList.filter((tx) => tx.isClassCash);

  // Hitung saldo tabungan dan tanggal input mutasi per siswa
  const studentBalances: Record<string, number> = {};
  const studentLatestDateMap: Record<string, string> = {};

  effectiveStudents.forEach((std) => {
    const stdTxs = classTxList
      .filter((tx) => !tx.isClassCash && tx.studentId === std.id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    studentBalances[std.id] = stdTxs.reduce(
      (acc, tx) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)),
      0
    );
    if (stdTxs.length > 0) {
      studentLatestDateMap[std.id] = stdTxs[0].tanggal;
    }
  });

  const detailedTransactions = classTxList.map((tx) => {
    const std = effectiveStudents.find((s) => s.id === tx.studentId);
    return {
      ...tx,
      namaMurid: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : '-',
      namaSiswa: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : '-',
    };
  });

  const studentsWithDatesAndBalances = effectiveStudents.map((s) => ({
    ...s,
    saldo: studentBalances[s.id] ?? (s as any).saldo ?? 0,
    tanggalInput: studentLatestDateMap[s.id] || (s as any).tanggalInput || '',
    lastTransactionDate: studentLatestDateMap[s.id] || (s as any).lastTransactionDate || '',
  }));

  const sanitizedStudents = studentsWithDatesAndBalances.map(sanitizePublicStudent);

  const payloadData = {
    className: classRoom?.namaKelas || 'Kelas',
    classCashBalance,
    totalCashIn,
    totalCashOut,
    cashTransactions,
    transactions: detailedTransactions,
    allTransactions: detailedTransactions,
    students: sanitizedStudents,
    teacher: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
    teacherName: teacher?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
    teacherNip: '',
    teacherNbm: teacher?.nbm || '',
    school: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
    namaSekolah: teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
    namaKepalaSekolah: teacher?.namaKepalaSekolah || '',
    nipKepalaSekolah: '',
    nbmKepalaSekolah: teacher?.nbmKepalaSekolah || '',
    tahunAjaran: teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
    semester: teacher?.semester || SCHOOL_CONFIG.semester,
    shareType: 'tabungan',
  };

  const shareRecord: PublicShareRecord = {
    id: `sav_share_${classId}`,
    type: 'tabungan',
    classId: classId,
    title: `Laporan Keuangan & Tabungan Kelas ${classRoom?.namaKelas || 'Kelas'} - ${teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: payloadData,
    payload: payloadData,
  };

  await createOrUpdatePublicShare(shareRecord);
}
