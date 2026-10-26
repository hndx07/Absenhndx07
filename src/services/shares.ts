import {
  PublicShareRecord,
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  SavingTransaction,
  TeacherProfile,
} from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { getSafeSupabaseClient, getAuthUser } from './supabase';
import { SafeCache } from '../utils/storageCache';
import { getStudents } from './students';
import { getGradeColumns } from './grades';

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

/**
 * Generate 32-byte cryptographic random token (64 hex characters)
 */
export function generateSecureShareToken(): string {
  try {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback if crypto.getRandomValues is unavailable
    return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  }
}

const LAST_PAYLOAD_STRING: Record<string, string> = {};

/**
 * Memeriksa daftar ID share publik yang telah dibuat oleh pemilik untuk suatu kelas.
 * Mencegah pembuatan share baru secara otomatis tanpa persetujuan manual pengguna.
 */
export async function getExistingShareIdsForClass(classId: string): Promise<Set<string>> {
  const existing = new Set<string>();
  if (!classId) return existing;
  const supabase = getSafeSupabaseClient();
  if (!supabase) return existing;
  try {
    const user = await getAuthUser();
    if (!user?.id) return existing;
    const { data, error } = await supabase
      .from('public_shares')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_id', classId);
    if (!error && data) {
      data.forEach((r: any) => existing.add(r.id));
    }
  } catch (e) {
    console.warn('Notice checking existing shares:', e);
  }
  return existing;
}

export async function createOrUpdatePublicShare(record: PublicShareRecord): Promise<string | null> {
  const content = record.payload || record.data || {};
  const currentPayloadStr = JSON.stringify(content);
  const isPayloadUnchanged = LAST_PAYLOAD_STRING[record.id] === currentPayloadStr;
  LAST_PAYLOAD_STRING[record.id] = currentPayloadStr;

  const strippedClassId = record.id.replace(
    /^(att_share_|grade_share_|nilai_share_|sav_share_|tabungan_share_|age_share_|agenda_share_|share_)/,
    ''
  );
  const extractedClassId =
    record.classId ||
    (content as any).classId ||
    (strippedClassId !== record.id ? strippedClassId : undefined);

  // Default expiry: 60 hari dari pembuatan/pembaruan
  const defaultExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const fullPayload: PublicShareRecord = {
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

  // Simpan payload HANYA ke SafeCache (memory + sessionStorage), JANGAN tulis data murid ke localStorage!
  SafeCache.set(`pub_share_${record.id}`, fullPayload);

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('public_share_updated', {
          detail: { id: record.id, type: record.type, classId: extractedClassId },
        })
      );
    } catch {}
  }

  // Jika isi payload identik dengan yang terakhir di memori, kembalikan token yang ada
  if (isPayloadUnchanged) {
    const cachedToken = SafeCache.get<string>(`pub_share_token_${record.id}`);
    if (cachedToken) return cachedToken;
  }

  let retrievedToken: string | null = null;
  const supabase = getSafeSupabaseClient();
  if (supabase) {
    try {
      const user = await getAuthUser();
      // Generate token kuat kriptografis jika belum ada
      const existingCachedToken = SafeCache.get<string>(`pub_share_token_${record.id}`);
      const assignedToken = (record as any).share_token || existingCachedToken || generateSecureShareToken();

      const row: any = {
        id: record.id,
        type: record.type,
        title: record.title || 'Data Publik SMK Muhammadiyah Bawang',
        payload: {
          ...content,
          classId: extractedClassId,
        },
        share_token: assignedToken,
        is_active: true,
        expires_at: (record as any).expires_at || defaultExpiresAt,
        updated_at: new Date().toISOString(),
      };
      if (user?.id) {
        row.user_id = user.id;
      }
      if (extractedClassId) {
        row.class_id = extractedClassId;
      }

      await supabase.from('public_shares').upsert(row, { onConflict: 'id' });

      // Ambil token pasti dari baris Supabase
      const { data: tokenRow } = await supabase
        .from('public_shares')
        .select('share_token')
        .eq('id', record.id)
        .maybeSingle();

      const finalToken = tokenRow?.share_token || assignedToken;
      if (finalToken) {
        retrievedToken = finalToken;
        (record as any).share_token = finalToken;
        SafeCache.set(`pub_share_token_${record.id}`, finalToken);
        try {
          // Token saja boleh disimpan untuk persistensi link bagikan guru
          sessionStorage.setItem(`pub_share_token_${record.id}`, finalToken);
        } catch {}
      }
    } catch (err: any) {
      console.warn('Could not upsert public share to Supabase:', err.message);
    }
  }

  return retrievedToken;
}

export async function revokePublicShare(shareId: string): Promise<boolean> {
  const supabase = getSafeSupabaseClient();
  if (!supabase) return false;
  try {
    const user = await getAuthUser();
    if (!user?.id) return false;

    const { error } = await supabase
      .from('public_shares')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('user_id', user.id);

    if (!error) {
      SafeCache.invalidate(`pub_share_${shareId}`);
      SafeCache.invalidate(`pub_share_token_${shareId}`);
      return true;
    }
  } catch (err) {
    console.warn('Failed to revoke public share:', err);
  }
  return false;
}

export async function getPublicShareToken(shareId: string): Promise<string | null> {
  const cached = SafeCache.get<string>(`pub_share_token_${shareId}`);
  if (cached) return cached;
  try {
    const stored = sessionStorage.getItem(`pub_share_token_${shareId}`);
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
          sessionStorage.setItem(`pub_share_token_${shareId}`, data.share_token);
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
  if (!shareId || typeof shareId !== 'string' || shareId.trim().length === 0) {
    return null;
  }

  const cleanKey = shareId.trim();
  const strippedClassId = cleanKey.replace(
    /^(att_share_|grade_share_|nilai_share_|sav_share_|tabungan_share_|age_share_|agenda_share_|share_)/,
    ''
  );
  const candidateIds = Array.from(
    new Set([
      cleanKey,
      cleanKey.replace(/^nilai_/, 'grade_'),
      cleanKey.replace(/^grade_/, 'nilai_'),
      cleanKey.replace(/^tabungan_/, 'sav_'),
      cleanKey.replace(/^sav_/, 'tabungan_'),
      `grade_share_${strippedClassId}`,
      `nilai_share_${strippedClassId}`,
      `sav_share_${strippedClassId}`,
      `tabungan_share_${strippedClassId}`,
      `att_share_${strippedClassId}`,
      `absen_share_${strippedClassId}`,
      `agenda_share_${strippedClassId}`,
      strippedClassId,
    ])
  ).filter(Boolean);

  const supabase = getSafeSupabaseClient();
  if (supabase) {
    // 1. Prioritas: Coba panggil RPC get_public_share terlebih dahulu (Security Definer)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_share', {
        p_key: cleanKey,
        p_since: since || null,
      });

      if (!rpcError && rpcData) {
        // Respons unchanged dari server untuk hemat bandwidth
        if (rpcData.unchanged === true) {
          return {
            id: cleanKey,
            type: 'nilai',
            title: '',
            payload: { unchanged: true },
            data: { unchanged: true },
          };
        }

        // Cek status aktif & kadaluarsa di sisi client sebagai pertahanan lapis ganda
        if (rpcData.is_active === false) {
          return null;
        }
        if (rpcData.expires_at && new Date(rpcData.expires_at).getTime() < Date.now()) {
          return null;
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
        }

        candidateIds.forEach((cid) => {
          SafeCache.set(`pub_share_${cid}`, rec);
        });

        return rec;
      }
    } catch (rpcErr) {
      console.warn('RPC get_public_share notice:', rpcErr);
    }
  }

  // Fallback HANYA ke SafeCache (memori/sessionStorage aktif), tidak membaca data murid lama di localStorage
  for (const cid of candidateIds) {
    const cached = SafeCache.get<PublicShareRecord>(`pub_share_${cid}`);
    if (cached) return cached;
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
