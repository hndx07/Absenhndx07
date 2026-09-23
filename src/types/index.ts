export type Gender = 'L' | 'P';
export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface TeacherProfile {
  id: string;
  namaGuru: string;
  nip: string;
  nbm?: string; // Nomor Baku Muhammadiyah
  namaSekolah: string;
  mataPelajaranUtama: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  isLoggedIn: boolean;
  email?: string;
  avatarUrl?: string;
  googleId?: string;
  activeClassId?: string;
}

export interface ClassRoom {
  id: string;
  namaKelas: string;
  mataPelajaran: string;
  kkm: number;
  jurusan?: string;
  keterangan?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  no: number;
  nisn: string;
  nama: string;
  gender: Gender;
  catatanUmum: string;
  noHpOrangTua?: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  tanggal: string; // YYYY-MM-DD
  pertemuanKe: number;
  topikMateri: string;
  records: Record<string, { status: AttendanceStatus; catatan: string }>;
}

export interface GradeColumn {
  id: string;
  key: string;
  label: string;
  tanggal?: string;
  keterangan?: string;
  bobot?: number;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  classId: string;
  monthlyGrades?: Record<string, number | null>;
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
  catatan: string;
}

export interface TeachingAgenda {
  id: string;
  classId: string;
  tanggal: string;
  hari: string;
  jamKe: string;
  rentangJam: string;
  materiAjar: string;
  kegiatan: string;
  catatan: string;
  hadirCount: number;
  tidakHadirCount: number;
}

export interface SavingTransaction {
  id: string;
  classId: string;
  studentId?: string; // if null, it's Kas Kelas
  isClassCash: boolean;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  jumlah: number;
  keterangan: string;
  pencatat?: string;
}

export interface ModuleAjarForm {
  fase: 'E (Kelas X)' | 'F (Kelas XI)' | 'F (Kelas XII)';
  mataPelajaran: string;
  kelas: string;
  topik: string;
  alokasiWaktu: string;
  pendekatan: string; // e.g. Deep Learning, Saintifik, Konstruktivisme
  metode: string; // PjBL, PBL, Discovery Learning, Teaching Factory
  capaianPembelajaran: string;
  alurTujuanPembelajaran: string;
  tujuanPembelajaran: string;
  sintaksPembelajaran: string;
  integrasiHardSoftSkill: string;
  integrasiK3BudayaKerja: string;
  karakterKemuhammadiyahan: string;
  tujuhKebiasaanAnakHebat: string;
  strukturLkpd: string;
}

export interface KisiKisiItem {
  id: string;
  no: number;
  elemen: string;
  capaianPembelajaran: string;
  tujuanPembelajaran: string;
  materi: string;
  indikatorSoal: string;
  levelKognitif: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
  bentukSoal: 'Pilihan Ganda' | 'Uraian' | 'Praktik';
  nomorSoal: number;
}

export interface KartuSoalItem {
  id: string;
  noSoal: number;
  bentukSoal: string;
  kompetensi: string;
  materi: string;
  indikator: string;
  butirSoal: string;
  kunciJawaban: string;
  pedomanPenskoran: string;
}

export interface PublicShareRecord {
  id: string;
  type: 'absen' | 'nilai' | 'tabungan';
  classId: string;
  studentId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}
