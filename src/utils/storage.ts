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
import { getSupabaseClient } from '../services/supabase';

const KEYS = {
  TEACHER: 'smk_teacher_profile',
  CLASSES: 'smk_classes',
  STUDENTS: 'smk_students',
  ATTENDANCE: 'smk_attendance',
  GRADES: 'smk_grades',
  GRADE_COLUMNS: 'smk_grade_columns',
  AGENDAS: 'smk_agendas',
  SAVINGS: 'smk_savings',
  PUBLIC_SHARES: 'smk_public_shares',
};

// Initial Seed Data for SMK Muhammadiyah Bawang
const defaultTeacher: TeacherProfile = {
  id: 'guru_smk_01',
  namaGuru: 'Hendra Setiawan, S.Kom',
  nip: '19880512 201502 1 003',
  nbm: '1182940',
  namaSekolah: 'SMK Muhammadiyah Bawang',
  mataPelajaranUtama: 'Konsentrasi Keahlian Teknik Komputer & Jaringan',
  tahunAjaran: '2025/2026',
  semester: 'Genap',
  isLoggedIn: true,
  email: 'guru.tkj@smkmbawang.sch.id',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  activeClassId: 'cls_tkj_10_1',
};

const defaultClasses: ClassRoom[] = [
  {
    id: 'cls_tkj_10_1',
    namaKelas: 'X TKJ 1',
    mataPelajaran: 'Dasar-dasar Kejuruan TKJ',
    kkm: 75,
    jurusan: 'Teknik Komputer & Jaringan',
    keterangan: 'Tahun Ajaran 2025/2026 - Fase E',
    createdAt: '2026-01-05',
  },
  {
    id: 'cls_tbsm_12_2',
    namaKelas: 'XII TBSM 2',
    mataPelajaran: 'Pemeliharaan Mesin Sepeda Motor',
    kkm: 78,
    jurusan: 'Teknik Bisnis Sepeda Motor',
    keterangan: 'Tahun Ajaran 2025/2026 - Fase F',
    createdAt: '2026-01-05',
  },
  {
    id: 'cls_akl_11_1',
    namaKelas: 'XI AKL 1',
    mataPelajaran: 'Praktikum Akuntansi Perusahaan Jasa',
    kkm: 75,
    jurusan: 'Akuntansi & Keuangan Lembaga',
    keterangan: 'Tahun Ajaran 2025/2026 - Fase F',
    createdAt: '2026-01-06',
  },
];

const defaultStudents: Student[] = [
  { id: 'std_01', classId: 'cls_tkj_10_1', no: 1, nisn: '0089123401', nama: 'Achmad Fauzi Nugroho', gender: 'L', catatanUmum: 'Aktif dalam praktik perakitan', noHpOrangTua: '081234567891' },
  { id: 'std_02', classId: 'cls_tkj_10_1', no: 2, nisn: '0089123402', nama: 'Aditya Pratama Ramadhan', gender: 'L', catatanUmum: 'Ketua kelas X TKJ 1', noHpOrangTua: '081234567892' },
  { id: 'std_03', classId: 'cls_tkj_10_1', no: 3, nisn: '0089123403', nama: 'Annisa Nurul Aini', gender: 'P', catatanUmum: 'Sangat teliti konfigurasi router', noHpOrangTua: '081234567893' },
  { id: 'std_04', classId: 'cls_tkj_10_1', no: 4, nisn: '0089123404', nama: 'Bagas Dwi Saputra', gender: 'L', catatanUmum: 'Perlu bimbingan subnetting', noHpOrangTua: '081234567894' },
  { id: 'std_05', classId: 'cls_tkj_10_1', no: 5, nisn: '0089123405', nama: 'Dewi Sekar Ayu', gender: 'P', catatanUmum: 'Rajin & disiplin tugas', noHpOrangTua: '081234567895' },
  { id: 'std_06', classId: 'cls_tkj_10_1', no: 6, nisn: '0089123406', nama: 'Dimas Aditya Saputra', gender: 'L', catatanUmum: 'Anggota Hizbul Wathan', noHpOrangTua: '081234567896' },
  { id: 'std_07', classId: 'cls_tkj_10_1', no: 7, nisn: '0089123407', nama: 'Fajar Maulana Malik', gender: 'L', catatanUmum: 'Kreatif dalam troubleshooting', noHpOrangTua: '081234567897' },
  { id: 'std_08', classId: 'cls_tkj_10_1', no: 8, nisn: '0089123408', nama: 'Indah Permatasari', gender: 'P', catatanUmum: 'Sekretaris kelas', noHpOrangTua: '081234567898' },
  { id: 'std_09', classId: 'cls_tkj_10_1', no: 9, nisn: '0089123409', nama: 'Muhammad Rizky Ilham', gender: 'L', catatanUmum: 'Anggota IPM Ranting Bawang', noHpOrangTua: '081234567899' },
  { id: 'std_10', classId: 'cls_tkj_10_1', no: 10, nisn: '0089123410', nama: 'Nabila Zahra Syahrani', gender: 'P', catatanUmum: 'Bendahara kelas', noHpOrangTua: '081234567810' },
  { id: 'std_11', classId: 'cls_tkj_10_1', no: 11, nisn: '0089123411', nama: 'Rafi Ahmad Al-Farizi', gender: 'L', catatanUmum: 'Pemrograman Mikrotik mahir', noHpOrangTua: '081234567811' },
  { id: 'std_12', classId: 'cls_tkj_10_1', no: 12, nisn: '0089123412', nama: 'Siti Rahmawati', gender: 'P', catatanUmum: 'Tertib administrasi lab', noHpOrangTua: '081234567812' },
];

const defaultAttendanceSessions: AttendanceSession[] = [
  {
    id: 'att_ses_01',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-12',
    pertemuanKe: 1,
    topikMateri: 'Pengenalan Topologi Jaringan Komputer & K3 Lab',
    records: {
      std_01: { status: 'H', catatan: 'Tepat waktu' },
      std_02: { status: 'H', catatan: '' },
      std_03: { status: 'H', catatan: '' },
      std_04: { status: 'S', catatan: 'Surat dokter flu' },
      std_05: { status: 'H', catatan: '' },
      std_06: { status: 'H', catatan: '' },
      std_07: { status: 'H', catatan: '' },
      std_08: { status: 'H', catatan: '' },
      std_09: { status: 'I', catatan: 'Izin kegiatan IPM' },
      std_10: { status: 'H', catatan: '' },
      std_11: { status: 'H', catatan: '' },
      std_12: { status: 'H', catatan: '' },
    },
  },
  {
    id: 'att_ses_02',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-19',
    pertemuanKe: 2,
    topikMateri: 'Crimping Kabel UTP Straight & Cross serta Pengujian LAN Tester',
    records: {
      std_01: { status: 'H', catatan: '' },
      std_02: { status: 'H', catatan: '' },
      std_03: { status: 'H', catatan: '' },
      std_04: { status: 'H', catatan: '' },
      std_05: { status: 'H', catatan: '' },
      std_06: { status: 'H', catatan: '' },
      std_07: { status: 'H', catatan: '' },
      std_08: { status: 'H', catatan: '' },
      std_09: { status: 'H', catatan: '' },
      std_10: { status: 'H', catatan: '' },
      std_11: { status: 'H', catatan: '' },
      std_12: { status: 'H', catatan: '' },
    },
  },
  {
    id: 'att_ses_03',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-26',
    pertemuanKe: 3,
    topikMateri: 'Konfigurasi IP Address Statis & Dynamic (DHCP Server) pada Router Mikrotik',
    records: {
      std_01: { status: 'H', catatan: '' },
      std_02: { status: 'H', catatan: '' },
      std_03: { status: 'H', catatan: '' },
      std_04: { status: 'H', catatan: '' },
      std_05: { status: 'H', catatan: '' },
      std_06: { status: 'A', catatan: 'Tanpa keterangan' },
      std_07: { status: 'H', catatan: '' },
      std_08: { status: 'H', catatan: '' },
      std_09: { status: 'H', catatan: '' },
      std_10: { status: 'H', catatan: '' },
      std_11: { status: 'H', catatan: '' },
      std_12: { status: 'H', catatan: '' },
    },
  },
];

const defaultGradeColumns: GradeColumn[] = [
  { id: 'f1', key: 'formatif1', label: 'Formatif 1 (K3 & Topologi)', tanggal: '2026-01-14', keterangan: 'TP 1.1' },
  { id: 'f2', key: 'formatif2', label: 'Formatif 2 (Crimping UTP)', tanggal: '2026-01-21', keterangan: 'TP 1.2' },
  { id: 'f3', key: 'formatif3', label: 'Formatif 3 (Subnetting IPv4)', tanggal: '2026-01-28', keterangan: 'TP 2.1' },
  { id: 'f4', key: 'formatif4', label: 'Formatif 4 (Mikrotik DHCP)', tanggal: '2026-02-04', keterangan: 'TP 2.2' },
  { id: 'f5', key: 'formatif5', label: 'Formatif 5 (WLAN / Hotspot)', tanggal: '2026-02-18', keterangan: 'TP 3.1' },
  { id: 'f6', key: 'formatif6', label: 'Formatif 6 (Firewall Filter)', tanggal: '2026-02-25', keterangan: 'TP 3.2' },
  { id: 'f7', key: 'formatif7', label: 'Formatif 7 (Routing Statis)', tanggal: '2026-03-04', keterangan: 'TP 4.1' },
  { id: 'f8', key: 'formatif8', label: 'Formatif 8 (Praktik Lab LAN)', tanggal: '2026-03-11', keterangan: 'TP 4.2' },
  { id: 'f9', key: 'formatif9', label: 'Formatif 9 (Troubleshooting)', tanggal: '2026-03-18', keterangan: 'TP 5.1' },
  { id: 'f10', key: 'formatif10', label: 'Formatif 10 (Dokumentasi)', tanggal: '2026-03-25', keterangan: 'TP 5.2' },
];

const defaultGrades: StudentGrade[] = [
  { id: 'grd_01', studentId: 'std_01', classId: 'cls_tkj_10_1', formatif1: 85, formatif2: 88, formatif3: 82, formatif4: 90, formatif5: 84, sumatifTengah: 86, sumatifAkhir: 88, catatan: 'Capaian materi jaringan sangat baik' },
  { id: 'grd_02', studentId: 'std_02', classId: 'cls_tkj_10_1', formatif1: 90, formatif2: 92, formatif3: 88, formatif4: 88, formatif5: 90, sumatifTengah: 91, sumatifAkhir: 93, catatan: 'Sangat kompeten dan teladan bagi teman' },
  { id: 'grd_03', studentId: 'std_03', classId: 'cls_tkj_10_1', formatif1: 88, formatif2: 95, formatif3: 90, formatif4: 92, formatif5: 94, sumatifTengah: 92, sumatifAkhir: 95, catatan: 'Hasil crimping rapi dan pengujian sempurna' },
  { id: 'grd_04', studentId: 'std_04', classId: 'cls_tkj_10_1', formatif1: 72, formatif2: 74, formatif3: 70, formatif4: 76, formatif5: 75, sumatifTengah: 74, sumatifAkhir: 75, catatan: 'Tuntas bersyarat, perlu pengayaan subnetting' },
  { id: 'grd_05', studentId: 'std_05', classId: 'cls_tkj_10_1', formatif1: 84, formatif2: 86, formatif3: 80, formatif4: 85, formatif5: 88, sumatifTengah: 85, sumatifAkhir: 87, catatan: 'Pemahaman konsep dan praktikum seimbang' },
  { id: 'grd_06', studentId: 'std_06', classId: 'cls_tkj_10_1', formatif1: 78, formatif2: 80, formatif3: 75, formatif4: 79, formatif5: 80, sumatifTengah: 80, sumatifAkhir: 82, catatan: 'Tuntas, kehadiran perlu ditingkatkan' },
  { id: 'grd_07', studentId: 'std_07', classId: 'cls_tkj_10_1', formatif1: 86, formatif2: 84, formatif3: 85, formatif4: 88, formatif5: 89, sumatifTengah: 87, sumatifAkhir: 89, catatan: 'Daya analisis troubleshooting sangat tajam' },
  { id: 'grd_08', studentId: 'std_08', classId: 'cls_tkj_10_1', formatif1: 92, formatif2: 90, formatif3: 88, formatif4: 90, formatif5: 91, sumatifTengah: 90, sumatifAkhir: 92, catatan: 'Laporan dan hasil tes selalu tepat waktu' },
  { id: 'grd_09', studentId: 'std_09', classId: 'cls_tkj_10_1', formatif1: 82, formatif2: 85, formatif3: 80, formatif4: 83, formatif5: 85, sumatifTengah: 84, sumatifAkhir: 85, catatan: 'Aktif berorganisasi dan akademis terjaga' },
  { id: 'grd_10', studentId: 'std_10', classId: 'cls_tkj_10_1', formatif1: 88, formatif2: 89, formatif3: 85, formatif4: 87, formatif5: 88, sumatifTengah: 88, sumatifAkhir: 90, catatan: 'Kerja tim dan ketelitian sangat baik' },
  { id: 'grd_11', studentId: 'std_11', classId: 'cls_tkj_10_1', formatif1: 95, formatif2: 96, formatif3: 92, formatif4: 98, formatif5: 96, sumatifTengah: 95, sumatifAkhir: 97, catatan: 'Istimewa dalam konfigurasi routing & hotspot' },
  { id: 'grd_12', studentId: 'std_12', classId: 'cls_tkj_10_1', formatif1: 86, formatif2: 88, formatif3: 84, formatif4: 85, formatif5: 87, sumatifTengah: 86, sumatifAkhir: 88, catatan: 'Konsisten dan berakhlak mulia' },
];

const defaultAgendas: TeachingAgenda[] = [
  {
    id: 'ag_01',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-12',
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07.00 - 09.45 WIB',
    materiAjar: 'Orientasi Pembelajaran Kejuruan TKJ & Penerapan K3 Lab Komputer',
    kegiatan: 'Penyampaian kontrak belajar, pembagian kelompok kerja 5R, pengenalan perangkat keras jaringan.',
    catatan: '1 siswa sakit (surat terlampir), 1 siswa izin tugas IPM. Kegiatan berjalan lancar.',
    hadirCount: 10,
    tidakHadirCount: 2,
  },
  {
    id: 'ag_02',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-19',
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07.00 - 09.45 WIB',
    materiAjar: 'Praktik Pembuatan Kabel UTP Straight-Through dan Cross-Over',
    kegiatan: 'Demonstrasi teknik kupas kabel, urutan standar TIA/EIA 568B & 568A, crimping RJ45, uji kabel tester.',
    catatan: 'Semua 12 siswa hadir. Sebanyak 10 siswa berhasil lolos pengujian pada percobaan pertama.',
    hadirCount: 12,
    tidakHadirCount: 0,
  },
  {
    id: 'ag_03',
    classId: 'cls_tkj_10_1',
    tanggal: '2026-01-26',
    hari: 'Senin',
    jamKe: '1 - 4',
    rentangJam: '07.00 - 09.45 WIB',
    materiAjar: 'Konfigurasi Dasar RouterBoard Mikrotik & DHCP Server',
    kegiatan: 'Instalasi Winbox, konfigurasi identity router, IP Address ether1-ether2, DHCP Setup, uji ping client.',
    catatan: '1 siswa alpa tanpa keterangan (sudah dihubungi wali kelas).',
    hadirCount: 11,
    tidakHadirCount: 1,
  },
];

const defaultSavings: SavingTransaction[] = [
  {
    id: 'sav_01',
    classId: 'cls_tkj_10_1',
    isClassCash: true,
    tanggal: '2026-01-12',
    tipe: 'masuk',
    jumlah: 60000,
    keterangan: 'Iuran kas kelas minggu ke-1 (@Rp 5.000 x 12 siswa)',
    pencatat: 'Nabila Zahra (Bendahara)',
  },
  {
    id: 'sav_02',
    classId: 'cls_tkj_10_1',
    isClassCash: true,
    tanggal: '2026-01-19',
    tipe: 'masuk',
    jumlah: 60000,
    keterangan: 'Iuran kas kelas minggu ke-2 (@Rp 5.000 x 12 siswa)',
    pencatat: 'Nabila Zahra (Bendahara)',
  },
  {
    id: 'sav_03',
    classId: 'cls_tkj_10_1',
    isClassCash: true,
    tanggal: '2026-01-20',
    tipe: 'keluar',
    jumlah: 35000,
    keterangan: 'Pembelian spidol whiteboard & penghapus kaca kelas',
    pencatat: 'Nabila Zahra (Bendahara)',
  },
  {
    id: 'sav_04',
    classId: 'cls_tkj_10_1',
    studentId: 'std_01',
    isClassCash: false,
    tanggal: '2026-01-12',
    tipe: 'masuk',
    jumlah: 50000,
    keterangan: 'Setoran tabungan awal semester',
    pencatat: 'Hendra Setiawan, S.Kom',
  },
  {
    id: 'sav_05',
    classId: 'cls_tkj_10_1',
    studentId: 'std_02',
    isClassCash: false,
    tanggal: '2026-01-12',
    tipe: 'masuk',
    jumlah: 100000,
    keterangan: 'Setoran tabungan awal semester',
    pencatat: 'Hendra Setiawan, S.Kom',
  },
  {
    id: 'sav_06',
    classId: 'cls_tkj_10_1',
    studentId: 'std_03',
    isClassCash: false,
    tanggal: '2026-01-19',
    tipe: 'masuk',
    jumlah: 75000,
    keterangan: 'Setoran tabungan',
    pencatat: 'Hendra Setiawan, S.Kom',
  },
];

// Read from LocalStorage or initialize with seed defaults
export function getStoredTeacher(): TeacherProfile {
  try {
    const data = localStorage.getItem(KEYS.TEACHER);
    return data ? JSON.parse(data) : defaultTeacher;
  } catch {
    return defaultTeacher;
  }
}

export function saveStoredTeacher(teacher: TeacherProfile): void {
  localStorage.setItem(KEYS.TEACHER, JSON.stringify(teacher));
}

export function getStoredClasses(): ClassRoom[] {
  try {
    const data = localStorage.getItem(KEYS.CLASSES);
    return data ? JSON.parse(data) : defaultClasses;
  } catch {
    return defaultClasses;
  }
}

export function saveStoredClasses(classes: ClassRoom[]): void {
  localStorage.setItem(KEYS.CLASSES, JSON.stringify(classes));
}

export function getStoredStudents(): Student[] {
  try {
    const data = localStorage.getItem(KEYS.STUDENTS);
    return data ? JSON.parse(data) : defaultStudents;
  } catch {
    return defaultStudents;
  }
}

export function saveStoredStudents(students: Student[]): void {
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
}

export function getStoredAttendance(): AttendanceSession[] {
  try {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : defaultAttendanceSessions;
  } catch {
    return defaultAttendanceSessions;
  }
}

export function saveStoredAttendance(sessions: AttendanceSession[]): void {
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(sessions));
}

export function getStoredGrades(): StudentGrade[] {
  try {
    const data = localStorage.getItem(KEYS.GRADES);
    return data ? JSON.parse(data) : defaultGrades;
  } catch {
    return defaultGrades;
  }
}

export function saveStoredGrades(grades: StudentGrade[]): void {
  localStorage.setItem(KEYS.GRADES, JSON.stringify(grades));
}

export function getStoredGradeColumns(): GradeColumn[] {
  try {
    const data = localStorage.getItem(KEYS.GRADE_COLUMNS);
    return data ? JSON.parse(data) : defaultGradeColumns;
  } catch {
    return defaultGradeColumns;
  }
}

export function saveStoredGradeColumns(cols: GradeColumn[]): void {
  localStorage.setItem(KEYS.GRADE_COLUMNS, JSON.stringify(cols));
}

export function getStoredAgendas(): TeachingAgenda[] {
  try {
    const data = localStorage.getItem(KEYS.AGENDAS);
    return data ? JSON.parse(data) : defaultAgendas;
  } catch {
    return defaultAgendas;
  }
}

export function saveStoredAgendas(agendas: TeachingAgenda[]): void {
  localStorage.setItem(KEYS.AGENDAS, JSON.stringify(agendas));
}

export function getStoredSavings(): SavingTransaction[] {
  try {
    const data = localStorage.getItem(KEYS.SAVINGS);
    return data ? JSON.parse(data) : defaultSavings;
  } catch {
    return defaultSavings;
  }
}

export function saveStoredSavings(savings: SavingTransaction[]): void {
  localStorage.setItem(KEYS.SAVINGS, JSON.stringify(savings));
}

export function getStoredPublicShares(): Record<string, PublicShareRecord> {
  try {
    const data = localStorage.getItem(KEYS.PUBLIC_SHARES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveStoredPublicShare(share: PublicShareRecord): void {
  const all = getStoredPublicShares();
  all[share.id] = share;
  localStorage.setItem(KEYS.PUBLIC_SHARES, JSON.stringify(all));
}

// Backup all application data into JSON object
export function createDatabaseBackup(): string {
  const fullBackup = {
    appName: 'Aplikasi Absensi & Nilai Siswa - SMK Muhammadiyah Bawang',
    version: '2026.1-supabase',
    exportedAt: new Date().toISOString(),
    teacher: getStoredTeacher(),
    classes: getStoredClasses(),
    students: getStoredStudents(),
    attendance: getStoredAttendance(),
    grades: getStoredGrades(),
    gradeColumns: getStoredGradeColumns(),
    agendas: getStoredAgendas(),
    savings: getStoredSavings(),
  };
  return JSON.stringify(fullBackup, null, 2);
}

// Restore all application data from JSON
export function restoreDatabaseBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.classes || !parsed.students) {
      return { success: false, message: 'Format file cadangan tidak valid (field wajib tidak ditemukan).' };
    }

    if (parsed.teacher) saveStoredTeacher(parsed.teacher);
    if (parsed.classes) saveStoredClasses(parsed.classes);
    if (parsed.students) saveStoredStudents(parsed.students);
    if (parsed.attendance) saveStoredAttendance(parsed.attendance);
    if (parsed.grades) saveStoredGrades(parsed.grades);
    if (parsed.gradeColumns) saveStoredGradeColumns(parsed.gradeColumns);
    if (parsed.agendas) saveStoredAgendas(parsed.agendas);
    if (parsed.savings) saveStoredSavings(parsed.savings);

    return { success: true, message: 'Data berhasil dipulihkan secara penuh!' };
  } catch (e: any) {
    return { success: false, message: `Gagal membaca file backup: ${e.message}` };
  }
}

// Cloud Supabase Sync Engine
export async function syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase client belum terhubung. Konfigurasikan URL dan Anon Key terlebih dahulu.',
    };
  }

  try {
    const teacher = getStoredTeacher();
    const classes = getStoredClasses();
    const students = getStoredStudents();
    const attendance = getStoredAttendance();
    const grades = getStoredGrades();
    const agendas = getStoredAgendas();
    const savings = getStoredSavings();

    // 1. Upsert Teacher Profile
    if (teacher) {
      await client.from('teacher_profiles').upsert({
        id: teacher.id,
        nama_guru: teacher.namaGuru,
        nip: teacher.nip,
        nbm: teacher.nbm,
        nama_sekolah: teacher.namaSekolah,
        mata_pelajaran_utama: teacher.mataPelajaranUtama,
        tahun_ajaran: teacher.tahunAjaran,
        semester: teacher.semester,
        email: teacher.email,
        avatar_url: teacher.avatarUrl,
        active_class_id: teacher.activeClassId,
      });
    }

    // 2. Upsert Classes
    if (classes.length > 0) {
      const classRows = classes.map((c) => ({
        id: c.id,
        nama_kelas: c.namaKelas,
        mata_pelajaran: c.mataPelajaran,
        kkm: c.kkm,
        jurusan: c.jurusan,
        keterangan: c.keterangan,
        created_at: c.createdAt,
      }));
      await client.from('classes').upsert(classRows);
    }

    // 3. Upsert Students
    if (students.length > 0) {
      const studentRows = students.map((s) => ({
        id: s.id,
        class_id: s.classId,
        no: s.no,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        catatan_umum: s.catatanUmum,
        no_hp_orang_tua: s.noHpOrangTua,
      }));
      await client.from('students').upsert(studentRows);
    }

    // 4. Upsert Attendance Sessions
    if (attendance.length > 0) {
      const attRows = attendance.map((a) => ({
        id: a.id,
        class_id: a.classId,
        tanggal: a.tanggal,
        pertemuan_ke: a.pertemuanKe,
        topik_materi: a.topikMateri,
        records: a.records,
      }));
      await client.from('attendance_sessions').upsert(attRows);
    }

    // 5. Upsert Grades
    if (grades.length > 0) {
      const gradeRows = grades.map((g) => ({
        id: g.id,
        student_id: g.studentId,
        class_id: g.classId,
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
      }));
      await client.from('student_grades').upsert(gradeRows);
    }

    // 6. Upsert Agendas
    if (agendas.length > 0) {
      const agRows = agendas.map((ag) => ({
        id: ag.id,
        class_id: ag.classId,
        tanggal: ag.tanggal,
        hari: ag.hari,
        jam_ke: ag.jamKe,
        rentang_jam: ag.rentangJam,
        materi_ajar: ag.materiAjar,
        kegiatan: ag.kegiatan,
        catatan: ag.catatan,
        hadir_count: ag.hadirCount,
        tidak_hadir_count: ag.tidakHadirCount,
      }));
      await client.from('teaching_agendas').upsert(agRows);
    }

    // 7. Upsert Savings
    if (savings.length > 0) {
      const savRows = savings.map((s) => ({
        id: s.id,
        class_id: s.classId,
        student_id: s.studentId || null,
        is_class_cash: s.isClassCash,
        tanggal: s.tanggal,
        tipe: s.tipe,
        jumlah: s.jumlah,
        keterangan: s.keterangan,
        pencatat: s.pencatat,
      }));
      await client.from('saving_transactions').upsert(savRows);
    }

    // Update last sync time
    const cfg = JSON.parse(localStorage.getItem('smk_supabase_config') || '{}');
    cfg.lastSyncedAt = new Date().toISOString();
    localStorage.setItem('smk_supabase_config', JSON.stringify(cfg));

    return {
      success: true,
      message: `Semua data (${classes.length} kelas, ${students.length} siswa, ${attendance.length} sesi absensi, ${grades.length} nilai) berhasil disinkronkan ke Supabase!`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Sinkronisasi gagal: ${error.message || error}`,
    };
  }
}
