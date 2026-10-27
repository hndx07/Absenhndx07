import { useState, useMemo, useEffect, useCallback } from 'react';
import { TeachingAgenda, ClassRoom, Student, AttendanceSession, PublicShareRecord } from '../../../types';
import {
  exportAgendasToExcel,
  exportToWordDocument,
  exportAgendaToPDF,
  downloadAgendaTemplateExcel,
} from '../../../utils/exportUtils';
import { SCHOOL_CONFIG } from '../../../config/schoolConfig';
import { UiStatePersistence } from '../../../utils/storageCache';
import { getStudents, getAttendanceSessions, batchSaveTeachingAgendas, createOrUpdatePublicShare } from '../../../services/data';
import {
  TeachingAgendaViewProps,
  ParsedAgendaRow,
  parsePeriodsFromJamKe,
  formatPeriodsToJamKe,
} from '../types';

export function useTeachingAgendaState({
  classes,
  agendas,
  teacher,
  currentClass,
  students = [],
  sessions = [],
  onSaveAgenda,
  onDeleteAgenda,
  onBatchSaveAgendas,
}: TeachingAgendaViewProps) {
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
        .then((stds: Student[]) => {
          setClassStudentsMap((prev) => ({ ...prev, [activeModalClassId]: stds }));
        })
        .catch(console.error);
    }

    if (!classSessionsMap[activeModalClassId]) {
      getAttendanceSessions(activeModalClassId)
        .then((sessList: AttendanceSession[]) => {
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
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => (prev ? { ...prev, rentangJam: newRange } : null));
  };

  const handleEndTimeChange = (newEnd: string) => {
    const currentTimes = parseTimeRange(editingAgenda?.rentangJam);
    const newRange = `${currentTimes.start} - ${newEnd} WIB`;
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => (prev ? { ...prev, rentangJam: newRange } : null));
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
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => (prev ? { ...prev, jamKe: formatted.jamKe, rentangJam: formatted.rentangJam } : null));
  };

  const handleQuickSelectPeriods = (periods: number[]) => {
    setSelectedPeriods(periods);
    const formatted = formatPeriodsToJamKe(periods);
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => (prev ? { ...prev, jamKe: formatted.jamKe, rentangJam: formatted.rentangJam } : null));
  };

  const isPeriodsActive = (periods: number[]) => {
    if (selectedPeriods.length !== periods.length) return false;
    return periods.every((p) => selectedPeriods.includes(p));
  };

  // Sync attendance into agenda form
  const handleSyncFromAttendance = () => {
    if (!editingAgenda) return;
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => {
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
    setEditingAgenda((prev: Partial<TeachingAgenda> | null) => (prev ? { ...prev, hadirCount: total, tidakHadirCount: 0 } : null));
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
      const QRCode = (await import('qrcode')).default;
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

  // EXCEL AGENDA UPLOAD & PARSER LOGIC
  const parseRawExcelRows = useCallback((rawRows: any[][]) => {
    if (!rawRows || rawRows.length === 0) return;

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
  }, [classes, currentClass, filterClassId, teacher.mataPelajaranUtama, teacher.namaGuru, uploadTargetClassId]);

  const handleExcelFileUpload = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError('Format berkas tidak didukung. Harap pilih berkas dengan format .xlsx, .xls, atau .csv.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    setImportFileName(file.name);
    setUploadError(null);
    setIsParsingExcel(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setUploadError('Berkas Excel kosong atau tidak memiliki lembar kerja.');
          setIsParsingExcel(false);
          return;
        }

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

  const handleExportPDF = () => {
    exportAgendaToPDF(
      filteredAgendas,
      selectedClassObj,
      teacher,
      classesMap
    );
  };

  const handleExportExcel = () => {
    exportAgendasToExcel(
      filteredAgendas,
      selectedClassObj,
      teacher,
      classesMap
    );
  };

  const handleDownloadTemplate = () => {
    downloadAgendaTemplateExcel(classes, teacher);
  };

  return {
    filterClassId,
    filterMonth,
    filterSemester,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    handleFilterClassChange,
    handleFilterMonthChange,
    handleFilterSemesterChange,
    isModalOpen,
    setIsModalOpen,
    isPreviewPdfOpen,
    setIsPreviewPdfOpen,
    isSaving,
    isSavingAll,
    syncStatusMsg,
    lastSyncTime,
    editingAgenda,
    setEditingAgenda,
    shareModalOpen,
    setShareModalOpen,
    shareLink,
    shareQrUrl,
    copiedLink,
    copyShareLink,
    handleOpenShare,
    isUploadExcelOpen,
    setIsUploadExcelOpen,
    importFileName,
    setImportFileName,
    parsedImportRows,
    setParsedImportRows,
    selectedImportIndices,
    isParsingExcel,
    isSavingImport,
    uploadTargetClassId,
    setUploadTargetClassId,
    uploadError,
    setUploadError,
    isDragOver,
    setIsDragOver,
    handleExcelFileUpload,
    toggleImportRow,
    selectAllValidImportRows,
    deselectAllImportRows,
    handleExecuteImport,
    isPeriodsExpanded,
    setIsPeriodsExpanded,
    selectedPeriods,
    handleTogglePeriod,
    handleQuickSelectPeriods,
    isPeriodsActive,
    isTimeSectionExpanded,
    setIsTimeSectionExpanded,
    parseTimeRange,
    handleStartTimeChange,
    handleEndTimeChange,
    handleSyncFromAttendance,
    handleSetAllPresentInAgenda,
    handleOpenAdd,
    handleOpenEdit,
    handleSubmit,
    handleSyncAllAgendas,
    handleExportWord,
    handleExportPDF,
    handleExportExcel,
    handleDownloadTemplate,
    classesMap,
    classSubjectMap,
    filteredAgendas,
    selectedClassObj,
    stats,
    attendanceBreakdown,
    targetClassStudents,
  };
}
