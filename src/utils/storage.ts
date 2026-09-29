import { safeGetLocalStorage, safeSetLocalStorage } from './storageCache';
import {
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

export const DEFAULT_TEACHER: TeacherProfile = {
  id: 'guru_default',
  namaGuru: 'Hendra Prabu S.Kom',
  nip: '19870512 201201 1 004',
  nbm: '1122334',
  namaSekolah: SCHOOL_CONFIG.namaSekolah,
  mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
  tahunAjaran: SCHOOL_CONFIG.tahunAjaran,
  semester: SCHOOL_CONFIG.semester,
  email: 'guru@smkmuhbawang.sch.id',
  activeClassId: 'cls_tkj_1',
};

export const DEFAULT_CLASSES: ClassRoom[] = [
  {
    id: 'cls_tkj_1',
    namaKelas: 'XII TKJ 1',
    mataPelajaran: 'Administrasi Infrastruktur Jaringan',
    kkm: 75,
    jurusan: 'Teknik Jaringan Komputer dan Telekomunikasi',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-07-15',
  },
  {
    id: 'cls_tkj_2',
    namaKelas: 'XII TKJ 2',
    mataPelajaran: 'Teknologi Layanan Jaringan',
    kkm: 75,
    jurusan: 'Teknik Jaringan Komputer dan Telekomunikasi',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-07-15',
  },
  {
    id: 'cls_akl_1',
    namaKelas: 'XI AKL 1',
    mataPelajaran: 'Komputer Akuntansi (MYOB)',
    kkm: 75,
    jurusan: 'Akuntansi dan Keuangan Lembaga',
    keterangan: 'Tahun Ajaran 2025/2026',
    createdAt: '2025-07-15',
  },
];

export const DEFAULT_STUDENTS: Student[] = [
  { id: 'std_1', classId: 'cls_tkj_1', no: 1, nisn: '0071234561', nama: 'Ahmad Fauzan', gender: 'L', noHpOrangTua: '081234567890', catatanUmum: 'Siswa aktif dan komunikatif' },
  { id: 'std_2', classId: 'cls_tkj_1', no: 2, nisn: '0071234562', nama: 'Annisa Rahmawati', gender: 'P', noHpOrangTua: '081234567891', catatanUmum: 'Sangat rapi dalam mencatat tugas' },
  { id: 'std_3', classId: 'cls_tkj_1', no: 3, nisn: '0071234563', nama: 'Bagus Pratama', gender: 'L', noHpOrangTua: '081234567892', catatanUmum: 'Mahir dalam konfigurasi Mikrotik' },
  { id: 'std_4', classId: 'cls_tkj_1', no: 4, nisn: '0071234564', nama: 'Dewi Lestari', gender: 'P', noHpOrangTua: '081234567893', catatanUmum: 'Tertib dan disiplin' },
  { id: 'std_5', classId: 'cls_tkj_1', no: 5, nisn: '0071234565', nama: 'Dimas Anggara', gender: 'L', noHpOrangTua: '081234567894', catatanUmum: 'Perlu sedikit dorongan pada teori' },
  { id: 'std_6', classId: 'cls_tkj_1', no: 6, nisn: '0071234566', nama: 'Fajar Nugroho', gender: 'L', noHpOrangTua: '081234567895', catatanUmum: 'Antusias pada kegiatan praktik' },
  { id: 'std_7', classId: 'cls_tkj_1', no: 7, nisn: '0071234567', nama: 'Intan Permata', gender: 'P', noHpOrangTua: '081234567896', catatanUmum: 'Selalu hadir tepat waktu' },
  { id: 'std_8', classId: 'cls_tkj_1', no: 8, nisn: '0071234568', nama: 'Muhammad Rizky', gender: 'L', noHpOrangTua: '081234567897', catatanUmum: 'Ketua kelas yang bertanggung jawab' },
  { id: 'std_9', classId: 'cls_tkj_1', no: 9, nisn: '0071234569', nama: 'Nabila Zahra', gender: 'P', noHpOrangTua: '081234567898', catatanUmum: 'Kreatif dalam menyelesaikan tugas' },
  { id: 'std_10', classId: 'cls_tkj_1', no: 10, nisn: '0071234570', nama: 'Rizki Hidayat', gender: 'L', noHpOrangTua: '081234567899', catatanUmum: 'Senang membantu rekan kelompok' },
];

export const DEFAULT_GRADE_COLUMNS: GradeColumn[] = [
  { id: 'col_tp1', key: 'formatif1', label: 'Konfigurasi Routing Dinamis BGP & OSPF', bobot: 1 },
  { id: 'col_tp2', key: 'formatif2', label: 'VLAN, Trunking & InterVLAN Routing', bobot: 1 },
  { id: 'col_tp3', key: 'formatif3', label: 'Firewall Filter & Network Address Translation', bobot: 1 },
  { id: 'col_tp4', key: 'formatif4', label: 'Manajemen Bandwidth Simple Queue & PCQ', bobot: 1 },
  { id: 'col_tp5', key: 'formatif5', label: 'Keamanan Jaringan & VPN Tunneling', bobot: 1 },
];

export function getLocalTeacher(): TeacherProfile {
  return safeGetLocalStorage('muhiba_teacher_profile', DEFAULT_TEACHER);
}
export function setLocalTeacher(profile: TeacherProfile): void {
  safeSetLocalStorage('muhiba_teacher_profile', profile);
}

export function getLocalClasses(): ClassRoom[] {
  return safeGetLocalStorage('muhiba_classes', DEFAULT_CLASSES);
}
export function setLocalClasses(classes: ClassRoom[]): void {
  safeSetLocalStorage('muhiba_classes', classes);
}

export function getLocalStudents(): Student[] {
  return safeGetLocalStorage('muhiba_students', DEFAULT_STUDENTS);
}
export function setLocalStudents(students: Student[]): void {
  safeSetLocalStorage('muhiba_students', students);
}

export function getLocalSessions(): AttendanceSession[] {
  return safeGetLocalStorage('muhiba_sessions', []);
}
export function setLocalSessions(sessions: AttendanceSession[]): void {
  safeSetLocalStorage('muhiba_sessions', sessions);
}

export function getLocalGrades(): StudentGrade[] {
  return safeGetLocalStorage('muhiba_grades', []);
}
export function setLocalGrades(grades: StudentGrade[]): void {
  safeSetLocalStorage('muhiba_grades', grades);
}

export function getLocalAgendas(): TeachingAgenda[] {
  return safeGetLocalStorage('muhiba_agendas', []);
}
export function setLocalAgendas(agendas: TeachingAgenda[]): void {
  safeSetLocalStorage('muhiba_agendas', agendas);
}

export function getLocalSavings(): SavingTransaction[] {
  return safeGetLocalStorage('muhiba_savings', []);
}
export function setLocalSavings(savings: SavingTransaction[]): void {
  safeSetLocalStorage('muhiba_savings', savings);
}
