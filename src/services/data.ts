import { getSupabaseClient, getAuthUser } from './supabase';
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
// 1. TEACHER PROFILE SERVICE
// ============================================================================

export async function getTeacherProfile(): Promise<TeacherProfile | null> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching teacher profile:', error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    namaGuru: data.nama_guru,
    nip: data.nip || '',
    nbm: data.nbm || '',
    namaSekolah: data.nama_sekolah || 'SMK Muhammadiyah Bawang',
    mataPelajaranUtama: data.mata_pelajaran_utama || 'Konsentrasi Keahlian TKJ',
    tahunAjaran: data.tahun_ajaran || '2025/2026',
    semester: (data.semester as 'Ganjil' | 'Genap') || 'Genap',
    email: data.email || user.email || '',
    avatarUrl: data.avatar_url,
    activeClassId: data.active_class_id,
    isLoggedIn: true,
  };
}

export async function createOrUpdateTeacherProfile(
  profile: Partial<TeacherProfile>
): Promise<TeacherProfile> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum terautentikasi');

  const profileId = profile.id || `teacher_${user.id.slice(0, 8)}`;
  const payload = {
    id: profileId,
    user_id: user.id,
    nama_guru: profile.namaGuru || user.user_metadata?.nama_guru || 'Guru SMK Muhammadiyah Bawang',
    nip: profile.nip || '',
    nbm: profile.nbm || '',
    nama_sekolah: profile.namaSekolah || 'SMK Muhammadiyah Bawang',
    mata_pelajaran_utama: profile.mataPelajaranUtama || 'Konsentrasi Keahlian TKJ',
    tahun_ajaran: profile.tahunAjaran || '2025/2026',
    semester: profile.semester || 'Genap',
    email: user.email || profile.email || '',
    avatar_url: profile.avatarUrl || '',
    active_class_id: profile.activeClassId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('teacher_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving teacher profile:', error);
    throw error;
  }

  return {
    id: data.id,
    namaGuru: data.nama_guru,
    nip: data.nip || '',
    nbm: data.nbm || '',
    namaSekolah: data.nama_sekolah,
    mataPelajaranUtama: data.mata_pelajaran_utama,
    tahunAjaran: data.tahun_ajaran,
    semester: data.semester as 'Ganjil' | 'Genap',
    email: data.email,
    avatarUrl: data.avatar_url,
    activeClassId: data.active_class_id,
    isLoggedIn: true,
  };
}

// ============================================================================
// 2. CLASSES SERVICE
// ============================================================================

export async function getClasses(): Promise<ClassRoom[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    namaKelas: row.nama_kelas,
    mataPelajaran: row.mata_pelajaran,
    kkm: Number(row.kkm) || 75,
    jurusan: row.jurusan || '',
    keterangan: row.keterangan || '',
    createdAt: row.created_at,
  }));
}

export async function createClass(cls: ClassRoom): Promise<ClassRoom> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

  const { data, error } = await supabase
    .from('classes')
    .insert({
      id: cls.id,
      user_id: user.id,
      nama_kelas: cls.namaKelas,
      mata_pelajaran: cls.mataPelajaran,
      kkm: cls.kkm,
      jurusan: cls.jurusan || '',
      keterangan: cls.keterangan || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating class:', error);
    throw error;
  }

  return {
    id: data.id,
    namaKelas: data.nama_kelas,
    mataPelajaran: data.mata_pelajaran,
    kkm: Number(data.kkm),
    jurusan: data.jurusan,
    keterangan: data.keterangan,
    createdAt: data.created_at,
  };
}

export async function updateClass(cls: ClassRoom): Promise<ClassRoom> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('classes')
    .update({
      nama_kelas: cls.namaKelas,
      mata_pelajaran: cls.mataPelajaran,
      kkm: cls.kkm,
      jurusan: cls.jurusan || '',
      keterangan: cls.keterangan || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cls.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating class:', error);
    throw error;
  }

  return {
    id: data.id,
    namaKelas: data.nama_kelas,
    mataPelajaran: data.mata_pelajaran,
    kkm: Number(data.kkm),
    jurusan: data.jurusan,
    keterangan: data.keterangan,
    createdAt: data.created_at,
  };
}

export async function deleteClass(classId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
}

// ============================================================================
// 3. STUDENTS SERVICE
// ============================================================================

export async function getStudents(classId?: string): Promise<Student[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('students').select('*').order('no', { ascending: true });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    classId: row.class_id,
    no: Number(row.no),
    nisn: row.nisn || '',
    nama: row.nama,
    gender: row.gender as 'L' | 'P',
    catatanUmum: row.catatan_umum || '',
    noHpOrangTua: row.no_hp_orang_tua || '',
  }));
}

export async function createStudent(std: Student): Promise<Student> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .insert({
      id: std.id,
      class_id: std.classId,
      no: std.no,
      nisn: std.nisn,
      nama: std.nama,
      gender: std.gender,
      catatan_umum: std.catatanUmum || '',
      no_hp_orang_tua: std.noHpOrangTua || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  return {
    id: data.id,
    classId: data.class_id,
    no: Number(data.no),
    nisn: data.nisn || '',
    nama: data.nama,
    gender: data.gender,
    catatanUmum: data.catatan_umum,
    noHpOrangTua: data.no_hp_orang_tua,
  };
}

export async function updateStudent(std: Student): Promise<Student> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .update({
      no: std.no,
      nisn: std.nisn,
      nama: std.nama,
      gender: std.gender,
      catatan_umum: std.catatanUmum || '',
      no_hp_orang_tua: std.noHpOrangTua || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', std.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  return {
    id: data.id,
    classId: data.class_id,
    no: Number(data.no),
    nisn: data.nisn || '',
    nama: data.nama,
    gender: data.gender,
    catatanUmum: data.catatan_umum,
    noHpOrangTua: data.no_hp_orang_tua,
  };
}

export async function deleteStudent(studentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

export async function batchInsertStudents(students: Student[]): Promise<void> {
  if (students.length === 0) return;
  const supabase = getSupabaseClient();

  const rows = students.map((std) => ({
    id: std.id,
    class_id: std.classId,
    no: std.no,
    nisn: std.nisn,
    nama: std.nama,
    gender: std.gender,
    catatan_umum: std.catatanUmum || '',
    no_hp_orang_tua: std.noHpOrangTua || '',
  }));

  const { error } = await supabase.from('students').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Error batch inserting students:', error);
    throw error;
  }
}

// ============================================================================
// 4. ATTENDANCE SESSIONS SERVICE
// ============================================================================

export async function getAttendanceSessions(classId?: string): Promise<AttendanceSession[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('attendance_sessions')
    .select('*')
    .order('tanggal', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    classId: row.class_id,
    tanggal: row.tanggal,
    pertemuanKe: Number(row.pertemuan_ke),
    topikMateri: row.topik_materi || '',
    records: row.records || {},
  }));
}

export async function saveAttendanceSession(session: AttendanceSession): Promise<AttendanceSession> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

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

  const { data, error } = await supabase
    .from('attendance_sessions')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving attendance session:', error);
    throw error;
  }

  return {
    id: data.id,
    classId: data.class_id,
    tanggal: data.tanggal,
    pertemuanKe: Number(data.pertemuan_ke),
    topikMateri: data.topik_materi || '',
    records: data.records || {},
  };
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('attendance_sessions').delete().eq('id', sessionId);
  if (error) {
    console.error('Error deleting attendance session:', error);
    throw error;
  }
}

// ============================================================================
// 5. STUDENT GRADES SERVICE
// ============================================================================

export async function getStudentGrades(classId?: string): Promise<StudentGrade[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('student_grades').select('*');

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching grades:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
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
}

export async function saveStudentGrade(grade: StudentGrade): Promise<StudentGrade> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

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

  const { data, error } = await supabase
    .from('student_grades')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving grade:', error);
    throw error;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    classId: data.class_id,
    formatif1: data.formatif1 !== null ? Number(data.formatif1) : null,
    formatif2: data.formatif2 !== null ? Number(data.formatif2) : null,
    formatif3: data.formatif3 !== null ? Number(data.formatif3) : null,
    formatif4: data.formatif4 !== null ? Number(data.formatif4) : null,
    formatif5: data.formatif5 !== null ? Number(data.formatif5) : null,
    formatif6: data.formatif6 !== null ? Number(data.formatif6) : null,
    formatif7: data.formatif7 !== null ? Number(data.formatif7) : null,
    formatif8: data.formatif8 !== null ? Number(data.formatif8) : null,
    formatif9: data.formatif9 !== null ? Number(data.formatif9) : null,
    formatif10: data.formatif10 !== null ? Number(data.formatif10) : null,
    sumatifTengah: data.sumatif_tengah !== null ? Number(data.sumatif_tengah) : null,
    sumatifAkhir: data.sumatif_akhir !== null ? Number(data.sumatif_akhir) : null,
    catatan: data.catatan || '',
  };
}

// ============================================================================
// 6. GRADE COLUMNS SERVICE
// ============================================================================

export async function getGradeColumns(classId?: string): Promise<GradeColumn[]> {
  const supabase = getSupabaseClient();
  let query = supabase.from('grade_columns').select('*').order('created_at', { ascending: true });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching grade columns:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    // Return default 10 columns
    return Array.from({ length: 10 }, (_, i) => ({
      id: `col_f_${i + 1}`,
      key: `formatif${i + 1}`,
      label: `TP ${i + 1}`,
      keterangan: `Tujuan Pembelajaran ${i + 1}`,
    }));
  }

  return data.map((row: any) => ({
    id: row.id,
    key: row.key,
    label: row.label,
    tanggal: row.tanggal || undefined,
    keterangan: row.keterangan || '',
    bobot: row.bobot ? Number(row.bobot) : undefined,
  }));
}

export async function saveGradeColumns(
  columns: GradeColumn[],
  classId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

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

  const { error } = await supabase.from('grade_columns').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Error saving grade columns:', error);
    throw error;
  }
}

// ============================================================================
// 7. TEACHING AGENDAS SERVICE
// ============================================================================

export async function getTeachingAgendas(classId?: string): Promise<TeachingAgenda[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('teaching_agendas')
    .select('*')
    .order('tanggal', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching agendas:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    classId: row.class_id,
    tanggal: row.tanggal,
    hari: row.hari || '',
    jamKe: row.jam_ke || '',
    rentangJam: row.rentang_jam || '',
    materiAjar: row.materi_ajar,
    kegiatan: row.kegiatan || '',
    catatan: row.catatan || '',
    hadirCount: Number(row.hadir_count) || 0,
    tidakHadirCount: Number(row.tidak_hadir_count) || 0,
  }));
}

export async function saveTeachingAgenda(agenda: TeachingAgenda): Promise<TeachingAgenda> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

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

  const { data, error } = await supabase
    .from('teaching_agendas')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving agenda:', error);
    throw error;
  }

  return {
    id: data.id,
    classId: data.class_id,
    tanggal: data.tanggal,
    hari: data.hari,
    jamKe: data.jam_ke,
    rentangJam: data.rentang_jam,
    materiAjar: data.materi_ajar,
    kegiatan: data.kegiatan,
    catatan: data.catatan,
    hadirCount: Number(data.hadir_count),
    tidakHadirCount: Number(data.tidak_hadir_count),
  };
}

export async function deleteTeachingAgenda(agendaId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('teaching_agendas').delete().eq('id', agendaId);
  if (error) {
    console.error('Error deleting agenda:', error);
    throw error;
  }
}

// ============================================================================
// 8. SAVING TRANSACTIONS SERVICE
// ============================================================================

export async function getSavingTransactions(classId?: string): Promise<SavingTransaction[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('saving_transactions')
    .select('*')
    .order('tanggal', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching saving transactions:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
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
}

export async function saveSavingTransaction(tx: SavingTransaction): Promise<SavingTransaction> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();
  if (!user) throw new Error('User belum login');

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

  const { data, error } = await supabase
    .from('saving_transactions')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }

  return {
    id: data.id,
    classId: data.class_id,
    studentId: data.student_id || undefined,
    isClassCash: Boolean(data.is_class_cash),
    tanggal: data.tanggal,
    tipe: data.tipe as 'masuk' | 'keluar',
    jumlah: Number(data.jumlah),
    keterangan: data.keterangan,
    pencatat: data.pencatat,
  };
}

export async function deleteSavingTransaction(txId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('saving_transactions').delete().eq('id', txId);
  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

// ============================================================================
// 9. PUBLIC SHARES SERVICE
// ============================================================================

export async function createOrUpdatePublicShare(record: PublicShareRecord): Promise<void> {
  const supabase = getSupabaseClient();
  const user = await getAuthUser();

  const payload = {
    id: record.id,
    user_id: user?.id || null,
    class_id: record.classId,
    type: record.type,
    title: record.title,
    payload: record.data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('public_shares')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Error creating public share:', error);
    throw error;
  }
}

export async function getPublicShare(shareId: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('public_shares')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching public share:', error);
    return null;
  }

  return data ? data.payload : null;
}
