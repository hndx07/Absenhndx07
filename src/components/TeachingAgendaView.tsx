import React, { useState, useMemo, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  Download,
  Search,
  Filter,
  Users,
  Building2,
  BookOpen,
  LayoutGrid,
  List,
  Cloud,
  RefreshCw,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  AlertCircle,
  HelpCircle,
  Printer,
  Upload,
  FileUp,
  AlertTriangle,
  Share2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { TeachingAgenda, ClassRoom, TeacherProfile, Student, AttendanceSession, PublicShareRecord } from '../types';
import {
  exportAgendasToExcel,
  exportToWordDocument,
  exportAgendaToPDF,
  downloadAgendaTemplateExcel,
} from '../utils/exportUtils';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { OfficialLetterhead } from './OfficialLetterhead';
import { SearchableClassSelect } from './SearchableClassSelect';
import { UiStatePersistence } from '../utils/storageCache';
import { getStudents, getAttendanceSessions, batchSaveTeachingAgendas, createOrUpdatePublicShare } from '../services/data';

export interface ParsedAgendaRow {
  rowNum: number;
  id: string;
  classId: string;
  classNameSnapshot: string;
  mataPelajaran: string;
  guruName: string;
  tanggal: string;
  hari: string;
  jamKe: string;
  rentangJam: string;
  materiAjar: string;
  kegiatan: string;
  catatan: string;
  hadirCount: number;
  tidakHadirCount: number;
  isValid: boolean;
  errors: string[];
}

// 12 Jam Pelajaran Sesuai Jadwal Resmi Sekolah
export const TEACHING_PERIODS = [
  { no: 1, timeRange: '07:15 - 07:45', start: '07:15', end: '07:45' },
  { no: 2, timeRange: '07:45 - 08:15', start: '07:45', end: '08:15' },
  { no: 3, timeRange: '08:15 - 08:45', start: '08:15', end: '08:45' },
  { no: 4, timeRange: '08:45 - 09:15', start: '08:45', end: '09:15' },
  { no: 5, timeRange: '09:30 - 10:00', start: '09:30', end: '10:00' },
  { no: 6, timeRange: '10:00 - 10:30', start: '10:00', end: '10:30' },
  { no: 7, timeRange: '10:30 - 11:00', start: '10:30', end: '11:00' },
  { no: 8, timeRange: '11:00 - 11:30', start: '11:00', end: '11:30' },
  { no: 9, timeRange: '11:30 - 12:00', start: '11:30', end: '12:00' },
  { no: 10, timeRange: '13:00 - 13:40', start: '13:00', end: '13:40' },
  { no: 11, timeRange: '13:40 - 14:20', start: '13:40', end: '14:20' },
  { no: 12, timeRange: '14:20 - 15:00', start: '14:20', end: '15:00' },
];

export function parsePeriodsFromJamKe(jamKe?: string): number[] {
  if (!jamKe) return [1, 2, 3, 4];
  const cleaned = jamKe.trim();
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
    if (parts.length >= 2) {
      const start = Math.min(parts[0], parts[1]);
      const end = Math.max(parts[0], parts[1]);
      const res: number[] = [];
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= 12) res.push(i);
      }
      return res.length > 0 ? res : [1, 2, 3, 4];
    }
  }
  const nums = cleaned.match(/\d+/g);
  if (nums && nums.length > 0) {
    const res = Array.from(new Set(nums.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 12)));
    return res.length > 0 ? res.sort((a, b) => a - b) : [1, 2, 3, 4];
  }
  return [1, 2, 3, 4];
}

export function formatPeriodsToJamKe(periods: number[]): { jamKe: string; rentangJam: string } {
  if (!periods || periods.length === 0) {
    return { jamKe: '1 - 4', rentangJam: '07:15 - 09:15 WIB' };
  }
  const sorted = Array.from(new Set(periods)).sort((a, b) => a - b);
  let isConsecutive = sorted.length > 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) {
      isConsecutive = false;
      break;
    }
  }

  const jamKe = isConsecutive
    ? `${sorted[0]} - ${sorted[sorted.length - 1]}`
    : sorted.join(', ');

  const firstPeriod = TEACHING_PERIODS.find((p) => p.no === sorted[0]) || TEACHING_PERIODS[0];
  const lastPeriod = TEACHING_PERIODS.find((p) => p.no === sorted[sorted.length - 1]) || TEACHING_PERIODS[sorted.length - 1] || firstPeriod;

  const rentangJam = `${firstPeriod.start} - ${lastPeriod.end} WIB`;
  return { jamKe, rentangJam };
}

interface TeachingAgendaViewProps {
  classes: ClassRoom[];
  agendas: TeachingAgenda[];
  teacher: TeacherProfile;
  currentClass?: ClassRoom;
  students?: Student[];
  sessions?: AttendanceSession[];
  onSaveAgenda: (agenda: TeachingAgenda) => Promise<void> | void;
  onDeleteAgenda: (id: string) => Promise<void> | void;
  onBatchSaveAgendas?: (agendas: TeachingAgenda[]) => Promise<void> | void;
}

export const TeachingAgendaView: React.FC<TeachingAgendaViewProps> = ({
  classes,
  agendas,
  teacher,
  currentClass,
  students = [],
  sessions = [],
  onSaveAgenda,
  onDeleteAgenda,
  onBatchSaveAgendas,
}) => {
  // Safe persisted filters
  const [filterClassId, setFilterClassId] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_class', 'all')
  );
  const [filterMonth, setFilterMonth] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_month', 'all')
  );
  const [filterSemester, setFilterSemester] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_semester', 'all')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<Partial<TeachingAgenda> | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Excel Upload Parser State
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<ParsedAgendaRow[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<Set<number>>(new Set());
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [uploadTargetClassId, setUploadTargetClassId] = useState<string>(() => classes[0]?.id || '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Hour Period Picker State (Accordion / Roll Down)
  const [isPeriodsExpanded, setIsPeriodsExpanded] = useState<boolean>(true);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([1, 2, 3, 4]);

  // Class Students & Attendance Sessions Cache for any selected class
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, Student[]>>({});
  const [classSessionsMap, setClassSessionsMap] = useState<Record<string, AttendanceSession[]>>({});

  // Seed cache with currentClass data if available
  useEffect(() => {
    if (currentClass?.id) {
      if (students.length > 0) {
        setClassStudentsMap((prev) => ({ ...prev, [currentClass.id]: students }));
      }
      if (sessions.length > 0) {
        setClassSessionsMap((prev) => ({ ...prev, [currentClass.id]: sessions }));
      }
    }
  }, [currentClass?.id, students, sessions]);

  // Lazy-load students & attendance sessions for the currently editing agenda's class
  const activeModalClassId = editingAgenda?.classId || '';
  const activeModalDate = editingAgenda?.tanggal || '';

  useEffect(() => {
    if (!activeModalClassId) return;

    if (!classStudentsMap[activeModalClassId]) {
      getStudents(activeModalClassId)
        .then((stds) => {
          setClassStudentsMap((prev) => ({ ...prev, [activeModalClassId]: stds }));
        })
        .catch(console.error);
    }

    if (!classSessionsMap[activeModalClassId]) {
      getAttendanceSessions(activeModalClassId)
        .then((sessList) => {
          setClassSessionsMap((prev) => ({ ...prev, [activeModalClassId]: sessList }));
        })
        .catch(console.error);
    }
  }, [activeModalClassId, classStudentsMap, classSessionsMap]);

  // Target class students - strictly from selected class_id, sorted A-Z
  const targetClassStudents = useMemo(() => {
    if (!activeModalClassId) return [];
    const fromProps = (students || []).filter((s) => s.classId === activeModalClassId);
    const fromMap = classStudentsMap[activeModalClassId] || [];
    const map = new Map<string, Student>();
    fromMap.forEach((s) => map.set(s.id, s));
    fromProps.forEach((s) => map.set(s.id, s));
    const list = Array.from(map.values());
    return list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [activeModalClassId, classStudentsMap, students]);

  // Target class sessions - strictly from selected class_id
  const targetClassSessions = useMemo(() => {
    if (!activeModalClassId) return [];
    const fromProps = (sessions || []).filter((s) => s.classId === activeModalClassId);
    const fromMap = classSessionsMap[activeModalClassId] || [];
    const map = new Map<string, AttendanceSession>();
    fromMap.forEach((s) => map.set(s.id, s));
    fromProps.forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  }, [activeModalClassId, classSessionsMap, sessions]);

  // Find attendance session matching the agenda's date
  const matchingAttendanceSession = useMemo(() => {
    if (!targetClassSessions || targetClassSessions.length === 0 || !activeModalDate) return null;
    return targetClassSessions.find((s) => s.tanggal === activeModalDate) || null;
  }, [targetClassSessions, activeModalDate]);

  // Breakdown of attendance for this date
  const attendanceBreakdown = useMemo(() => {
    const totalStudents = targetClassStudents.length;
    if (!matchingAttendanceSession || totalStudents === 0) {
      return {
        hasSession: false,
        totalStudents,
        hadir: totalStudents,
        tidakHadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        dispen: 0,
        absentStudents: [] as { name: string; status: string; statusLabel: string; catatan?: string }[],
      };
    }

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let dispen = 0;
    const absentStudents: { name: string; status: string; statusLabel: string; catatan?: string }[] = [];

    targetClassStudents.forEach((std) => {
      const rec = matchingAttendanceSession.records?.[std.id];
      const st = rec?.status || 'H';
      if (st === 'H') hadir++;
      else if (st === 'D') {
        dispen++;
        hadir++;
      } else if (st === 'S') {
        sakit++;
        absentStudents.push({ name: std.nama, status: 'S', statusLabel: 'Sakit', catatan: rec?.catatan });
      } else if (st === 'I') {
        izin++;
        absentStudents.push({ name: std.nama, status: 'I', statusLabel: 'Izin', catatan: rec?.catatan });
      } else if (st === 'A') {
        alpa++;
        absentStudents.push({ name: std.nama, status: 'A', statusLabel: 'Alpa', catatan: rec?.catatan });
      }
    });

    const tidakHadir = sakit + izin + alpa;

    return {
      hasSession: true,
      totalStudents,
      hadir,
      tidakHadir,
      sakit,
      izin,
      alpa,
      dispen,
      absentStudents,
      pertemuanKe: matchingAttendanceSession.pertemuanKe,
      topikMateri: matchingAttendanceSession.topikMateri,
    };
  }, [matchingAttendanceSession, targetClassStudents]);

  // Map of classId -> className & subject
  const classesMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => {
      map[c.id] = c.namaKelas;
    });
    return map;
  }, [classes]);

  const classSubjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => {
      map[c.id] = c.mataPelajaran;
    });
    return map;
  }, [classes]);

  // Persist filter changes
  const handleFilterClassChange = (clsId: string) => {
    setFilterClassId(clsId);
    UiStatePersistence.set('agenda_filter_class', clsId);
  };

  const handleFilterMonthChange = (m: string) => {
    setFilterMonth(m);
    UiStatePersistence.set('agenda_filter_month', m);
  };

  const handleFilterSemesterChange = (s: string) => {
    setFilterSemester(s);
    UiStatePersistence.set('agenda_filter_semester', s);
  };

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return agendas
      .filter((ag) => {
        // Class filter
        if (filterClassId !== 'all' && ag.classId !== filterClassId) {
          return false;
        }
        // Month filter
        if (filterMonth !== 'all' && ag.tanggal) {
          const m = new Date(ag.tanggal).getMonth() + 1;
          if (String(m).padStart(2, '0') !== filterMonth) {
            return false;
          }
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const clsName = (classesMap[ag.classId] || ag.classNameSnapshot || '').toLowerCase();
          const mapel = (classSubjectMap[ag.classId] || ag.mataPelajaran || '').toLowerCase();
          const matchMateri = (ag.materiAjar || '').toLowerCase().includes(q);
          const matchKegiatan = (ag.kegiatan || '').toLowerCase().includes(q);
          const matchCatatan = (ag.catatan || '').toLowerCase().includes(q);
          const matchClass = clsName.includes(q);
          const matchMapel = mapel.includes(q);
          const matchHari = (ag.hari || '').toLowerCase().includes(q);
          if (!matchMateri && !matchKegiatan && !matchCatatan && !matchClass && !matchMapel && !matchHari) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [agendas, filterClassId, filterMonth, searchQuery, classesMap, classSubjectMap]);

  // Current selected class object if not 'all'
  const selectedClassObj = useMemo(() => {
    if (filterClassId === 'all') return null;
    return classes.find((c) => c.id === filterClassId) || null;
  }, [classes, filterClassId]);

  // Metrics
  const stats = useMemo(() => {
    const total = filteredAgendas.length;
    const totalHadir = filteredAgendas.reduce((acc, a) => acc + (a.hadirCount || 0), 0);
    const totalAbsen = filteredAgendas.reduce((acc, a) => acc + (a.tidakHadirCount || 0), 0);
    const sum = totalHadir + totalAbsen;
    const avgKehadiran = sum > 0 ? Math.round((totalHadir / sum) * 100) : 100;
    return { total, totalHadir, totalAbsen, avgKehadiran };
  }, [filteredAgendas]);

  // Collapsible Waktu Mengajar State & Time Helpers
  const [isTimeSectionExpanded, setIsTimeSectionExpanded] = useState<boolean>(true);

  const parseTimeRange = (rangeStr?: string) => {
    if (!rangeStr) return { start: '07:15', end: '09:15' };
    const cleaned = rangeStr.replace(/WIB/gi, '').trim();
    const parts = cleaned.split('-');
    if (parts.length === 2) {
      const s = parts[0].trim();
      const e = parts[1].trim();
      return {
        start: s.length >= 4 ? s.slice(0, 5) : '07:15',
        end: e.length >= 4 ? e.slice(0, 5) : '09:15',
      };
    }
    return { start: '07:15', end: '09:15' };
  };

  const handleStartTimeChange = (newStart: string) => {
    const currentTimes = parseTimeRange(editingAgenda?.rentangJam);
    const newRange = `${newStart} - ${currentTimes.end} WIB`;
    setEditingAgenda((prev) => (prev ? { ...prev, rentangJam: newRange } : null));
  };

  const handleEndTimeChange = (newEnd: string) => {
    const currentTimes = parseTimeRange(editingAgenda?.rentangJam);
    const newRange = `${currentTimes.start} - ${newEnd} WIB`;
    setEditingAgenda((prev) => (prev ? { ...prev, rentangJam: newRange } : null));
  };

  // Handle period toggles
  const handleTogglePeriod = (periodNo: number) => {
    let updated: number[];
    if (selectedPeriods.includes(periodNo)) {
      updated = selectedPeriods.filter((n) => n !== periodNo);
      if (updated.length === 0) updated = [periodNo];
    } else {
      updated = [...selectedPeriods, periodNo].sort((a, b) => a - b);
    }
    setSelectedPeriods(updated);
    const formatted = formatPeriodsToJamKe(updated);
    setEditingAgenda((prev) => (prev ? { ...prev, jamKe: formatted.jamKe, rentangJam: formatted.rentangJam } : null));
  };

  const handleQuickSelectPeriods = (periods: number[]) => {
    setSelectedPeriods(periods);
    const formatted = formatPeriodsToJamKe(periods);
    setEditingAgenda((prev) => (prev ? { ...prev, jamKe: formatted.jamKe, rentangJam: formatted.rentangJam } : null));
  };

  const isPeriodsActive = (periods: number[]) => {
    if (selectedPeriods.length !== periods.length) return false;
    return periods.every((p) => selectedPeriods.includes(p));
  };

  // Sync attendance into agenda form
  const handleSyncFromAttendance = () => {
    if (!editingAgenda) return;
    setEditingAgenda((prev) => {
      if (!prev) return null;
      let newCatatan = prev.catatan || '';
      if (attendanceBreakdown.absentStudents.length > 0) {
        const absentSummary = `Tidak hadir: ${attendanceBreakdown.absentStudents.map((s) => `${s.name} (${s.statusLabel})`).join(', ')}`;
        if (!newCatatan.includes(absentSummary)) {
          newCatatan = newCatatan.trim() ? `${newCatatan} - ${absentSummary}` : absentSummary;
        }
      }
      return {
        ...prev,
        hadirCount: attendanceBreakdown.hadir,
        tidakHadirCount: attendanceBreakdown.tidakHadir,
        catatan: newCatatan,
      };
    });
  };

  const handleSetAllPresentInAgenda = () => {
    if (!editingAgenda) return;
    const total = targetClassStudents.length || editingAgenda.hadirCount || 0;
    setEditingAgenda((prev) => (prev ? { ...prev, hadirCount: total, tidakHadirCount: 0 } : null));
  };

  const handleOpenShare = async () => {
    const classId = filterClassId !== 'all' ? filterClassId : currentClass?.id;
    const shareId = classId ? `agenda_share_${classId}` : 'agenda_share_all';
    const baseUrl = window.location.origin + window.location.pathname;
    const initialUrl = `${baseUrl}?agenda_share=${shareId}`;
    setShareLink(initialUrl);

    const shareRecord: PublicShareRecord = {
      id: shareId,
      type: 'agenda',
      classId: classId,
      title: `Agenda Mengajar Pendidik - ${teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        className: selectedClassObj?.namaKelas || currentClass?.namaKelas || 'Semua Kelas',
        agendas: filteredAgendas,
        teacher: teacher.namaGuru,
        namaSekolah: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
        shareType: 'agenda',
      },
      payload: {
        className: selectedClassObj?.namaKelas || currentClass?.namaKelas || 'Semua Kelas',
        agendas: filteredAgendas,
        teacher: teacher.namaGuru,
        namaSekolah: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
        shareType: 'agenda',
      },
    };

    let targetLink = initialUrl;
    try {
      const token = await createOrUpdatePublicShare(shareRecord);
      const effectiveToken = token || (shareRecord as any).share_token;
      if (effectiveToken) {
        targetLink = `${baseUrl}?agenda_share=${effectiveToken}`;
        setShareLink(targetLink);
      }
    } catch (err) {
      console.warn('Could not sync share to cloud', err);
    }

    try {
      const qr = await QRCode.toDataURL(targetLink, { width: 240, margin: 2 });
      setShareQrUrl(qr);
    } catch (e) {
      console.error(e);
    }
    setShareModalOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle open Add Modal
  const handleOpenAdd = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = days[today.getDay()];

    // Default to the first available class or currentClass
    const initialClassId =
      (filterClassId !== 'all' ? filterClassId : '') ||
      (currentClass ? currentClass.id : '') ||
      (classes.length > 0 ? classes[0].id : '');

    const initialClass = classes.find((c) => c.id === initialClassId);
    const defaultPeriods = [1, 2, 3, 4];
    setSelectedPeriods(defaultPeriods);
    setIsPeriodsExpanded(true);
    const formatted = formatPeriodsToJamKe(defaultPeriods);

    const todayStr = today.toISOString().split('T')[0];
    const stds = classStudentsMap[initialClassId] || (currentClass?.id === initialClassId ? students : []);
    const initialTotal = stds.length;

    const existingSessions = classSessionsMap[initialClassId] || (currentClass?.id === initialClassId ? sessions : []);
    const matchTodaySession = existingSessions.find((s) => s.tanggal === todayStr);

    let initialHadir = initialTotal;
    let initialTidakHadir = 0;
    let initialCatatan = 'Pembelajaran berlangsung kondusif dan tertib.';

    if (matchTodaySession && stds.length > 0) {
      let h = 0;
      let th = 0;
      const absentList: string[] = [];
      stds.forEach((s) => {
        const rec = matchTodaySession.records?.[s.id];
        const st = rec?.status || 'H';
        if (st === 'H' || st === 'D') {
          h++;
        } else {
          th++;
          const label = st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alpa';
          absentList.push(`${s.nama} (${label})`);
        }
      });
      initialHadir = h;
      initialTidakHadir = th;
      if (absentList.length > 0) {
        initialCatatan = `Tidak hadir: ${absentList.join(', ')}`;
      }
    }

    setEditingAgenda({
      id: `ag_${Date.now()}`,
      classId: initialClassId,
      classNameSnapshot: initialClass?.namaKelas || '',
      mataPelajaran: initialClass?.mataPelajaran || teacher.mataPelajaranUtama || '',
      guruName: teacher.namaGuru,
      tanggal: todayStr,
      hari: currentDay,
      jamKe: formatted.jamKe,
      rentangJam: formatted.rentangJam,
      materiAjar: matchTodaySession?.topikMateri || '',
      kegiatan: '',
      catatan: initialCatatan,
      hadirCount: initialHadir,
      tidakHadirCount: initialTidakHadir,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ag: TeachingAgenda) => {
    const parsed = parsePeriodsFromJamKe(ag.jamKe);
    setSelectedPeriods(parsed);
    setIsPeriodsExpanded(false);
    setEditingAgenda({ ...ag });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda?.classId) {
      alert('Pilih kelas terlebih dahulu!');
      return;
    }
    if (!editingAgenda?.materiAjar?.trim()) {
      alert('Materi ajar / Capaian pembelajaran wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const cls = classes.find((c) => c.id === editingAgenda.classId);
      const agendaToSave: TeachingAgenda = {
        ...(editingAgenda as TeachingAgenda),
        classNameSnapshot: cls?.namaKelas || editingAgenda.classNameSnapshot || '',
        mataPelajaran: cls?.mataPelajaran || editingAgenda.mataPelajaran || teacher.mataPelajaranUtama || '',
        guruName: teacher.namaGuru,
        updated_at: new Date().toISOString(),
      };

      await onSaveAgenda(agendaToSave);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSyncTime(timeStr);
      setSyncStatusMsg(`Agenda pertemuan ke-${editingAgenda.pertemuanKe || 1} berhasil disimpan ke Cloud Supabase!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
      setIsModalOpen(false);
      setEditingAgenda(null);
    } catch (err: any) {
      alert('Gagal menyimpan agenda: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAllAgendas = async () => {
    if (filteredAgendas.length === 0) return;
    setIsSavingAll(true);
    try {
      const promises = filteredAgendas.map((ag) => onSaveAgenda(ag));
      await Promise.all(promises);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSyncTime(timeStr);
      setSyncStatusMsg(`Seluruh ${filteredAgendas.length} agenda berhasil disinkronkan ke Cloud Supabase!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan agenda ke cloud: ' + (err.message || 'Error'));
    } finally {
      setIsSavingAll(false);
    }
  };

  // ============================================================================
  // EXCEL AGENDA UPLOAD & PARSER LOGIC
  // ============================================================================

  const handleExcelFileUpload = (file: File) => {
    setImportFileName(file.name);
    setUploadError(null);
    setIsParsingExcel(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setUploadError('Berkas Excel kosong atau tidak memiliki lembar kerja.');
          setIsParsingExcel(false);
          return;
        }

        // Cari sheet yang memiliki baris data
        let foundRows: any[][] = [];
        let chosenSheet = workbook.SheetNames[0];
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) as any[][];
          if (raw && raw.length > 0) {
            foundRows = raw;
            chosenSheet = sName;
            break;
          }
        }

        if (foundRows.length === 0) {
          setUploadError(`Lembar kerja "${chosenSheet}" tidak memiliki data agenda yang dapat dibaca.`);
          setIsParsingExcel(false);
          return;
        }

        parseRawExcelRows(foundRows);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setUploadError('Gagal membaca berkas Excel. Pastikan berkas berformat .xlsx, .xls, atau .csv yang valid.');
      } finally {
        setIsParsingExcel(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const parseRawExcelRows = (rawRows: any[][]) => {
    if (!rawRows || rawRows.length === 0) return;

    // Deteksi baris header (maksimal hingga baris ke-5)
    let headerIdx = 0;
    const headerKeywords = ['tanggal', 'tgl', 'date', 'materi', 'topik', 'kelas', 'jam', 'hari', 'kegiatan'];
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const row = rawRows[i].map((c) => String(c || '').toLowerCase().trim());
      const matchCount = row.filter((c) => headerKeywords.some((kw) => c.includes(kw))).length;
      if (matchCount >= 2) {
        headerIdx = i;
        break;
      }
    }

    const headers = rawRows[headerIdx].map((c) => String(c || '').toLowerCase().trim());

    const findColIdx = (keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((kw) => h === kw || h.includes(kw)));
    };

    const tanggalIdx = findColIdx(['tanggal', 'tgl', 'date']);
    const hariIdx = findColIdx(['hari', 'day']);
    const kelasIdx = findColIdx(['kelas', 'class', 'rombel']);
    const mapelIdx = findColIdx(['mata pelajaran', 'mapel', 'pelajaran', 'subject']);
    const jamKeIdx = findColIdx(['jam ke', 'jamke', 'jam', 'periode', 'period']);
    const rentangJamIdx = findColIdx(['rentang jam', 'rentang', 'waktu', 'time']);
    const materiIdx = findColIdx(['materi ajar', 'materi', 'topik', 'capaian pembelajaran', 'tp', 'materi pokok', 'kompetensi']);
    const kegiatanIdx = findColIdx(['kegiatan pembelajaran', 'kegiatan', 'aktivitas', 'deskripsi']);
    const catatanIdx = findColIdx(['catatan', 'keterangan', 'kendala', 'notes']);
    const hadirIdx = findColIdx(['hadir', 'jumlah hadir', 'h']);
    const tidakHadirIdx = findColIdx(['absen', 'tidak hadir', 'th', 'a', 'jumlah absen']);

    const defaultClass =
      classes.find((c) => c.id === uploadTargetClassId) ||
      classes.find((c) => c.id === filterClassId) ||
      (currentClass ? currentClass : classes[0]);

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const parsed: ParsedAgendaRow[] = [];
    const validIndices = new Set<number>();

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c) => String(c || '').trim() === '')) continue;

      const errors: string[] = [];
      const rawDate = tanggalIdx !== -1 ? row[tanggalIdx] : '';

      // 1. Parsing Tanggal
      let tanggal = '';
      if (typeof rawDate === 'number' && rawDate > 1000) {
        const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        if (!isNaN(jsDate.getTime())) {
          tanggal = jsDate.toISOString().split('T')[0];
        }
      } else if (rawDate) {
        const str = String(rawDate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          tanggal = str;
        } else if (/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/.test(str)) {
          const m = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
          if (m) {
            const day = m[1].padStart(2, '0');
            const month = m[2].padStart(2, '0');
            const year = m[3];
            tanggal = `${year}-${month}-${day}`;
          }
        } else {
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            tanggal = d.toISOString().split('T')[0];
          }
        }
      }

      if (!tanggal) {
        tanggal = new Date().toISOString().split('T')[0];
        errors.push('Tanggal tidak dikenali');
      }

      // 2. Hari
      let hari = hariIdx !== -1 ? String(row[hariIdx] || '').trim() : '';
      if (!hari || !dayNames.includes(hari)) {
        try {
          const d = new Date(tanggal);
          if (!isNaN(d.getTime())) {
            hari = dayNames[d.getDay()] || 'Senin';
          } else {
            hari = 'Senin';
          }
        } catch {
          hari = 'Senin';
        }
      }

      // 3. Kelas
      const rawKelas = kelasIdx !== -1 ? String(row[kelasIdx] || '').trim() : '';
      let matchedClass = defaultClass;
      if (rawKelas) {
        const found = classes.find(
          (c) =>
            c.namaKelas.toLowerCase().trim() === rawKelas.toLowerCase() ||
            c.id === rawKelas ||
            c.namaKelas.toLowerCase().replace(/\s+/g, '') === rawKelas.toLowerCase().replace(/\s+/g, '')
        );
        if (found) {
          matchedClass = found;
        }
      }

      const classId = matchedClass?.id || classes[0]?.id || '';
      const classNameSnapshot = matchedClass?.namaKelas || rawKelas || '-';

      // 4. Mata Pelajaran
      const rawMapel = mapelIdx !== -1 ? String(row[mapelIdx] || '').trim() : '';
      const mataPelajaran = rawMapel || matchedClass?.mataPelajaran || teacher.mataPelajaranUtama || 'Umum';

      // 5. Jam Ke & Rentang Jam
      const rawJamKe = jamKeIdx !== -1 ? String(row[jamKeIdx] || '').trim() : '';
      const rawRentang = rentangJamIdx !== -1 ? String(row[rentangJamIdx] || '').trim() : '';

      const periods = parsePeriodsFromJamKe(rawJamKe || '1 - 4');
      const formattedPeriods = formatPeriodsToJamKe(periods);
      const jamKe = formattedPeriods.jamKe;
      const rentangJam = rawRentang || formattedPeriods.rentangJam;

      // 6. Materi Ajar
      const materiAjar = materiIdx !== -1 ? String(row[materiIdx] || '').trim() : '';
      if (!materiAjar) {
        errors.push('Materi Ajar wajib diisi');
      }

      // 7. Kegiatan & Catatan
      const kegiatan = kegiatanIdx !== -1 ? String(row[kegiatanIdx] || '').trim() : 'Pembelajaran tatap muka';
      const catatan = catatanIdx !== -1 ? String(row[catatanIdx] || '').trim() : 'Seluruh siswa hadir tertib';

      // 8. Hadir & Tidak Hadir
      const rawHadir = hadirIdx !== -1 ? parseInt(String(row[hadirIdx]), 10) : NaN;
      const rawTidakHadir = tidakHadirIdx !== -1 ? parseInt(String(row[tidakHadirIdx]), 10) : NaN;

      const hadirCount = !isNaN(rawHadir) ? rawHadir : 32;
      const tidakHadirCount = !isNaN(rawTidakHadir) ? rawTidakHadir : 0;

      const isValid = errors.length === 0 && Boolean(materiAjar);
      const rowItem: ParsedAgendaRow = {
        rowNum: r + 1,
        id: `ag_imp_${Date.now()}_${r}`,
        classId,
        classNameSnapshot,
        mataPelajaran,
        guruName: teacher.namaGuru,
        tanggal,
        hari,
        jamKe,
        rentangJam,
        materiAjar: materiAjar || 'Topik Pembelajaran',
        kegiatan,
        catatan,
        hadirCount,
        tidakHadirCount,
        isValid,
        errors,
      };

      parsed.push(rowItem);
      if (isValid) {
        validIndices.add(r + 1);
      }
    }

    setParsedImportRows(parsed);
    setSelectedImportIndices(validIndices);
  };

  const toggleImportRow = (rowNum: number) => {
    setSelectedImportIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const selectAllValidImportRows = () => {
    const valid = new Set<number>();
    parsedImportRows.forEach((r) => {
      if (r.isValid) valid.add(r.rowNum);
    });
    setSelectedImportIndices(valid);
  };

  const deselectAllImportRows = () => {
    setSelectedImportIndices(new Set());
  };

  const handleExecuteImport = async () => {
    const selectedRows = parsedImportRows.filter((r) => selectedImportIndices.has(r.rowNum));
    if (selectedRows.length === 0) {
      alert('Pilih minimal satu baris agenda yang akan diimpor.');
      return;
    }

    setIsSavingImport(true);
    try {
      const agendasToSave: TeachingAgenda[] = selectedRows.map((r) => ({
        id: r.id,
        classId: r.classId,
        classNameSnapshot: r.classNameSnapshot,
        mataPelajaran: r.mataPelajaran,
        guruName: r.guruName,
        tanggal: r.tanggal,
        hari: r.hari,
        jamKe: r.jamKe,
        rentangJam: r.rentangJam,
        materiAjar: r.materiAjar,
        kegiatan: r.kegiatan,
        catatan: r.catatan,
        hadirCount: r.hadirCount,
        tidakHadirCount: r.tidakHadirCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      if (onBatchSaveAgendas) {
        await onBatchSaveAgendas(agendasToSave);
      } else {
        await batchSaveTeachingAgendas(agendasToSave);
        for (const ag of agendasToSave) {
          await onSaveAgenda(ag);
        }
      }

      setSyncStatusMsg(`Berhasil mengimpor ${agendasToSave.length} agenda mengajar dari berkas Excel!`);
      setTimeout(() => setSyncStatusMsg(null), 5000);
      setIsUploadExcelOpen(false);
      setParsedImportRows([]);
      setSelectedImportIndices(new Set());
      setImportFileName('');
    } catch (err: any) {
      alert('Gagal mengimpor agenda: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSavingImport(false);
    }
  };

  const handleExportWord = () => {
    const isMultiClass = filterClassId === 'all';
    const classNameHeader = isMultiClass ? 'Semua Kelas' : selectedClassObj?.namaKelas || 'Kelas';
    const mapelHeader = isMultiClass ? teacher.mataPelajaranUtama || 'Semua Mapel' : selectedClassObj?.mataPelajaran || '';

    const rowsHtml = filteredAgendas
      .map(
        (ag, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${ag.hari}, ${ag.tanggal}</td>
          ${isMultiClass ? `<td><strong>${classesMap[ag.classId] || ag.classNameSnapshot || '-'}</strong></td>` : ''}
          <td style="text-align:center;">Jam ${ag.jamKe}<br><small>${ag.rentangJam}</small></td>
          <td><strong>${ag.materiAjar}</strong></td>
          <td>${ag.kegiatan || '-'}</td>
          <td>${ag.catatan || '-'}</td>
          <td style="text-align:center;">${ag.hadirCount}</td>
          <td style="text-align:center;">${ag.tidakHadirCount}</td>
        </tr>
      `
      )
      .join('');

    const contentHtml = `
      <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px;">
        <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 4px;">
          <tr>
            <td style="width: 100px; text-align: center; border: none; vertical-align: middle;">
              <img src="${SCHOOL_CONFIG.logoUrl}" width="90" height="90" style="object-fit: contain;" alt="Logo" />
            </td>
            <td style="text-align: center; border: none; vertical-align: middle;">
              <h4 style="margin: 0; font-size: 11pt; font-weight: bold; letter-spacing: 0.5px;">MAJLIS PENDIDIKAN DASAR DAN MENENGAH</h4>
              <h4 style="margin: 2px 0; font-size: 11pt; font-weight: bold; letter-spacing: 0.5px;">DAERAH MUHAMMADIYAH BATANG</h4>
              <h2 style="margin: 3px 0; font-size: 16pt; font-weight: bold;">SMK MUHAMMADIYAH BAWANG</h2>
              <p style="margin: 2px 0; font-size: 10pt; font-weight: bold; letter-spacing: 3px;">T E R A K R E D I T A S I &ldquo;A&rdquo;</p>
              <p style="margin: 2px 0; font-size: 9pt;">Jl. Bawang-Sukorejo Km 01 Ds. Jlamprang Kec. Bawang Kab. Batang.</p>
              <p style="margin: 2px 0; font-size: 9pt;">Email : smkmuhbawang@gmail.com | Website : www.smkmuhiba.sch.id</p>
              <p style="margin: 2px 0; font-size: 9pt;">Kode Pos. 51274 Telp. (0285) 4486909 Fax. (0285) 4486899</p>
            </td>
            <td style="width: 100px; border: none;"></td>
          </tr>
        </table>
        <div style="border-bottom: 3px solid #000; margin-bottom: 2px;"></div>
        <div style="border-bottom: 1px solid #000;"></div>
      </div>
      <h3 style="text-align:center; margin-bottom: 4px;">BUKU JURNAL & AGENDA MENGAJAR PENDIDIK</h3>
      <p style="text-align:center; margin: 0 0 15px 0;">
        Pendidik: <strong>${teacher.namaGuru}</strong> (NBM: ${teacher.nbm || '-'}) | 
        Kelas: <strong>${classNameHeader}</strong> | Mapel: <strong>${mapelHeader}</strong> | 
        Tahun Ajaran: ${teacher.tahunAjaran} (${teacher.semester})
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:5%;">No</th>
            <th style="width:14%;">Hari / Tanggal</th>
            ${isMultiClass ? '<th style="width:12%;">Kelas</th>' : ''}
            <th style="width:12%;">Jam Pelajaran</th>
            <th style="width:25%;">Materi Pokok / TP</th>
            <th style="width:20%;">Kegiatan Pembelajaran</th>
            <th style="width:14%;">Catatan / Kendala</th>
            <th style="width:5%;">Hadir</th>
            <th style="width:5%;">Absen</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const fileName = isMultiClass
      ? `Jurnal_Mengajar_Semua_Kelas_${teacher.tahunAjaran.replace(/\//g, '-')}`
      : `Jurnal_Mengajar_${selectedClassObj?.namaKelas.replace(/\s+/g, '_')}`;

    exportToWordDocument(fileName, contentHtml);
  };

  // Render format dokumen kertas siap cetak resmi A4 Agenda Mengajar
  const renderAgendaPrintDocument = () => (
    <div className="bg-white text-black font-serif leading-relaxed text-xs print:p-0 print:m-0 print:w-full">
      {/* Kop Surat Resmi Dokumen Siap Cetak */}
      <OfficialLetterhead namaSekolah={teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah} />

      {/* Document Title */}
      <div className="text-center my-4">
        <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-black">
          BUKU JURNAL / AGENDA MENGAJAR PENDIDIK
        </h2>
        <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-black mt-0.5">
          KURIKULUM MERDEKA &bull; TAHUN PELAJARAN {teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran} ({teacher?.semester || SCHOOL_CONFIG.semester})
        </p>
      </div>

      {/* Pendidik & Rombel Info */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-5 font-sans bg-slate-50 print:bg-white p-3 rounded-lg border border-slate-300 print:border-black text-black">
        <div className="space-y-1">
          <p><span className="text-slate-600 print:text-black inline-block w-28">Satuan Pendidikan:</span> <strong>{teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}</strong></p>
          <p><span className="text-slate-600 print:text-black inline-block w-28">Nama Pendidik:</span> <strong>{teacher?.namaGuru || 'Guru Pengampu'}</strong></p>
          <p><span className="text-slate-600 print:text-black inline-block w-28">NBM:</span> {teacher?.nbm || '-'}</p>
          <p><span className="text-slate-600 print:text-black inline-block w-28">Mata Pelajaran:</span> {filterClassId === 'all' ? teacher?.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}</p>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-600 print:text-black inline-block w-28">Kelas / Rombel:</span> <strong>{filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas}</strong></p>
          <p><span className="text-slate-600 print:text-black inline-block w-28">Tahun Ajaran:</span> {teacher?.tahunAjaran || '-'}</p>
          <p><span className="text-slate-600 print:text-black inline-block w-28">Semester:</span> {teacher?.semester || '-'}</p>
        </div>
      </div>

      {/* Table Agendas */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse border border-black text-[11px] font-sans text-black">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100 text-black">
              <th className="border border-black p-2 text-center w-8">No</th>
              <th className="border border-black p-2 text-left w-24">Hari / Tanggal</th>
              {filterClassId === 'all' && (
                <th className="border border-black p-2 text-center w-20">Kelas</th>
              )}
              <th className="border border-black p-2 text-center w-14">Jam Ke</th>
              <th className="border border-black p-2 text-left">Materi / Capaian Pembelajaran</th>
              <th className="border border-black p-2 text-center w-12">Hadir</th>
              <th className="border border-black p-2 text-center w-12">Absen</th>
              <th className="border border-black p-2 text-center w-16">Paraf</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgendas.length === 0 ? (
              <tr>
                <td
                  colSpan={filterClassId === 'all' ? 8 : 7}
                  className="border border-black p-4 text-center text-slate-500 italic"
                >
                  Belum ada entri jurnal mengajar yang sesuai.
                </td>
              </tr>
            ) : (
              filteredAgendas.map((ag, idx) => (
                <tr key={ag.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-2 font-medium">{ag.hari?.substring(0, 3)}, {ag.tanggal}</td>
                  {filterClassId === 'all' && (
                    <td className="border border-black p-2 text-center font-bold">
                      {classesMap[ag.classId] || ag.classNameSnapshot || '-'}
                    </td>
                  )}
                  <td className="border border-black p-2 text-center font-mono">Ke-{ag.jamKe}</td>
                  <td className="border border-black p-2">
                    <p className="font-semibold text-black">{ag.materiAjar}</p>
                    {ag.kegiatan && <p className="text-[10px] text-slate-700 print:text-black mt-0.5">{ag.kegiatan}</p>}
                  </td>
                  <td className="border border-black p-2 text-center font-mono font-bold text-black">{ag.hadirCount ?? 0}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold text-black">{ag.tidakHadirCount ?? 0}</td>
                  <td className="border border-black p-2 text-center font-mono text-[9px] text-black">&#10003;</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan Resmi Dokumen */}
      <div className="pt-6 font-sans text-xs text-black break-inside-avoid print:break-inside-avoid">
        <div className="flex justify-end mb-4">
          <p className="text-black">
            Bawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="font-semibold text-black">Mengetahui,</p>
            <p className="font-semibold text-black">Kepala {teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}</p>
            <div className="h-16 flex items-end justify-center">
              <p className="font-bold underline text-black">
                {teacher?.namaKepalaSekolah ? teacher.namaKepalaSekolah : '( .................................................... )'}
              </p>
            </div>
            <p className="text-[10px] text-slate-700 print:text-black font-mono mt-0.5">
              {teacher?.nbmKepalaSekolah
                ? `NBM. ${teacher.nbmKepalaSekolah}`
                : 'NBM. ........................................'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-black">Pendidik Pengampu Mata Pelajaran,</p>
            <p className="text-slate-700 print:text-black">{filterClassId === 'all' ? teacher?.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}</p>
            <div className="h-16 flex items-end justify-center">
              <p className="font-bold underline text-black">{teacher?.namaGuru || 'Guru Pengampu'}</p>
            </div>
            <p className="text-[10px] text-slate-700 print:text-black font-mono mt-0.5">
              NBM: {teacher?.nbm || '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Tampilan Laman Web Interaktif - Sembunyikan Total Saat Print */}
      <div className="space-y-6 no-print">
        {/* Top Banner Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full border border-indigo-100 dark:border-indigo-900/60">
                {filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas || 'Kelas Terpilih'}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {filterClassId === 'all' ? teacher.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                T.A. {teacher.tahunAjaran} ({teacher.semester})
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
              Buku Jurnal / Agenda Mengajar Pendidik
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pencatatan tatap muka, materi TP Kurikulum Merdeka, dan dinamika kelas pendidik {SCHOOL_CONFIG.namaSekolah}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewPdfOpen(true)}
              className="min-h-[44px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              title="Buka Dokumen Kertas Siap Cetak Resmi"
            >
              <Printer className="w-4 h-4" />
              Dokumen Siap Cetak
            </button>

            <button
              type="button"
              onClick={() => setIsPreviewPdfOpen(true)}
              className="min-h-[44px] px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Lihat format cetak PDF resmi"
            >
              <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Preview PDF
            </button>

          <button
            type="button"
            onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
            className="min-h-[44px] px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer"
            title="Unduh berkas PDF siap cetak"
          >
            <Download className="w-4 h-4" />
            Unduh PDF
          </button>

          {/* Tombol Unggah / Impor Excel Agenda Mengajar */}
          <button
            type="button"
            onClick={() => {
              setUploadTargetClassId(filterClassId !== 'all' ? filterClassId : (classes[0]?.id || ''));
              setParsedImportRows([]);
              setSelectedImportIndices(new Set());
              setImportFileName('');
              setUploadError(null);
              setIsUploadExcelOpen(true);
            }}
            className="min-h-[44px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Unggah dan impor berkas Excel agenda mengajar"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportAgendasToExcel(filteredAgendas, selectedClassObj, teacher, classesMap)}
            className="min-h-[44px] px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900 cursor-pointer"
            title="Unduh data agenda ke berkas Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Unduh Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            className="min-h-[44px] px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-800 dark:text-blue-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-900 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Word
          </button>

          {/* Tombol Bagikan Link Publik Agenda Mengajar */}
          <button
            type="button"
            onClick={handleOpenShare}
            className="min-h-[44px] px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-900 cursor-pointer"
            title="Bagikan Tautan Preview Publik Agenda Mengajar (Dilindungi Token Aman)"
          >
            <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bagikan Link</span>
          </button>

          {/* Tombol Simpan Agenda ke Cloud Supabase */}
          <button
            type="button"
            onClick={handleSyncAllAgendas}
            disabled={isSavingAll || filteredAgendas.length === 0}
            className="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            title="Simpan dan sinkronkan seluruh agenda mengajar ke database cloud Supabase secara real-time"
          >
            {isSavingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Cloud...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Simpan Agenda ke Cloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Agenda Baru
          </button>
        </div>
      </div>

      {/* Real-time Save Notification Banner */}
      {syncStatusMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          {lastSyncTime && (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
              {lastSyncTime}
            </span>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Agenda
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.total} <span className="text-xs font-normal text-slate-500">pertemuan</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kelas Terpantau
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {filterClassId === 'all' ? classes.length : 1} <span className="text-xs font-normal text-slate-500">kelas</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rata-rata Hadir
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats.avgKehadiran}%
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tahun Ajaran
          </p>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-2 truncate">
            {teacher.tahunAjaran} ({teacher.semester})
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Class Filter (Searchable Dropdown with min 44px touch target) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Filter Kelas
            </label>
            <SearchableClassSelect
              classes={classes}
              selectedClassId={filterClassId}
              onChange={handleFilterClassChange}
              includeAllOption={true}
              allOptionLabel="Semua Kelas"
              placeholder="Pilih atau cari kelas..."
            />
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Bulan
            </label>
            <select
              value={filterMonth}
              onChange={(e) => handleFilterMonthChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[46px] px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => handleFilterSemesterChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[46px] px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Semester</option>
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Pencarian
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari materi, kelas, topik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[46px] pl-10 pr-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View mode toggle & active filter info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredAgendas.length}</strong> dari{' '}
            <span className="font-mono">{agendas.length}</span> total agenda
            {filterClassId !== 'all' && (
              <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                (Filter: {selectedClassObj?.namaKelas})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-xl transition ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Agenda Entries Display */}
      {filteredAgendas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Tidak ada catatan agenda mengajar yang sesuai filter.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Klik "Catat Agenda Baru" untuk menambahkan kegiatan pembelajaran atau ubah kriteria filter di atas.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (User specification 3: | Tanggal | Guru | Mapel | Kelas | Pertemuan | Materi | Status |) */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3 w-28">Tanggal</th>
                  <th className="py-3 px-3 min-w-[130px]">Pendidik</th>
                  <th className="py-3 px-3 min-w-[140px]">Mapel</th>
                  <th className="py-3 px-3 min-w-[110px]">Kelas</th>
                  <th className="py-3 px-3 text-center w-28">Pertemuan / Jam</th>
                  <th className="py-3 px-4 min-w-[260px]">Materi & Kegiatan</th>
                  <th className="py-3 px-3 text-center w-24">Kehadiran</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAgendas.map((ag, idx) => {
                  const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
                  const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';
                  const guru = ag.guruName || teacher.namaGuru;

                  return (
                    <tr
                      key={ag.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {ag.tanggal}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {ag.hari}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {guru}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 dark:text-slate-300">
                          {mapel}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] inline-block border border-indigo-100 dark:border-indigo-900/60">
                          {clsName}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          Ke-{ag.jamKe}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {ag.rentangJam}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white leading-snug">
                          {ag.materiAjar}
                        </p>
                        {ag.kegiatan && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {ag.kegiatan}
                          </p>
                        )}
                        {ag.catatan && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                            Catatan: {ag.catatan}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            Total: {(ag.hadirCount ?? 0) + (ag.tidakHadirCount ?? 0)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                              H: {ag.hadirCount ?? 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px]">
                              TH: {ag.tidakHadirCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ag)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                            title="Edit Catatan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                                await onDeleteAgenda(ag.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Prominent Save Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {lastSyncTime
                  ? `Terakhir disimpan ke Cloud Supabase: ${lastSyncTime}`
                  : 'Seluruh agenda mengajar tersimpan aman dan terenkripsi di PostgreSQL Supabase.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncAllAgendas}
              disabled={isSavingAll || filteredAgendas.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {isSavingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Semua Agenda ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="space-y-4">
          {filteredAgendas.map((ag) => {
            const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
            const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';

            return (
              <div
                key={ag.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold font-mono">
                      {ag.hari}, {ag.tanggal}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-900/60">
                      {clsName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Jam: {ag.jamKe} ({ag.rentangJam})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
                      Total: {(ag.hadirCount ?? 0) + (ag.tidakHadirCount ?? 0)}
                    </span>
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold">
                      Hadir: {ag.hadirCount ?? 0}
                    </span>
                    <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold">
                      Tidak Hadir: {ag.tidakHadirCount ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ag)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition ml-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                          await onDeleteAgenda(ag.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Mapel: {mapel}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {ag.materiAjar}
                  </h4>
                  {ag.kegiatan && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <strong className="text-slate-800 dark:text-slate-200">Kegiatan Pembelajaran: </strong>
                      {ag.kegiatan}
                    </p>
                  )}
                  {ag.catatan && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                      <strong className="not-italic text-slate-700 dark:text-slate-300">Catatan / Evaluasi: </strong>
                      {ag.catatan}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Agenda */}
      {isModalOpen && editingAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingAgenda.materiAjar ? 'Edit Agenda Mengajar' : 'Catat Agenda Mengajar Baru'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Dapat dicatat untuk semua kelas yang tersedia pada Data Kelas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Kelas (Searchable Dropdown with min 44px touch target) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Kelas / Rombel Target <span className="text-rose-500">*</span>
                </label>
                <SearchableClassSelect
                  classes={classes}
                  selectedClassId={editingAgenda.classId || ''}
                  onChange={(newClsId) => {
                    const sel = classes.find((c) => c.id === newClsId);
                    const stds = classStudentsMap[newClsId] || (currentClass?.id === newClsId ? students : []);
                    const sessList = classSessionsMap[newClsId] || (currentClass?.id === newClsId ? sessions : []);
                    const curDate = editingAgenda.tanggal || '';
                    const matchSess = sessList.find((s) => s.tanggal === curDate);

                    let hadir = stds.length;
                    let tidakHadir = 0;
                    let absentNote = '';

                    if (matchSess && stds.length > 0) {
                      let h = 0;
                      let th = 0;
                      const absentList: string[] = [];
                      stds.forEach((s) => {
                        const rec = matchSess.records?.[s.id];
                        const st = rec?.status || 'H';
                        if (st === 'H' || st === 'D') {
                          h++;
                        } else {
                          th++;
                          const label = st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alpa';
                          absentList.push(`${s.nama} (${label})`);
                        }
                      });
                      hadir = h;
                      tidakHadir = th;
                      if (absentList.length > 0) {
                        absentNote = `Tidak hadir: ${absentList.join(', ')}`;
                      }
                    }

                    setEditingAgenda((prev) => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        classId: newClsId,
                        classNameSnapshot: sel?.namaKelas || '',
                        mataPelajaran: sel?.mataPelajaran || prev.mataPelajaran || teacher.mataPelajaranUtama,
                        materiAjar: matchSess?.topikMateri || prev.materiAjar,
                        hadirCount: hadir,
                        tidakHadirCount: tidakHadir,
                        catatan: absentNote || prev.catatan,
                      };
                    });
                  }}
                  placeholder="Pilih kelas yang diajar..."
                  required
                />
              </div>

              {/* SEKSI WAKTU MENGAJAR - Collapsible (Bisa Roll / Tutup) */}
              <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                {/* Header Collapsible Waktu Mengajar */}
                <div
                  onClick={() => setIsTimeSectionExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none transition border-b border-slate-200/60 dark:border-slate-700/60"
                  title={isTimeSectionExpanded ? 'Tutup Waktu Mengajar' : 'Buka Waktu Mengajar'}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                        WAKTU MENGAJAR
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {editingAgenda.tanggal ? new Date(editingAgenda.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Tanggal belum diisi'} &bull; {editingAgenda.rentangJam || '07:15 - 09:15 WIB'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                  >
                    {isTimeSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Body Collapsible Waktu Mengajar */}
                {isTimeSectionExpanded && (
                  <div className="p-3.5 space-y-3.5 max-h-[360px] overflow-y-auto animate-in fade-in duration-200">
                    {/* Grid Tanggal & Hari */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Tanggal <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={editingAgenda.tanggal || ''}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const d = new Date(newDate);
                            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                            const curClsId = editingAgenda.classId || '';
                            const stds = classStudentsMap[curClsId] || (currentClass?.id === curClsId ? students : []);
                            const sessList = classSessionsMap[curClsId] || (currentClass?.id === curClsId ? sessions : []);
                            const matchSess = sessList.find((s) => s.tanggal === newDate);

                            let hadir = stds.length || editingAgenda.hadirCount || 0;
                            let tidakHadir = 0;
                            let absentNote = '';

                            if (matchSess && stds.length > 0) {
                              let h = 0;
                              let th = 0;
                              const absentList: string[] = [];
                              stds.forEach((s) => {
                                const rec = matchSess.records?.[s.id];
                                const st = rec?.status || 'H';
                                if (st === 'H' || st === 'D') {
                                  h++;
                                } else {
                                  th++;
                                  const label = st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alpa';
                                  absentList.push(`${s.nama} (${label})`);
                                }
                              });
                              hadir = h;
                              tidakHadir = th;
                              if (absentList.length > 0) {
                                absentNote = `Tidak hadir: ${absentList.join(', ')}`;
                              }
                            }

                            setEditingAgenda((prev) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                tanggal: newDate,
                                hari: days[d.getDay()] || 'Senin',
                                materiAjar: matchSess?.topikMateri || prev.materiAjar,
                                hadirCount: hadir,
                                tidakHadirCount: tidakHadir,
                                catatan: absentNote || prev.catatan,
                              };
                            });
                          }}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Hari
                        </label>
                        <input
                          type="text"
                          required
                          value={editingAgenda.hari || ''}
                          onChange={(e) => setEditingAgenda({ ...editingAgenda, hari: e.target.value })}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Grid Jam Mulai & Jam Selesai */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Jam Mulai
                        </label>
                        <input
                          type="time"
                          value={parseTimeRange(editingAgenda.rentangJam).start}
                          onChange={(e) => handleStartTimeChange(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Jam Selesai
                        </label>
                        <input
                          type="time"
                          value={parseTimeRange(editingAgenda.rentangJam).end}
                          onChange={(e) => handleEndTimeChange(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Detail Jam Pelajaran & Pilih Cepat */}
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Jam ke:
                          </span>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {editingAgenda.jamKe || '1 - 4'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Pilih Cepat:</span>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPeriods([1, 2, 3, 4])}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                              isPeriodsActive([1, 2, 3, 4])
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            1-4
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPeriods([5, 6, 7, 8])}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                              isPeriodsActive([5, 6, 7, 8])
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            5-8
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickSelectPeriods([9, 10, 11, 12])}
                            className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                              isPeriodsActive([9, 10, 11, 12])
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            9-12
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsPeriodsExpanded((prev) => !prev)}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isPeriodsExpanded ? 'Tutup Daftar' : '12 Jam'}</span>
                            {isPeriodsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Grid 2 Kolom 12 Jam Pelajaran */}
                      {isPeriodsExpanded && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {TEACHING_PERIODS.map((period) => {
                            const isSelected = selectedPeriods.includes(period.no);
                            return (
                              <div
                                key={period.no}
                                onClick={() => handleTogglePeriod(period.no)}
                                className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span
                                  className={`text-[11px] ${
                                    isSelected
                                      ? 'text-indigo-950 dark:text-indigo-200 font-bold'
                                      : 'text-slate-700 dark:text-slate-300 font-medium'
                                  }`}
                                >
                                  {period.no}. ({period.timeRange})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Materi Pokok / Capaian Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Analisis Kebutuhan Bandwidth & Konfigurasi Simple Queue"
                  value={editingAgenda.materiAjar || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, materiAjar: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Kegiatan Pembelajaran & Sintaks
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi kegiatan (Apersepsi, Diskusi kelompok, Praktikum lab, Refleksi)..."
                  value={editingAgenda.kegiatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, kegiatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Catatan / Evaluasi / Kendala
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan keaktifan murid, kendala perangkat lab, atau tindak lanjut..."
                  value={editingAgenda.catatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, catatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* SEKSI INTEGRASI PRESENSI MURID DENGAN KELAS */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Integrasi Presensi Kelas
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                      {targetClassStudents.length} Murid
                    </span>
                  </div>

                  {matchingAttendanceSession ? (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Presensi Ditemukan (Pertemuan Ke-{matchingAttendanceSession.pertemuanKe})
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Belum ada sesi presensi pada {editingAgenda.tanggal || 'tanggal ini'}
                    </span>
                  )}
                </div>

                {/* Kartu Ringkasan Kehadiran */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">TOTAL MURID</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      {targetClassStudents.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">HADIR</span>
                    <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                      {attendanceBreakdown.hadir}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold">TIDAK HADIR</span>
                    <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300 font-mono">
                      {attendanceBreakdown.tidakHadir}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block font-bold">DETAIL ABSEN</span>
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 font-mono">
                      S:{attendanceBreakdown.sakit} I:{attendanceBreakdown.izin} A:{attendanceBreakdown.alpa}
                    </span>
                  </div>
                </div>

                {/* Daftar Murid yang Tidak Hadir */}
                {attendanceBreakdown.absentStudents.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs">
                    <span className="font-bold text-rose-800 dark:text-rose-300 text-[11px] block mb-1">
                      Murid tidak hadir ({attendanceBreakdown.absentStudents.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {attendanceBreakdown.absentStudents.map((abs, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] font-semibold"
                        >
                          {abs.name} ({abs.statusLabel})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tombol Aksi Sinkronkan */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncFromAttendance}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Tarik data hadir & tidak hadir dari presensi murid kelas ini"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sinkronkan Hadir & Tidak Hadir dari Presensi
                  </button>
                  <button
                    type="button"
                    onClick={handleSetAllPresentInAgenda}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Semua Hadir ({targetClassStudents.length})
                  </button>
                </div>

                {/* Input Manual Hadir & Tidak Hadir */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Jumlah Hadir
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingAgenda.hadirCount ?? 0}
                      onChange={(e) => setEditingAgenda({ ...editingAgenda, hadirCount: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Jumlah Tidak Hadir
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingAgenda.tidakHadirCount ?? 0}
                      onChange={(e) => setEditingAgenda({ ...editingAgenda, tidakHadirCount: Number(e.target.value) })}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Cloud Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Simpan Agenda ke Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Dokumen Siap Cetak Kertas Khusus Print Langsung (Ctrl+P saat modal tidak dibuka) */}
      {!isPreviewPdfOpen && (
        <div className="hidden print:block print-document bg-white text-black p-0 m-0 w-full">
          {renderAgendaPrintDocument()}
        </div>
      )}

      {/* Modal Preview PDF Agenda Mengajar */}
      {isPreviewPdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print-modal-active">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh] print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:max-h-none print:p-0 print:m-0 print:bg-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 no-print">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Dokumen Siap Cetak & PDF Agenda Mengajar
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {filterClassId === 'all' ? 'Seluruh Kelas' : selectedClassObj?.namaKelas} &bull; T.A. {teacher.tahunAjaran} ({teacher.semester})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewPdfOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Paper Simulation Canvas */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1 print:bg-white print:p-0 print:m-0 print:overflow-visible">
              <div className="bg-white mx-auto p-6 sm:p-10 shadow-lg rounded-xl border border-slate-200 text-slate-900 max-w-[210mm] font-serif leading-relaxed text-xs print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:bg-white print-document">
                {renderAgendaPrintDocument()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Format resmi sesuai standar kurikulum {SCHOOL_CONFIG.namaSekolah}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewPdfOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unggah / Impor Excel Agenda Mengajar */}
      {isUploadExcelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">
                    Unggah & Impor Agenda Mengajar Excel
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Parser cerdas berkas .xlsx, .xls, .csv dengan deteksi tanggal, kelas, jam, dan kehadiran otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadExcelOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Guidance & Template Download */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Format Kolom Excel yang Didukung
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kolom: <strong>No, Tanggal, Hari, Kelas, Mapel, Jam Ke, Rentang Jam, Materi Ajar, Kegiatan, Catatan, Hadir, Absen</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadAgendaTemplateExcel(classes, teacher)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Unduh Template Excel</span>
                </button>
              </div>

              {/* Target Class Default Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                    Kelas Default untuk Baris Tanpa Nama Kelas:
                  </span>
                  <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                    Jika kolom kelas di Excel kosong, baris otomatis diasosiasikan ke kelas ini.
                  </span>
                </div>
                <select
                  value={uploadTargetClassId}
                  onChange={(e) => setUploadTargetClassId(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaKelas} ({c.mataPelajaran})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop / File Input Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleExcelFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-6 text-center transition ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:border-emerald-400'
                }`}
              >
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                    {isParsingExcel ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <FileUp className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Tarik & Letakkan Berkas Excel ke sini, atau klik tombol di bawah
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Mendukung berkas Microsoft Excel (.xlsx, .xls) dan CSV
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Berkas Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleExcelFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {importFileName && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                      Berkas terpilih: {importFileName}
                    </p>
                  )}
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Hasil Analisis Berkas:
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                        {parsedImportRows.length} baris
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {selectedImportIndices.size} terpilih untuk diimpor
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllValidImportRows}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                      >
                        Pilih Semua Valid
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                      <button
                        type="button"
                        onClick={deselectAllImportRows}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedImportIndices.size === parsedImportRows.filter((r) => r.isValid).length && parsedImportRows.filter((r) => r.isValid).length > 0}
                              onChange={(e) => {
                                if (e.target.checked) selectAllValidImportRows();
                                else deselectAllImportRows();
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3 w-28">Tanggal</th>
                          <th className="p-3 w-24">Kelas</th>
                          <th className="p-3 w-24">Jam Ke</th>
                          <th className="p-3">Materi Ajar</th>
                          <th className="p-3 w-24 text-center">Kehadiran</th>
                          <th className="p-3 w-28 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedImportRows.map((row) => {
                          const isSelected = selectedImportIndices.has(row.rowNum);
                          return (
                            <tr
                              key={row.rowNum}
                              onClick={() => toggleImportRow(row.rowNum)}
                              className={`transition cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              } ${!row.isValid ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleImportRow(row.rowNum)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="p-3 text-center font-mono text-slate-400">
                                {row.rowNum}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                  {row.hari}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {row.tanggal}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                                {row.classNameSnapshot}
                              </td>
                              <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {row.jamKe}
                              </td>
                              <td className="p-3">
                                <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                  {row.materiAjar}
                                </p>
                                {row.kegiatan && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {row.kegiatan}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap font-mono text-[11px]">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  H: {row.hadirCount}
                                </span>{' '}
                                <span className="text-rose-600 dark:text-rose-400">
                                  A: {row.tidakHadirCount}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    Siap Impor
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold"
                                    title={row.errors.join(', ')}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Periksa
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsUploadExcelOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isSavingImport || selectedImportIndices.size === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-[#009B62] to-[#008276] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingImport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Agenda...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Impor {selectedImportIndices.size} Agenda Terpilih</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg">Bagikan Agenda Mengajar</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tautan publik aman dilindungi token unik. Pihak sekolah, kepala sekolah, atau pengawas dapat memeriksa agenda kegiatan belajar mengajar secara langsung.
              </p>
            </div>

            {shareQrUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
                <img src={shareQrUrl} alt="QR Code Share" className="w-48 h-48 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">Scan QR Code dengan kamera smartphone</p>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-left">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="w-full bg-transparent text-xs font-mono text-slate-700 px-2 focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-700 font-bold flex items-center gap-1 transition"
                  title="Buka Halaman Preview Publik di Tab Baru"
                >
                  Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = shareLink;
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-700 font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Buka Preview Publik Langsung di Halaman Ini"
                >
                  Buka Langsung
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
