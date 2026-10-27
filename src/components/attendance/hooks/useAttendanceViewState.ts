import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AttendanceSession,
  AttendanceStatus,
  Student,
  PublicShareRecord,
} from '../../../types';
import { exportAttendanceToExcel, exportAttendanceToPDF } from '../../../utils/exportUtils';
import {
  createOrUpdatePublicShare,
  getStudents,
  getAttendanceSessions,
  resequenceStudentsAlphabetically,
  sanitizePublicStudent,
} from '../../../services/data';
import { SCHOOL_CONFIG } from '../../../config/schoolConfig';
import { formatPeriodsToJamKe } from '../../../utils/teachingPeriods';
import {
  AttendanceViewProps,
  getIndoDay,
  parseTimeRangeHelper,
  NewSessionFormData,
} from '../types';

export function useAttendanceViewState({
  currentClass,
  students,
  sessions,
  teacher,
  agendas = [],
  onNavigateToAgenda,
  onSaveSession,
  onDeleteSession,
}: AttendanceViewProps) {
  const classStudents = useMemo(() => {
    const raw = students.filter((s) => s.classId === currentClass.id);
    return resequenceStudentsAlphabetically(raw, currentClass.id);
  }, [students, currentClass.id]);

  const classSessions = useMemo(() => {
    return sessions
      .filter((s) => s.classId === currentClass.id)
      .sort((a, b) => b.pertemuanKe - a.pertemuanKe);
  }, [sessions, currentClass.id]);

  const [activeSessionId, setActiveSessionId] = useState<string>(
    classSessions[0]?.id || ''
  );
  const [isMeetingsPanelOpen, setIsMeetingsPanelOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newSelectedPeriods, setNewSelectedPeriods] = useState<number[]>([1, 2, 3, 4]);
  const [isNewTimeSectionExpanded, setIsNewTimeSectionExpanded] = useState(false);
  const [isNewPeriodsExpanded, setIsNewPeriodsExpanded] = useState(false);

  const [newSessionData, setNewSessionData] = useState<NewSessionFormData>({
    tanggal: new Date().toISOString().split('T')[0],
    hari: getIndoDay(new Date().toISOString().split('T')[0]),
    pertemuanKe: (classSessions.length > 0 ? Math.max(...classSessions.map((s) => s.pertemuanKe)) : 0) + 1,
    jamKe: '1 - 4',
    rentangJam: '07:15 - 09:15 WIB',
    topikMateri: '',
    kegiatan: '',
    catatan: '',
  });

  // Edit Existing Session States
  const [editingSessionData, setEditingSessionData] = useState<AttendanceSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSelectedPeriods, setEditSelectedPeriods] = useState<number[]>([1, 2, 3, 4]);
  const [isEditTimeSectionExpanded, setIsEditTimeSectionExpanded] = useState(false);
  const [isEditPeriodsExpanded, setIsEditPeriodsExpanded] = useState(false);

  const [filterQuery, setFilterQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'no' | 'name-asc' | 'name-desc'>('name-asc');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshingShare, setIsRefreshingShare] = useState(false);

  // WhatsApp Report States
  const [isWaReportModalOpen, setIsWaReportModalOpen] = useState(false);
  const [waReportMode, setWaReportMode] = useState<'group' | 'personal'>('group');
  const [selectedStudentForWa, setSelectedStudentForWa] = useState<Student | null>(null);
  const [waReportText, setWaReportText] = useState('');
  const [waCopied, setWaCopied] = useState(false);
  const [isWaPreviewExpanded, setIsWaPreviewExpanded] = useState(false);
  const [waInlineCopied, setWaInlineCopied] = useState(false);

  // Cloud Real-time Save States
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Optimistic local sessions state for ZERO-DELAY instant click responsiveness
  const [localSessions, setLocalSessions] = useState<Record<string, AttendanceSession>>({});
  const saveDebounceTimerRef = useRef<any>(null);

  // Sync prop classSessions into localSessions when classSessions change
  useEffect(() => {
    setLocalSessions((prev) => {
      let changed = false;
      const next = { ...prev };
      classSessions.forEach((s) => {
        if (!next[s.id] || JSON.stringify(next[s.id]) !== JSON.stringify(s)) {
          next[s.id] = s;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [classSessions]);

  // Selected session for editing records (reads from optimistic local state first)
  const currentSession: AttendanceSession | undefined =
    localSessions[activeSessionId] ||
    classSessions.find((s) => s.id === activeSessionId) ||
    classSessions[0];

  // Agenda Mengajar yang tersinkronisasi otomatis dengan sesi presensi ini
  const syncedAgenda = useMemo(() => {
    if (!currentSession || !agendas) return null;
    return (
      agendas.find((a) => a.id === `ag_att_${currentSession.id}`) ||
      agendas.find((a) => a.classId === currentClass.id && a.tanggal === currentSession.tanggal) ||
      agendas.find((a) => a.classId === currentClass.id && a.pertemuanKe === currentSession.pertemuanKe) ||
      null
    );
  }, [agendas, currentSession, currentClass.id]);

  // Background debounced cloud sync (prevents network wait and race conditions)
  const scheduleSessionCloudSave = (sessionToSave: AttendanceSession) => {
    setHasUnsavedChanges(true);
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    saveDebounceTimerRef.current = setTimeout(async () => {
      try {
        await onSaveSession(sessionToSave);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Failed to sync attendance session:', err);
      }
    }, 450);
  };

  // Explicit Save to Cloud function
  const handleSaveToCloud = async (overrideSession?: AttendanceSession) => {
    const targetSession = overrideSession || currentSession;
    if (!targetSession) return;
    if (saveDebounceTimerRef.current) clearTimeout(saveDebounceTimerRef.current);
    setIsSavingToCloud(true);
    setSaveSuccessMsg(null);
    try {
      await onSaveSession(targetSession);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSavedTime(timeStr);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(`Presensi Pertemuan Ke-${targetSession.pertemuanKe} Berhasil Disimpan Real-Time & Tersinkronisasi Otomatis ke Agenda Mengajar!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan ke cloud: ${err.message || 'Koneksi terputus'}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  // Helper to change status for a student in current session - ZERO DELAY INSTANT CLICK
  const handleUpdateRecord = (studentId: string, status: AttendanceStatus, catatan?: string) => {
    if (!currentSession) return;
    const existingRecords = currentSession.records || {};
    const updated: AttendanceSession = {
      ...currentSession,
      records: {
        ...existingRecords,
        [studentId]: {
          status,
          catatan: catatan !== undefined ? catatan : (existingRecords[studentId]?.catatan || ''),
        },
      },
    };

    // 1. Instant optimistic local update - UI updates in 0 milliseconds
    setLocalSessions((prev) => ({ ...prev, [updated.id]: updated }));
    try {
      const raw = localStorage.getItem('smk_attendance');
      const all: AttendanceSession[] = raw ? JSON.parse(raw) : [];
      const nextAll = [...all.filter((s) => s.id !== updated.id), updated];
      localStorage.setItem('smk_attendance', JSON.stringify(nextAll));
    } catch {}

    // 2. Debounced background save to Cloud - no network blocking or race conditions
    scheduleSessionCloudSave(updated);
  };

  // Set All Present shortcut - ZERO DELAY
  const handleSetAllPresent = () => {
    if (!currentSession) return;
    const records: Record<string, { status: AttendanceStatus; catatan: string }> = {};
    classStudents.forEach((std) => {
      records[std.id] = {
        status: 'H',
        catatan: currentSession.records?.[std.id]?.catatan || '',
      };
    });
    const updated: AttendanceSession = {
      ...currentSession,
      records,
    };
    setLocalSessions((prev) => ({ ...prev, [updated.id]: updated }));
    try {
      const raw = localStorage.getItem('smk_attendance');
      const all: AttendanceSession[] = raw ? JSON.parse(raw) : [];
      const nextAll = [...all.filter((s) => s.id !== updated.id), updated];
      localStorage.setItem('smk_attendance', JSON.stringify(nextAll));
    } catch {}
    scheduleSessionCloudSave(updated);
  };

  const handleOpenCreateSessionModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextPertemuan = (classSessions.length > 0 ? Math.max(...classSessions.map((s) => s.pertemuanKe)) : 0) + 1;
    const dayStr = getIndoDay(todayStr);

    const existingAgenda = agendas.find(
      (a) => a.classId === currentClass.id && (a.tanggal === todayStr || a.pertemuanKe === nextPertemuan)
    );

    setNewSessionData({
      tanggal: todayStr,
      hari: existingAgenda?.hari || dayStr,
      pertemuanKe: nextPertemuan,
      jamKe: existingAgenda?.jamKe || '1 - 4',
      rentangJam: existingAgenda?.rentangJam || '07:15 - 09:15 WIB',
      topikMateri: existingAgenda?.materiAjar || '',
      kegiatan: existingAgenda?.kegiatan || '',
      catatan: existingAgenda?.catatan || '',
    });
    setNewSelectedPeriods([1, 2, 3, 4]);
    setIsNewTimeSectionExpanded(false);
    setIsNewPeriodsExpanded(false);
    setIsNewModalOpen(true);
  };

  const handleStartTimeChangeNew = (startVal: string) => {
    const curEnd = parseTimeRangeHelper(newSessionData.rentangJam).end;
    setNewSessionData((prev) => ({
      ...prev,
      rentangJam: `${startVal} - ${curEnd} WIB`,
    }));
  };

  const handleEndTimeChangeNew = (endVal: string) => {
    const curStart = parseTimeRangeHelper(newSessionData.rentangJam).start;
    setNewSessionData((prev) => ({
      ...prev,
      rentangJam: `${curStart} - ${endVal} WIB`,
    }));
  };

  const isPeriodActiveNew = (periods: number[]) => {
    if (newSelectedPeriods.length !== periods.length) return false;
    return periods.every((p) => newSelectedPeriods.includes(p));
  };

  const handleQuickSelectPeriodsNew = (periods: number[]) => {
    setNewSelectedPeriods(periods);
    const { jamKe, rentangJam } = formatPeriodsToJamKe(periods);
    setNewSessionData((prev) => ({
      ...prev,
      jamKe,
      rentangJam,
    }));
  };

  const handleTogglePeriodNew = (periodNo: number) => {
    setNewSelectedPeriods((prev) => {
      let next: number[];
      if (prev.includes(periodNo)) {
        if (prev.length === 1) return prev;
        next = prev.filter((p) => p !== periodNo);
      } else {
        next = [...prev, periodNo].sort((a, b) => a - b);
      }
      const { jamKe, rentangJam } = formatPeriodsToJamKe(next);
      setNewSessionData((prevData) => ({
        ...prevData,
        jamKe,
        rentangJam,
      }));
      return next;
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `att_${Date.now()}`;
    const initialRecords: Record<string, { status: AttendanceStatus; catatan: string }> = {};

    const created: AttendanceSession = {
      id: newId,
      classId: currentClass.id,
      tanggal: newSessionData.tanggal,
      pertemuanKe: Number(newSessionData.pertemuanKe),
      topikMateri: newSessionData.topikMateri?.trim() || `Pertemuan Pembelajaran Rutin Ke-${newSessionData.pertemuanKe}`,
      hari: newSessionData.hari?.trim() || getIndoDay(newSessionData.tanggal),
      jamKe: newSessionData.jamKe?.trim() || '1 - 4',
      rentangJam: newSessionData.rentangJam?.trim() || '07:15 - 09:15 WIB',
      kegiatan: newSessionData.kegiatan?.trim() || `Pembelajaran tatap muka pertemuan ke-${newSessionData.pertemuanKe}`,
      catatan: newSessionData.catatan?.trim() || '',
      records: initialRecords,
    };

    setIsSavingToCloud(true);
    try {
      await onSaveSession(created);
      setActiveSessionId(newId);
      setIsNewModalOpen(false);
      setSaveSuccessMsg(`Pertemuan Ke-${created.pertemuanKe} Berhasil Dibuat & Tersinkronisasi Langsung ke Agenda Mengajar!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal membuat pertemuan baru: ${err?.message || 'Error'}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleStartEditSession = (sess: AttendanceSession) => {
    const matchedAgenda = agendas.find(
      (a) =>
        a.id === `ag_att_${sess.id}` ||
        (a.classId === sess.classId && a.tanggal === sess.tanggal) ||
        (a.classId === sess.classId && a.pertemuanKe === sess.pertemuanKe)
    );

    setEditingSessionData({
      ...sess,
      hari: sess.hari || matchedAgenda?.hari || getIndoDay(sess.tanggal),
      jamKe: sess.jamKe || matchedAgenda?.jamKe || '1 - 4',
      rentangJam: sess.rentangJam || matchedAgenda?.rentangJam || '07:15 - 09:15 WIB',
      topikMateri: sess.topikMateri || matchedAgenda?.materiAjar || '',
      kegiatan: sess.kegiatan || matchedAgenda?.kegiatan || '',
      catatan: sess.catatan || matchedAgenda?.catatan || '',
    });
    setEditSelectedPeriods([1, 2, 3, 4]);
    setIsEditTimeSectionExpanded(false);
    setIsEditPeriodsExpanded(false);
    setIsEditModalOpen(true);
  };

  const handleStartTimeChangeEdit = (startVal: string) => {
    if (!editingSessionData) return;
    const curEnd = parseTimeRangeHelper(editingSessionData.rentangJam).end;
    setEditingSessionData((prev) => (prev ? { ...prev, rentangJam: `${startVal} - ${curEnd} WIB` } : null));
  };

  const handleEndTimeChangeEdit = (endVal: string) => {
    if (!editingSessionData) return;
    const curStart = parseTimeRangeHelper(editingSessionData.rentangJam).start;
    setEditingSessionData((prev) => (prev ? { ...prev, rentangJam: `${curStart} - ${endVal} WIB` } : null));
  };

  const isPeriodActiveEdit = (periods: number[]) => {
    if (editSelectedPeriods.length !== periods.length) return false;
    return periods.every((p) => editSelectedPeriods.includes(p));
  };

  const handleQuickSelectPeriodsEdit = (periods: number[]) => {
    setEditSelectedPeriods(periods);
    const { jamKe, rentangJam } = formatPeriodsToJamKe(periods);
    setEditingSessionData((prev) => (prev ? { ...prev, jamKe, rentangJam } : null));
  };

  const handleTogglePeriodEdit = (periodNo: number) => {
    setEditSelectedPeriods((prev) => {
      let next: number[];
      if (prev.includes(periodNo)) {
        if (prev.length === 1) return prev;
        next = prev.filter((p) => p !== periodNo);
      } else {
        next = [...prev, periodNo].sort((a, b) => a - b);
      }
      const { jamKe, rentangJam } = formatPeriodsToJamKe(next);
      setEditingSessionData((prevData) => (prevData ? { ...prevData, jamKe, rentangJam } : null));
      return next;
    });
  };

  const handleSaveEditedSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionData) return;
    setIsSavingToCloud(true);
    try {
      await onSaveSession(editingSessionData);
      const timeStr =
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB';
      setLastSavedTime(timeStr);
      setSaveSuccessMsg(
        `Data Pertemuan Ke-${editingSessionData.pertemuanKe} Berhasil Diperbarui & Tersinkronisasi ke Agenda Mengajar!`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setIsEditModalOpen(false);
      setEditingSessionData(null);
    } catch (err: any) {
      alert(`Gagal menyimpan perubahan sesi: ${err.message || 'Error'}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleDeleteSessionConfirm = (sess: AttendanceSession) => {
    if (confirm(`Yakin ingin menghapus sesi Pertemuan Ke-${sess.pertemuanKe} (${sess.tanggal})? Seluruh rekaman presensi murid pada sesi ini akan dihapus permanen.`)) {
      onDeleteSession(sess.id);
      if (activeSessionId === sess.id) {
        const remaining = classSessions.filter((s) => s.id !== sess.id);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        }
      }
    }
  };

  // Stats for current session
  let countH = 0, countS = 0, countI = 0, countA = 0, countD = 0;
  if (currentSession) {
    classStudents.forEach((std) => {
      const st = currentSession.records?.[std.id]?.status;
      if (st === 'H') countH++;
      else if (st === 'S') countS++;
      else if (st === 'I') countI++;
      else if (st === 'A') countA++;
      else if (st === 'D') countD++;
    });
  }
  const totalInSession = classStudents.length || 1;
  const attendanceRate = Math.round(((countH + countD) / totalInSession) * 100);

  // WhatsApp Report Generator for Group / Wali Murid
  const generateGroupWaReportText = (session: AttendanceSession): string => {
    const records = session.records || {};
    const hadirList: Student[] = [];
    const sakitList: { student: Student; catatan?: string }[] = [];
    const izinList: { student: Student; catatan?: string }[] = [];
    const alpaList: { student: Student; catatan?: string }[] = [];
    const dispenList: { student: Student; catatan?: string }[] = [];

    classStudents.forEach((std) => {
      const rec = records[std.id];
      const st = rec?.status;
      if (st === 'H') hadirList.push(std);
      else if (st === 'S') sakitList.push({ student: std, catatan: rec?.catatan });
      else if (st === 'I') izinList.push({ student: std, catatan: rec?.catatan });
      else if (st === 'A') alpaList.push({ student: std, catatan: rec?.catatan });
      else if (st === 'D') dispenList.push({ student: std, catatan: rec?.catatan });
    });

    const tidakHadirCount = sakitList.length + izinList.length + alpaList.length + dispenList.length;

    const tanggalFormatted = (() => {
      try {
        const d = new Date(session.tanggal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch {}
      return session.tanggal;
    })();

    let rincianTidakBerangkat = '';
    if (tidakHadirCount > 0) {
      const parts: string[] = [];
      if (sakitList.length > 0) {
        parts.push(`*Sakit (${sakitList.length} murid):*`);
        sakitList.forEach(({ student, catatan }) => {
          const ket = catatan ? ` (${catatan})` : '';
          parts.push(`  • ${student.nama}${ket} - _Semoga lekas sembuh_`);
        });
      }
      if (izinList.length > 0) {
        parts.push(`*Izin (${izinList.length} murid):*`);
        izinList.forEach(({ student, catatan }) => {
          const ket = catatan ? ` (${catatan})` : '';
          parts.push(`  • ${student.nama}${ket}`);
        });
      }
      if (alpaList.length > 0) {
        parts.push(`*Belum Hadir / Tanpa Keterangan (${alpaList.length} murid):*`);
        alpaList.forEach(({ student, catatan }) => {
          const ket = catatan ? ` (${catatan})` : '';
          parts.push(`  • ${student.nama}${ket} - _Mohon bantuan konfirmasi_`);
        });
      }
      if (dispenList.length > 0) {
        parts.push(`*Dispensasi Tugas Sekolah (${dispenList.length} murid):*`);
        dispenList.forEach(({ student, catatan }) => {
          const ket = catatan ? ` (${catatan})` : '';
          parts.push(`  • ${student.nama}${ket}`);
        });
      }
      rincianTidakBerangkat = parts.join('\n');
    }

    return `Assalamu’alaikum Warahmatullahi Wabarakatuh.
Yth. Bapak/Ibu Orang Tua / Wali Murid Kelas *${currentClass.namaKelas}*,

Semoga Bapak/Ibu beserta seluruh keluarga senantiasa berada dalam lindungan Allah SWT, diberikan limpahan kesehatan, dan kemudahan dalam segala urusan.

Dengan hormat, kami dari *${SCHOOL_CONFIG.namaSekolah}* menyampaikan laporan rekapitulasi presensi harian Kegiatan Belajar Mengajar (KBM):

📋 *INFORMASI KBM & KELAS*
• *Sekolah* : ${SCHOOL_CONFIG.namaSekolah}
• *Kelas / Rombel* : ${currentClass.namaKelas}
• *Pendidik Pengampu* : ${teacher.namaGuru}
• *Hari / Tanggal* : ${tanggalFormatted}


📊 *RINGKASAN KEHADIRAN*
• Total Murid : ${classStudents.length} murid
✓ Hadir : ${hadirList.length} murid
✗ Berhalangan Hadir : ${tidakHadirCount} murid

${
  tidakHadirCount > 0
    ? `📌 *RINCIAN ANANDA YANG BERHALANGAN HADIR:*\n${rincianTidakBerangkat}\n`
    : `_Alhamdulillah, seluruh murid hadir lengkap dan mengikuti KBM dengan tertib._\n`
}
Demikian laporan kehadiran ini kami sampaikan sebagai bentuk transparansi serta sinergi antara pihak sekolah dengan Bapak/Ibu wali murid.

Atas perhatian, bimbingan, dan kerja sama yang senantiasa terjalin harmonis, kami haturkan terima kasih yang sebesar-besarnya.

Jazakumullahu Khairan Katsiran.
Wassalamu’alaikum Warahmatullahi Wabarakatuh.

Salam hormat & takzim,
*${teacher.namaGuru}*`;
  };

  // WhatsApp Report Generator for Individual Student (Japri Orang Tua)
  const generatePersonalWaReportText = (std: Student, session: AttendanceSession): string => {
    const record = session.records?.[std.id];
    const status = record?.status || 'H';
    const catatan = record?.catatan?.trim();

    const tanggalFormatted = (() => {
      try {
        const d = new Date(session.tanggal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch {}
      return session.tanggal;
    })();

    const materiFormatted =
      session.topikMateri && session.topikMateri.trim() !== '' && session.topikMateri !== 'Tanpa topik materi'
        ? session.topikMateri.trim()
        : 'Pembelajaran Kejuruan & Karakter Terstruktur';

    let statusLine = '';
    if (status === 'H') {
      statusLine = '✅ *HADIR*\n_Alhamdulillah ananda hadir tepat waktu dan mengikuti kegiatan pembelajaran dengan baik serta tertib._';
    } else if (status === 'S') {
      statusLine = `⚠️ *SAKIT*${catatan ? ` (Keterangan: ${catatan})` : ''}\n_Doa kami bersama semoga ananda segera diberikan kesembuhan, diangkat penyakitnya, dan dapat beraktivitas kembali bersama kita. Aamiin._`;
    } else if (status === 'I') {
      statusLine = `ℹ️ *IZIN*${catatan ? ` (Keterangan: ${catatan})` : ''}\n_Terima kasih atas konfirmasi yang telah disampaikan kepada pihak sekolah._`;
    } else if (status === 'D') {
      statusLine = `📋 *DISPENSASI*${catatan ? ` (${catatan})` : ''}\n_Ananda sedang menjalankan penugasan resmi kegiatan madrasah/sekolah._`;
    } else {
      statusLine = `❌ *BELUM HADIR / TANPA KETERANGAN*${catatan ? ` (${catatan})` : ''}\n_Mohon bantuan konfirmasi dari Bapak/Ibu terkait kondisi/keberadaan ananda demi keselamatan dan ketertiban belajar bersama._`;
    }

    const catatanPendidik = std.catatanUmum?.trim()
      ? std.catatanUmum.trim()
      : 'Ananda senantiasa menunjukkan sikap yang baik, santun, dan tertib selama proses pembelajaran.';

    return `Assalamu’alaikum Warahmatullahi Wabarakatuh.
Selamat pagi/siang, Bapak/Ibu Orang Tua / Wali dari ananda *${std.nama}*.

Semoga Bapak/Ibu beserta keluarga senantiasa dalam keadaan sehat walafiat serta dalam lindungan Allah SWT.

Dengan hormat, kami dari *${SCHOOL_CONFIG.namaSekolah}* menyampaikan informasi presensi ananda pada Kegiatan Belajar Mengajar (KBM) hari ini:

📋 *DATA MURID & PEMBELAJARAN*
• *Nama Murid* : ${std.nama}
• *NISN* : ${std.nisn || '-'}
• *Kelas / Rombel* : ${currentClass.namaKelas}
• *Mata Pelajaran* : ${currentClass.mataPelajaran}
• *Hari / Tanggal* : ${tanggalFormatted}
• *Pertemuan Ke* : ${session.pertemuanKe}
• *Materi Pokok* : ${materiFormatted}

📌 *STATUS KEHADIRAN ANANDA:*
${statusLine}

📝 *Catatan Perkembangan Pendidik:*
"${catatanPendidik}"

Demikian informasi ini kami sampaikan demi kebaikan dan pemantauan belajar ananda bersama.
Atas perhatian dan kerja sama Bapak/Ibu yang baik, kami haturkan terima kasih.

Jazakumullahu Khairan Katsiran.
Wassalamu’alaikum Warahmatullahi Wabarakatuh.

Salam hormat & takzim,
*${teacher.namaGuru}*`;
  };

  const handleOpenWaReport = (mode: 'group' | 'personal' = 'group', student?: Student) => {
    if (!currentSession) {
      alert('Pilih atau buat pertemuan presensi terlebih dahulu.');
      return;
    }
    const targetStudent = student || selectedStudentForWa || classStudents[0] || null;
    setWaReportMode(mode);

    if (student) {
      setSelectedStudentForWa(student);
    } else if (!selectedStudentForWa && classStudents.length > 0) {
      const firstAbsent = classStudents.find((s) => currentSession.records?.[s.id]?.status !== 'H');
      setSelectedStudentForWa(firstAbsent || classStudents[0]);
    }

    const text =
      mode === 'personal' && targetStudent
        ? generatePersonalWaReportText(targetStudent, currentSession)
        : generateGroupWaReportText(currentSession);

    setWaReportText(text);
    setWaCopied(false);
    setIsWaReportModalOpen(true);
  };

  const handleCopyWaReport = (textToCopy?: string) => {
    const text = textToCopy || waReportText;
    navigator.clipboard.writeText(text);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  const handleSendToWhatsApp = (textToSend?: string, phoneOverride?: string) => {
    const rawText = textToSend || waReportText;
    const encoded = encodeURIComponent(rawText);
    const phone = phoneOverride?.replace(/\D/g, '');
    if (phone) {
      const cleanPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Generate public share link - Refresh State Terkini Sebelum Generate
  const handleOpenShare = async () => {
    setIsRefreshingShare(true);
    const shareId = `att_share_${currentClass.id}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}?absen_share=${shareId}`;
    setShareLink(fullLink);

    try {
      const [freshStudents, freshSessions] = await Promise.all([
        getStudents(currentClass.id).catch(() => classStudents),
        getAttendanceSessions(currentClass.id).catch(() => classSessions),
      ]);

      const effectiveStudents = (freshStudents && freshStudents.length > 0 ? freshStudents : classStudents).map(sanitizePublicStudent);
      const effectiveSessions = freshSessions && freshSessions.length > 0 ? freshSessions : classSessions;

      const shareRecord: PublicShareRecord = {
        id: shareId,
        type: 'absen',
        classId: currentClass.id,
        title: `Presensi Murid Kelas ${currentClass.namaKelas} - ${SCHOOL_CONFIG.namaSekolah}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          className: currentClass.namaKelas,
          subject: currentClass.mataPelajaran,
          teacher: teacher.namaGuru,
          teacherName: teacher.namaGuru,
          teacherNip: '',
          teacherNbm: teacher.nbm || '',
          school: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
          namaSekolah: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
          namaKepalaSekolah: teacher.namaKepalaSekolah || '',
          nipKepalaSekolah: '',
          nbmKepalaSekolah: teacher.nbmKepalaSekolah || '',
          tahunAjaran: teacher.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
          semester: teacher.semester || SCHOOL_CONFIG.semester,
          students: effectiveStudents,
          sessions: effectiveSessions,
        },
        payload: {
          className: currentClass.namaKelas,
          subject: currentClass.mataPelajaran,
          teacher: teacher.namaGuru,
          teacherName: teacher.namaGuru,
          teacherNip: '',
          teacherNbm: teacher.nbm || '',
          school: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
          namaSekolah: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
          namaKepalaSekolah: teacher.namaKepalaSekolah || '',
          nipKepalaSekolah: '',
          nbmKepalaSekolah: teacher.nbmKepalaSekolah || '',
          tahunAjaran: teacher.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
          semester: teacher.semester || SCHOOL_CONFIG.semester,
          students: effectiveStudents,
          sessions: effectiveSessions,
        },
      };

      const token = await createOrUpdatePublicShare(shareRecord);
      const effectiveToken = token || (shareRecord as any).share_token;
      const targetLink = effectiveToken
        ? `${baseUrl}?absen_share=${effectiveToken}`
        : fullLink;
      setShareLink(targetLink);

      try {
        const QRCode = (await import('qrcode')).default;
        const qrData = await QRCode.toDataURL(targetLink, { width: 240, margin: 2 });
        setShareQrUrl(qrData);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      console.warn('Could not sync share to cloud', err);
    } finally {
      setIsRefreshingShare(false);
    }

    setShareModalOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportExcel = () => {
    if (currentSession) {
      exportAttendanceToExcel(currentSession, currentClass, classStudents, teacher);
    } else {
      alert('Silakan buat atau pilih sesi pertemuan terlebih dahulu.');
    }
  };

  const handleExportPdf = () => {
    if (currentSession) {
      exportAttendanceToPDF(currentSession, currentClass, classStudents, teacher);
    } else {
      alert('Silakan buat atau pilih sesi pertemuan terlebih dahulu.');
    }
  };

  const filteredStudents = useMemo(() => {
    return classStudents
      .filter((s) => s.nama.toLowerCase().includes(filterQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortOrder === 'name-asc') {
          return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
        }
        if (sortOrder === 'name-desc') {
          return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
        }
        return a.no - b.no;
      });
  }, [classStudents, filterQuery, sortOrder]);

  return {
    classStudents,
    classSessions,
    activeSessionId,
    setActiveSessionId,
    currentSession,
    syncedAgenda,
    isMeetingsPanelOpen,
    setIsMeetingsPanelOpen,
    isNewModalOpen,
    setIsNewModalOpen,
    newSelectedPeriods,
    isNewTimeSectionExpanded,
    setIsNewTimeSectionExpanded,
    isNewPeriodsExpanded,
    setIsNewPeriodsExpanded,
    newSessionData,
    setNewSessionData,
    editingSessionData,
    setEditingSessionData,
    isEditModalOpen,
    setIsEditModalOpen,
    editSelectedPeriods,
    isEditTimeSectionExpanded,
    setIsEditTimeSectionExpanded,
    isEditPeriodsExpanded,
    setIsEditPeriodsExpanded,
    filterQuery,
    setFilterQuery,
    sortOrder,
    setSortOrder,
    shareModalOpen,
    setShareModalOpen,
    shareQrUrl,
    shareLink,
    copiedLink,
    isRefreshingShare,
    isWaReportModalOpen,
    setIsWaReportModalOpen,
    waReportMode,
    setWaReportMode,
    selectedStudentForWa,
    setSelectedStudentForWa,
    waReportText,
    setWaReportText,
    waCopied,
    isWaPreviewExpanded,
    setIsWaPreviewExpanded,
    waInlineCopied,
    setWaInlineCopied,
    isSavingToCloud,
    lastSavedTime,
    hasUnsavedChanges,
    saveSuccessMsg,
    countH,
    countS,
    countI,
    countA,
    countD,
    attendanceRate,
    filteredStudents,
    handleSaveToCloud,
    handleUpdateRecord,
    handleSetAllPresent,
    handleOpenCreateSessionModal,
    handleStartTimeChangeNew,
    handleEndTimeChangeNew,
    isPeriodActiveNew,
    handleQuickSelectPeriodsNew,
    handleTogglePeriodNew,
    handleCreateSession,
    handleStartEditSession,
    handleStartTimeChangeEdit,
    handleEndTimeChangeEdit,
    isPeriodActiveEdit,
    handleQuickSelectPeriodsEdit,
    handleTogglePeriodEdit,
    handleSaveEditedSession,
    handleDeleteSessionConfirm,
    generateGroupWaReportText,
    generatePersonalWaReportText,
    handleOpenWaReport,
    handleCopyWaReport,
    handleSendToWhatsApp,
    handleOpenShare,
    copyShareLink,
    handleExportExcel,
    handleExportPdf,
  };
}
