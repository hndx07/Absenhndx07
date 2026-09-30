export type AttendanceStatus = 'H' | 'S' | 'I' | 'A' | 'D';

export interface AttendanceRecord {
  status: AttendanceStatus;
  catatan?: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  tanggal: string;
  pertemuanKe: number;
  topikMateri?: string;
  records: Record<string, AttendanceRecord>;
  created_at?: string;
  updated_at?: string;
}

export interface ClassRoom {
  id: string;
  namaKelas: string;
  mataPelajaran: string;
  kkm: number;
  jurusan?: string;
  keterangan?: string;
  createdAt?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  classId: string;
  no: number;
  nisn?: string;
  nama: string;
  gender: 'L' | 'P';
  catatanUmum?: string;
  noHpOrangTua?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  classId: string;
  formatif1?: number | null;
  formatif2?: number | null;
  formatif3?: number | null;
  formatif4?: number | null;
  formatif5?: number | null;
  formatif6?: number | null;
  formatif7?: number | null;
  formatif8?: number | null;
  formatif9?: number | null;
  formatif10?: number | null;
  sumatifTengah?: number | null;
  sumatifAkhir?: number | null;
  catatan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GradeColumn {
  id: string;
  classId?: string;
  key: string;
  label: string;
  tanggal?: string;
  keterangan?: string;
  bobot?: number;
}

export interface TeacherProfile {
  id: string;
  namaGuru: string;
  nip?: string;
  nbm?: string;
  namaSekolah: string;
  mataPelajaranUtama: string;
  tahunAjaran: string;
  semester: string;
  email: string;
  avatarUrl?: string;
  activeClassId?: string;
  isLoggedIn?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeachingAgenda {
  id: string;
  classId: string;
  classNameSnapshot?: string;
  mataPelajaran?: string;
  guruName?: string;
  tanggal: string;
  hari: string;
  jamKe: string;
  rentangJam: string;
  materiAjar: string;
  kegiatan?: string;
  catatan?: string;
  hadirCount: number;
  tidakHadirCount: number;
  pertemuanKe?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SavingTransaction {
  id: string;
  classId: string;
  studentId?: string;
  isClassCash?: boolean;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  jumlah: number;
  keterangan: string;
  pencatat?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PublicShareRecord {
  id: string;
  classId?: string;
  type: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  title: string;
  payload?: any;
  data?: any;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

export type NavTab =
  | 'attendance'
  | 'recap'
  | 'grades'
  | 'agenda'
  | 'students'
  | 'savings'
  | 'parent_report'
  | 'statistics'
  | 'school_map';
