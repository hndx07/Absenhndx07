import {
  CalendarCheck,
  FileCheck,
  Award,
  Users,
  BookMarked,
  Wallet,
  BarChart3,
  MessageSquare,
  MapPin,
  LucideIcon,
} from 'lucide-react';

export type NavTab =
  | 'attendance'
  | 'recap'
  | 'grades'
  | 'students'
  | 'agendas'
  | 'savings'
  | 'statistics'
  | 'parent_report'
  | 'school_map';

export interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'attendance', label: 'Presensi Murid', icon: CalendarCheck, desc: 'Input kehadiran harian murid' },
  { id: 'recap', label: 'Rekap Absensi', icon: FileCheck, desc: 'Rekap bulanan, cetak & ekspor Excel' },
  { id: 'grades', label: 'Penilaian & KKM', icon: Award, desc: 'Asesmen sumatif & formatif' },
  { id: 'students', label: 'Data Murid', icon: Users, desc: 'Kelola murid & impor Excel' },
  { id: 'agendas', label: 'Buku Jurnal Pendidik', icon: BookMarked, desc: 'Catatan agenda kegiatan KBM' },
  { id: 'savings', label: 'Tabungan & Kas', icon: Wallet, desc: 'Buku kas & tabungan kelas' },
  { id: 'statistics', label: 'Statistik & Resume', icon: BarChart3, desc: 'Grafik & ringkasan analitik' },
  { id: 'parent_report', label: 'Laporan WhatsApp Wali', icon: MessageSquare, desc: 'Kirim rekap ke orang tua / wali' },
  { id: 'school_map', label: 'Peta Kampus', icon: MapPin, desc: 'Profil & lokasi SMK Muhiba' },
];
