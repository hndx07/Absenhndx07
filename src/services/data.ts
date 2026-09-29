import { getSupabaseClient, getCurrentUser } from './supabase';
import {
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  TeachingAgenda,
  SavingTransaction,
  TeacherProfile,
  PublicShareRecord,
} from '../types';
import {
  getLocalTeacher,
  setLocalTeacher,
  getLocalClasses,
  setLocalClasses,
  getLocalStudents,
  setLocalStudents,
  getLocalSessions,
  setLocalSessions,
  getLocalGrades,
  setLocalGrades,
  getLocalAgendas,
  setLocalAgendas,
  getLocalSavings,
  setLocalSavings,
} from '../utils/storage';

export async function getClassDependencyCounts(classId: string) {
  const students = getLocalStudents().filter((s) => s.classId === classId);
  const sessions = getLocalSessions().filter((s) => s.classId === classId);
  const grades = getLocalGrades().filter((g) => g.classId === classId);
  return {
    studentsCount: students.length,
    attendanceCount: sessions.length,
    gradesCount: grades.length,
  };
}

// 1. Teacher Profile
export async function fetchTeacherProfile(): Promise<TeacherProfile> {
  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        const profile: TeacherProfile = {
          id: data.id,
          namaGuru: data.nama_guru,
          nip: data.nip || '',
          nbm: data.nbm || '',
          namaSekolah: data.nama_sekolah,
          mataPelajaranUtama: data.mata_pelajaran_utama,
          tahunAjaran: data.tahun_ajaran,
          semester: data.semester,
          email: data.email || user.email || '',
          avatarUrl: data.avatar_url,
          activeClassId: data.active_class_id,
        };
        setLocalTeacher(profile);
        return profile;
      }
    } catch (e) {
      console.warn('Fetch teacher profile fallback to local:', e);
    }
  }
  return getLocalTeacher();
}

export async function saveTeacherProfile(profile: TeacherProfile): Promise<void> {
  setLocalTeacher(profile);
  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('teacher_profiles').upsert({
        id: profile.id || `tp_${user.id}`,
        user_id: user.id,
        nama_guru: profile.namaGuru,
        nip: profile.nip,
        nbm: profile.nbm,
        nama_sekolah: profile.namaSekolah,
        mata_pelajaran_utama: profile.mataPelajaranUtama,
        tahun_ajaran: profile.tahunAjaran,
        semester: profile.semester,
        email: profile.email,
        active_class_id: profile.activeClassId,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save teacher profile error:', e);
    }
  }
}

// 2. Classes
export async function fetchClasses(): Promise<ClassRoom[]> {
  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      const { data, error } = await client
        .from('classes')
        .select('*')
        .order('nama_kelas', { ascending: true });

      if (data && !error && data.length > 0) {
        const mapped: ClassRoom[] = data.map((d: any) => ({
          id: d.id,
          namaKelas: d.nama_kelas,
          mataPelajaran: d.mata_pelajaran,
          kkm: d.kkm || 75,
          jurusan: d.jurusan || '',
          keterangan: d.keterangan || '',
          createdAt: d.created_at,
        }));
        setLocalClasses(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch classes fallback to local:', e);
    }
  }
  return getLocalClasses();
}

export async function saveClass(cls: ClassRoom): Promise<void> {
  const current = getLocalClasses();
  const idx = current.findIndex((c) => c.id === cls.id);
  let updated: ClassRoom[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = cls;
  } else {
    updated = [...current, cls];
  }
  setLocalClasses(updated);

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('classes').upsert({
        id: cls.id,
        user_id: user.id,
        nama_kelas: cls.namaKelas,
        mata_pelajaran: cls.mataPelajaran,
        kkm: cls.kkm,
        jurusan: cls.jurusan,
        keterangan: cls.keterangan,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save class error:', e);
    }
  }
}

export async function deleteClass(classId: string): Promise<void> {
  const updated = getLocalClasses().filter((c) => c.id !== classId);
  setLocalClasses(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('classes').delete().eq('id', classId);
    } catch (e) {
      console.warn('Supabase delete class error:', e);
    }
  }
}

// 3. Students
export async function fetchStudents(classId?: string): Promise<Student[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('students').select('*').order('no', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (data && !error && data.length > 0) {
        const mapped: Student[] = data.map((d: any) => ({
          id: d.id,
          classId: d.class_id,
          no: d.no,
          nisn: d.nisn || '',
          nama: d.nama,
          gender: d.gender || 'L',
          catatanUmum: d.catatan_umum || '',
          noHpOrangTua: d.no_hp_orang_tua || '',
          created_at: d.created_at,
        }));
        if (!classId) {
          setLocalStudents(mapped);
        }
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch students fallback to local:', e);
    }
  }
  const local = getLocalStudents();
  return classId ? local.filter((s) => s.classId === classId) : local;
}

export async function saveStudent(student: Student): Promise<void> {
  const current = getLocalStudents();
  const idx = current.findIndex((s) => s.id === student.id);
  let updated: Student[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = student;
  } else {
    updated = [...current, student];
  }
  setLocalStudents(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('students').upsert({
        id: student.id,
        class_id: student.classId,
        no: student.no,
        nisn: student.nisn,
        nama: student.nama,
        gender: student.gender,
        catatan_umum: student.catatanUmum,
        no_hp_orang_tua: student.noHpOrangTua,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save student error:', e);
    }
  }
}

export async function saveStudentsBulk(studentsToSave: Student[]): Promise<void> {
  const current = getLocalStudents();
  const map = new Map(current.map((s) => [s.id, s]));
  studentsToSave.forEach((s) => map.set(s.id, s));
  setLocalStudents(Array.from(map.values()));

  const client = getSupabaseClient();
  if (client && studentsToSave.length > 0) {
    try {
      const records = studentsToSave.map((s) => ({
        id: s.id,
        class_id: s.classId,
        no: s.no,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        catatan_umum: s.catatanUmum,
        no_hp_orang_tua: s.noHpOrangTua,
        updated_at: new Date().toISOString(),
      }));
      await client.from('students').upsert(records);
    } catch (e) {
      console.warn('Supabase bulk save students error:', e);
    }
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const updated = getLocalStudents().filter((s) => s.id !== studentId);
  setLocalStudents(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('students').delete().eq('id', studentId);
    } catch (e) {
      console.warn('Supabase delete student error:', e);
    }
  }
}

// 4. Attendance Sessions
export async function fetchAttendanceSessions(classId?: string): Promise<AttendanceSession[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('attendance_sessions').select('*').order('tanggal', { ascending: false });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (data && !error) {
        const mapped: AttendanceSession[] = data.map((d: any) => ({
          id: d.id,
          classId: d.class_id,
          tanggal: d.tanggal,
          pertemuanKe: d.pertemuan_ke,
          topikMateri: d.topik_materi,
          records: d.records || {},
        }));
        if (!classId) setLocalSessions(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch attendance fallback to local:', e);
    }
  }
  const local = getLocalSessions();
  return classId ? local.filter((s) => s.classId === classId) : local;
}

export async function saveAttendanceSession(session: AttendanceSession): Promise<void> {
  const current = getLocalSessions();
  const idx = current.findIndex((s) => s.id === session.id);
  let updated: AttendanceSession[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = session;
  } else {
    updated = [...current, session];
  }
  setLocalSessions(updated);

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('attendance_sessions').upsert({
        id: session.id,
        user_id: user.id,
        class_id: session.classId,
        tanggal: session.tanggal,
        pertemuan_ke: session.pertemuanKe,
        topik_materi: session.topikMateri,
        records: session.records,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save attendance error:', e);
    }
  }
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const updated = getLocalSessions().filter((s) => s.id !== sessionId);
  setLocalSessions(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('attendance_sessions').delete().eq('id', sessionId);
    } catch (e) {
      console.warn('Supabase delete session error:', e);
    }
  }
}

// 5. Grades
export async function fetchGrades(classId?: string): Promise<StudentGrade[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('student_grades').select('*');
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (data && !error) {
        const mapped: StudentGrade[] = data.map((d: any) => ({
          id: d.id,
          studentId: d.student_id,
          classId: d.class_id,
          formatif1: d.formatif1,
          formatif2: d.formatif2,
          formatif3: d.formatif3,
          formatif4: d.formatif4,
          formatif5: d.formatif5,
          formatif6: d.formatif6,
          formatif7: d.formatif7,
          formatif8: d.formatif8,
          formatif9: d.formatif9,
          formatif10: d.formatif10,
          sumatifTengah: d.sumatif_tengah,
          sumatifAkhir: d.sumatif_akhir,
          catatan: d.catatan,
        }));
        if (!classId) setLocalGrades(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch grades fallback to local:', e);
    }
  }
  const local = getLocalGrades();
  return classId ? local.filter((g) => g.classId === classId) : local;
}

export async function saveGrade(grade: StudentGrade): Promise<void> {
  const current = getLocalGrades();
  const idx = current.findIndex((g) => g.studentId === grade.studentId && g.classId === grade.classId);
  let updated: StudentGrade[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = grade;
  } else {
    updated = [...current, grade];
  }
  setLocalGrades(updated);

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('student_grades').upsert({
        id: grade.id || `gr_${grade.studentId}_${grade.classId}`,
        user_id: user.id,
        class_id: grade.classId,
        student_id: grade.studentId,
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
        catatan: grade.catatan,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save grade error:', e);
    }
  }
}

export async function saveGradesBulk(gradesToSave: StudentGrade[]): Promise<void> {
  const current = getLocalGrades();
  const map = new Map(current.map((g) => [`${g.studentId}_${g.classId}`, g]));
  gradesToSave.forEach((g) => map.set(`${g.studentId}_${g.classId}`, g));
  setLocalGrades(Array.from(map.values()));

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user && gradesToSave.length > 0) {
    try {
      const records = gradesToSave.map((g) => ({
        id: g.id || `gr_${g.studentId}_${g.classId}`,
        user_id: user.id,
        class_id: g.classId,
        student_id: g.studentId,
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
        catatan: g.catatan,
        updated_at: new Date().toISOString(),
      }));
      await client.from('student_grades').upsert(records);
    } catch (e) {
      console.warn('Supabase bulk save grades error:', e);
    }
  }
}

// 6. Teaching Agendas
export async function fetchTeachingAgendas(classId?: string): Promise<TeachingAgenda[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('teaching_agendas').select('*').order('tanggal', { ascending: false });
      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (data && !error) {
        const mapped: TeachingAgenda[] = data.map((d: any) => ({
          id: d.id,
          classId: d.class_id,
          tanggal: d.tanggal,
          hari: d.hari || '',
          jamKe: d.jam_ke || '',
          rentangJam: d.rentang_jam || '',
          materiAjar: d.materi_ajar,
          kegiatan: d.kegiatan || '',
          catatan: d.catatan || '',
          hadirCount: d.hadir_count || 0,
          tidakHadirCount: d.tidak_hadir_count || 0,
        }));
        if (!classId || classId === 'all') setLocalAgendas(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch agendas fallback to local:', e);
    }
  }
  const local = getLocalAgendas();
  return classId && classId !== 'all' ? local.filter((a) => a.classId === classId) : local;
}

export async function saveTeachingAgenda(agenda: TeachingAgenda): Promise<void> {
  const current = getLocalAgendas();
  const idx = current.findIndex((a) => a.id === agenda.id);
  let updated: TeachingAgenda[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = agenda;
  } else {
    updated = [agenda, ...current];
  }
  setLocalAgendas(updated);

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('teaching_agendas').upsert({
        id: agenda.id,
        user_id: user.id,
        class_id: agenda.classId,
        tanggal: agenda.tanggal,
        hari: agenda.hari,
        jam_ke: agenda.jamKe,
        rentang_jam: agenda.rentangJam,
        materi_ajar: agenda.materiAjar,
        kegiatan: agenda.kegiatan,
        catatan: agenda.catatan,
        hadir_count: agenda.hadirCount,
        tidak_hadir_count: agenda.tidakHadirCount,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save agenda error:', e);
    }
  }
}

export async function deleteTeachingAgenda(agendaId: string): Promise<void> {
  const updated = getLocalAgendas().filter((a) => a.id !== agendaId);
  setLocalAgendas(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('teaching_agendas').delete().eq('id', agendaId);
    } catch (e) {
      console.warn('Supabase delete agenda error:', e);
    }
  }
}

// 7. Savings
export async function fetchSavingTransactions(classId?: string): Promise<SavingTransaction[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('saving_transactions').select('*').order('tanggal', { ascending: false });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (data && !error) {
        const mapped: SavingTransaction[] = data.map((d: any) => ({
          id: d.id,
          classId: d.class_id,
          studentId: d.student_id,
          isClassCash: d.is_class_cash,
          tanggal: d.tanggal,
          tipe: d.tipe,
          jumlah: Number(d.jumlah) || 0,
          keterangan: d.keterangan || '',
          pencatat: d.pencatat || '',
        }));
        if (!classId) setLocalSavings(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Fetch savings fallback to local:', e);
    }
  }
  const local = getLocalSavings();
  return classId ? local.filter((s) => s.classId === classId) : local;
}

export async function saveSavingTransaction(tx: SavingTransaction): Promise<void> {
  const current = getLocalSavings();
  const idx = current.findIndex((s) => s.id === tx.id);
  let updated: SavingTransaction[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = tx;
  } else {
    updated = [tx, ...current];
  }
  setLocalSavings(updated);

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client && user) {
    try {
      await client.from('saving_transactions').upsert({
        id: tx.id,
        user_id: user.id,
        class_id: tx.classId,
        student_id: tx.studentId || null,
        is_class_cash: tx.isClassCash || false,
        tanggal: tx.tanggal,
        tipe: tx.tipe,
        jumlah: tx.jumlah,
        keterangan: tx.keterangan,
        pencatat: tx.pencatat,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save saving error:', e);
    }
  }
}

export async function deleteSavingTransaction(txId: string): Promise<void> {
  const updated = getLocalSavings().filter((s) => s.id !== txId);
  setLocalSavings(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('saving_transactions').delete().eq('id', txId);
    } catch (e) {
      console.warn('Supabase delete saving error:', e);
    }
  }
}

// 8. Public Shares
export async function savePublicShareRecord(record: PublicShareRecord): Promise<void> {
  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (client) {
    try {
      await client.from('public_shares').upsert({
        id: record.id,
        user_id: user ? user.id : null,
        class_id: record.classId || null,
        type: record.type,
        title: record.title,
        payload: record.payload,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Supabase save public share error:', e);
    }
  }
}

export async function fetchPublicShareRecord(shareId: string): Promise<PublicShareRecord | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('public_shares')
        .select('*')
        .eq('id', shareId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          classId: data.class_id,
          type: data.type,
          title: data.title,
          payload: data.payload,
        };
      }
    } catch (e) {
      console.warn('Fetch public share error:', e);
    }
  }
  return null;
}
