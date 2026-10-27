import {
  AttendanceSession,
  AttendanceStatus,
  ClassRoom,
  Student,
  TeacherProfile,
  TeachingAgenda,
} from '../../types';

export interface AttendanceViewProps {
  currentClass: ClassRoom;
  students: Student[];
  sessions: AttendanceSession[];
  teacher: TeacherProfile;
  agendas?: TeachingAgenda[];
  onNavigateToAgenda?: () => void;
  onSaveSession: (session: AttendanceSession) => void | Promise<void>;
  onDeleteSession: (sessionId: string) => void | Promise<void>;
}

export const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getIndoDay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return INDO_DAYS[d.getDay()] || 'Senin';
    }
  } catch {}
  return 'Senin';
}

export function parseTimeRangeHelper(rentangJam?: string): { start: string; end: string } {
  if (!rentangJam) return { start: '07:15', end: '09:15' };
  const parts = rentangJam.replace('WIB', '').trim().split('-');
  return {
    start: parts[0]?.trim() || '07:15',
    end: parts[1]?.trim() || '09:15',
  };
}

export interface NewSessionFormData {
  tanggal: string;
  hari: string;
  pertemuanKe: number;
  jamKe: string;
  rentangJam: string;
  topikMateri: string;
  kegiatan: string;
  catatan: string;
}
