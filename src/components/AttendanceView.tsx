import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Share2,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Save,
  Cloud,
  RefreshCw,
  CheckCheck,
  Edit2,
  Trash2,
  X,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Phone,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  AttendanceSession,
  AttendanceStatus,
  ClassRoom,
  Student,
  TeacherProfile,
  PublicShareRecord,
} from '../types';
import { exportAttendanceToExcel, exportAttendanceToPDF } from '../utils/exportUtils';
import { createOrUpdatePublicShare, getStudents, getAttendanceSessions } from '../services/data';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

interface AttendanceViewProps {
  currentClass: ClassRoom;
  students: Student[];
  sessions: AttendanceSession[];
  teacher: TeacherProfile;
  onSaveSession: (session: AttendanceSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentClass,
  students,
  sessions,
  teacher,
  onSaveSession,
  onDeleteSession,
}) => {
  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const classSessions = sessions
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => b.pertemuanKe - a.pertemuanKe);

  const [activeSessionId, setActiveSessionId] = useState<string>(
    classSessions[0]?.id || ''
  );
  const [isMeetingsPanelOpen, setIsMeetingsPanelOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    pertemuanKe: (classSessions.length > 0 ? Math.max(...classSessions.map((s) => s.pertemuanKe)) : 0) + 1,
    topikMateri: '',
  });

  // Edit Existing Session States
  const [editingSessionData, setEditingSessionData] = useState<AttendanceSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      const next = { ...prev };
      classSessions.forEach((s) => {
        if (!next[s.id]) {
          next[s.id] = s;
        } else {
          // Merge while preserving local edits
          next[s.id] = { ...s, ...next[s.id] };
        }
      });
      return next;
    });
  }, [classSessions]);

  // Selected session for editing records (reads from optimistic local state first)
  const currentSession: AttendanceSession | undefined =
    localSessions[activeSessionId] ||
    classSessions.find((s) => s.id === activeSessionId) ||
    classSessions[0];

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
      setSaveSuccessMsg(`Presensi Pertemuan Ke-${targetSession.pertemuanKe} Berhasil Disimpan Real-Time ke Cloud Supabase!`);
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
    scheduleSessionCloudSave(updated);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `att_${Date.now()}`;
    // Records kosong: status belum diisi. Guru mengisi manual atau lewat tombol "Set Semua Hadir".
    const initialRecords: Record<string, { status: AttendanceStatus; catatan: string }> = {};

    const created: AttendanceSession = {
      id: newId,
      classId: currentClass.id,
      tanggal: newSessionData.tanggal,
      pertemuanKe: Number(newSessionData.pertemuanKe),
      topikMateri: newSessionData.topikMateri || 'Pertemuan Pembelajaran Rutin',
      records: initialRecords,
    };

    onSaveSession(created);
    setActiveSessionId(newId);
    setIsNewModalOpen(false);
  };

  const handleStartEditSession = (sess: AttendanceSession) => {
    setEditingSessionData({ ...sess });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionData) return;
    setIsSavingToCloud(true);
    try {
      await onSaveSession(editingSessionData);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSavedTime(timeStr);
      setSaveSuccessMsg(`Data Pertemuan Ke-${editingSessionData.pertemuanKe} berhasil diperbarui di Cloud!`);
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

    const materiFormatted =
      session.topikMateri && session.topikMateri.trim() !== '' && session.topikMateri !== 'Tanpa topik materi'
        ? session.topikMateri.trim()
        : 'Pembelajaran Kejuruan & Karakter Terstruktur';

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
• *Mata Pelajaran* : ${currentClass.mataPelajaran}
• *Pendidik Pengampu* : ${teacher.namaGuru}
• *Hari / Tanggal* : ${tanggalFormatted}
• *Pertemuan Ke* : ${session.pertemuanKe}
• *Materi Pokok* : ${materiFormatted}

📊 *RINGKASAN KEHADIRAN*
• Total Murid : ${classStudents.length} murid
✓ Hadir : ${hadirList.length} murid
✗ Berhalangan Hadir : ${tidakHadirCount} murid

${
  tidakHadirCount > 0
    ? `📌 *RINCIAN ANANDA YANG BERHALANGAN HADIR:*\n${rincianTidakBerangkat}\n`
    : `_Alhamdulillah, seluruh murid hadir lengkap dan mengikuti KBM dengan tertib._\n`
}
Demikian laporan kehadiran ini kami sampaikan sebagai bentuk transparansi serta sinergi antara pihak madrasah/sekolah dengan Bapak/Ibu wali murid.

Atas perhatian, bimbingan, dan kerja sama yang senantiasa terjalin harmonis, kami haturkan terima kasih yang sebesar-besarnya.

Jazakumullahu Khairan Katsiran.
Wassalamu’alaikum Warahmatullahi Wabarakatuh.

Salam hormat & takzim,
*${teacher.namaGuru}*
Pendidik ${currentClass.mataPelajaran}
*${SCHOOL_CONFIG.namaSekolah}*
🌐 ${SCHOOL_CONFIG.website}`;
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
*${teacher.namaGuru}*
Pendidik ${currentClass.mataPelajaran}
*${SCHOOL_CONFIG.namaSekolah}*
🌐 ${SCHOOL_CONFIG.website}`;
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
      // Prioritize student who is not present
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
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
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
      // 1. Refresh data murid dan sesi terbaru dari database cloud
      const [freshStudents, freshSessions] = await Promise.all([
        getStudents(currentClass.id).catch(() => classStudents),
        getAttendanceSessions(currentClass.id).catch(() => classSessions),
      ]);

      const effectiveStudents = freshStudents && freshStudents.length > 0 ? freshStudents : classStudents;
      const effectiveSessions = freshSessions && freshSessions.length > 0 ? freshSessions : classSessions;

      // 2. Susun payload dari data terbaru
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
          school: teacher.namaSekolah,
          students: effectiveStudents,
          sessions: effectiveSessions,
        },
        payload: {
          className: currentClass.namaKelas,
          subject: currentClass.mataPelajaran,
          teacher: teacher.namaGuru,
          school: teacher.namaSekolah,
          students: effectiveStudents,
          sessions: effectiveSessions,
        },
      };

      // 3. Tulis ke public_shares dan SafeCache
      await createOrUpdatePublicShare(shareRecord);
    } catch (err) {
      console.warn('Could not sync share to cloud', err);
    } finally {
      setIsRefreshingShare(false);
    }

    try {
      const qrData = await QRCode.toDataURL(fullLink, { width: 240, margin: 2 });
      setShareQrUrl(qrData);
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

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Session Switcher */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                {currentClass.namaKelas}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">{currentClass.mataPelajaran}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Buku Presensi & Kehadiran Murid
            </h2>
            <p className="text-xs text-slate-500">
              SMK Muhammadiyah Bawang &bull; Tahun Ajaran {teacher.tahunAjaran} ({teacher.semester})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Simpan Presensi ke Cloud di Header Toolbar */}
            <button
              type="button"
              onClick={() => handleSaveToCloud()}
              disabled={isSavingToCloud || !currentSession}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              } disabled:opacity-50`}
              title="Simpan data presensi murid ke cloud Supabase secara real-time"
            >
              {isSavingToCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Simpan Presensi ke Cloud</span>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  )}
                </>
              )}
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Buat Pertemuan Baru
            </button>

            <button
              onClick={handleOpenShare}
              className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Bagikan Tautan Publik untuk Orang Tua"
            >
              <Share2 className="w-4 h-4" />
              Link Publik Wali Murid
            </button>

            <div className="flex items-center rounded-2xl border border-slate-200 p-1 bg-slate-50">
              <button
                onClick={() => {
                  if (currentSession) {
                    exportAttendanceToExcel(currentSession, currentClass, classStudents, teacher);
                  } else {
                    alert('Silakan buat atau pilih sesi pertemuan terlebih dahulu.');
                  }
                }}
                className="px-3 py-1.5 hover:bg-white text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title="Unduh file Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel
              </button>
              <button
                onClick={() => {
                  if (currentSession) {
                    exportAttendanceToPDF(currentSession, currentClass, classStudents, teacher);
                  } else {
                    alert('Silakan buat atau pilih sesi pertemuan terlebih dahulu.');
                  }
                }}
                className="px-3 py-1.5 hover:bg-white text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title="Cetak format PDF resmi"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Save Notification Banner */}
        {saveSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            {lastSavedTime && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                {lastSavedTime}
              </span>
            )}
          </div>
        )}

        {/* Collapsible Sessions Selector Panel (Default: Tersembunyi) */}
        {classSessions.length > 0 ? (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setIsMeetingsPanelOpen(!isMeetingsPanelOpen)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>
                    Pertemuan {currentSession ? `Ke-${currentSession.pertemuanKe} (${currentSession.tanggal})` : 'Pilih Pertemuan'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {classSessions.length} Pertemuan
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isMeetingsPanelOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Klik tombol di atas untuk membuka daftar seluruh pertemuan
              </span>
            </div>

            {/* Hidden / Expanded Dropdown Panel */}
            {isMeetingsPanelOpen && (
              <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Pilih Sesi Pertemuan:
                  </p>
                  <button
                    onClick={() => setIsMeetingsPanelOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Tutup Panel ▲
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {classSessions.map((session) => {
                    const isSelected = currentSession?.id === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setIsMeetingsPanelOpen(false); // Auto close after selecting
                        }}
                        className={`p-2.5 rounded-2xl text-xs font-semibold transition text-left border flex items-center justify-between gap-2 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/30'
                            : 'bg-white hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-950 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold leading-tight block truncate">
                            Pertemuan {session.pertemuanKe}
                          </span>
                          <span className={`text-[10px] block font-mono truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {session.tanggal}
                          </span>
                          {session.topikMateri && (
                            <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {session.topikMateri}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditSession(session);
                            }}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSelected
                                ? 'hover:bg-white/20 text-indigo-100 hover:text-white'
                                : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'
                            }`}
                            title={`Edit Pertemuan Ke-${session.pertemuanKe}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSessionConfirm(session);
                            }}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSelected
                                ? 'hover:bg-rose-500/40 text-rose-200 hover:text-white'
                                : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                            }`}
                            title={`Hapus Pertemuan Ke-${session.pertemuanKe}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800">
            Belum ada sesi pertemuan. Klik tombol <strong>"Buat Pertemuan Baru"</strong> di atas untuk memulai pencatatan presensi.
          </div>
        )}
      </div>

      {/* Active Session Info & Metrics Card */}
      {currentSession && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white p-5 rounded-3xl shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-white/20 border border-white/30 rounded-full text-[11px] font-bold text-emerald-100">
                  Pertemuan Ke-{currentSession.pertemuanKe}
                </span>
                <span className="text-xs text-emerald-100 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentSession.tanggal}
                </span>
              </div>
              <h3 className="font-bold text-base mt-2 leading-snug text-white">
                {currentSession.topikMateri || 'Tanpa topik materi'}
              </h3>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSetAllPresent}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Set Semua Hadir
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveToCloud()}
                  disabled={isSavingToCloud}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Simpan data sesi ini ke database cloud Supabase secara real-time"
                >
                  {isSavingToCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan ke Cloud</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWaReport('group')}
                  className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-emerald-300/40"
                  title="Generate teks laporan absensi siap kirim ke WhatsApp / copy-paste"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Salin Laporan WA</span>
                </button>
              </div>

              {/* Tombol Edit dan Hapus untuk Absen yang Sudah Dibuat */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEditSession(currentSession)}
                  className="px-3.5 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white border border-amber-300/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Edit tanggal, nomor pertemuan, atau topik materi absen ini"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Edit Sesi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteSessionConfirm(currentSession)}
                  className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Hapus sesi pertemuan presensi ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Sesi</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Persentase Hadir
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-600 font-mono">
                {attendanceRate}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({countH + countD}/{classStudents.length} Murid)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-5 gap-1.5 text-center">
            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <span className="block text-emerald-800 font-bold text-base font-mono">{countH}</span>
              <span className="text-[10px] font-bold text-emerald-600">Hadir</span>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
              <span className="block text-blue-800 font-bold text-base font-mono">{countS}</span>
              <span className="text-[10px] font-bold text-blue-600">Sakit</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
              <span className="block text-amber-800 font-bold text-base font-mono">{countI}</span>
              <span className="text-[10px] font-bold text-amber-600">Izin</span>
            </div>
            <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
              <span className="block text-rose-800 font-bold text-base font-mono">{countA}</span>
              <span className="text-[10px] font-bold text-rose-600">Alfa</span>
            </div>
            <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
              <span className="block text-purple-800 font-bold text-base font-mono">{countD}</span>
              <span className="text-[10px] font-bold text-purple-600">Dispen</span>
            </div>
          </div>
        </div>
      )}

      {/* Pratinjau Teks WhatsApp Laporan Orang Tua (Pada Bagian Input Absen) */}
      {currentSession && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/90 dark:border-emerald-800/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
                    Pratinjau Teks WhatsApp Laporan Orang Tua
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                    Tersinkron Otomatis
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                  Teks laporan tertata rapi sesuai tata krama & etika kesopanan Indonesia. Otomatis diperbarui saat absensi diisi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsWaPreviewExpanded(!isWaPreviewExpanded)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title={isWaPreviewExpanded ? 'Sembunyikan pratinjau teks' : 'Tampilkan teks laporan lengkap'}
              >
                {isWaPreviewExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isWaPreviewExpanded ? 'Tutup Pratinjau' : 'Buka Pratinjau Teks'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const txt = generateGroupWaReportText(currentSession);
                  handleCopyWaReport(txt);
                  setWaInlineCopied(true);
                  setTimeout(() => setWaInlineCopied(false), 2000);
                }}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Salin teks laporan ke clipboard"
              >
                {waInlineCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{waInlineCopied ? 'Tersalin!' : 'Salin Laporan WA'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenWaReport('group')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                title="Buka dialog lengkap dengan opsi kirim per murid"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WA & Opsi Japri</span>
              </button>
            </div>
          </div>

          {/* Pratinjau Teks WhatsApp (Bisa dibuka/ditutup) */}
          {isWaPreviewExpanded && (
            <div className="pt-2 animate-in fade-in space-y-3">
              <div className="bg-[#e5ddd5]/70 dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-emerald-200/80 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-850 p-4 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-750 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Teks Laporan Presensi KBM (Siap Kirim ke Grup Wali Murid)
                    </span>
                    <span className="font-mono">{currentSession.tanggal}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 select-all max-h-80 overflow-y-auto p-1">
                    {generateGroupWaReportText(currentSession)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Grid per Student */}
      {currentSession && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-2">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Kehadiran Murid
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari murid..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setSortOrder('no')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                    sortOrder === 'no' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                  title="Urutkan No Urut"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('name-asc')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] ${
                    sortOrder === 'name-asc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                  title="Urutkan Abjad A-Z"
                >
                  <ArrowUpAZ className="w-3 h-3" />
                  <span>A-Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('name-desc')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] ${
                    sortOrder === 'name-desc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                  }`}
                  title="Urutkan Abjad Z-A"
                >
                  <ArrowDownZA className="w-3 h-3" />
                  <span>Z-A</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                  <th
                    onClick={() => setSortOrder('no')}
                    className="py-3 px-3 text-center w-12 text-white cursor-pointer hover:bg-white/10 select-none transition"
                    title="Klik untuk sortir nomor urut"
                  >
                    No
                  </th>
                  <th
                    onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                    className="py-3 px-3 min-w-[180px] text-white cursor-pointer hover:bg-white/10 select-none transition"
                    title="Klik untuk sortir alfabetis A-Z / Z-A"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Murid</span>
                      {sortOrder === 'name-asc' ? (
                        <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                          <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                        </span>
                      ) : sortOrder === 'name-desc' ? (
                        <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                          <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-white/70" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-14 text-white">L/P</th>
                  <th className="py-3 px-3 text-center min-w-[200px] text-white">Status Kehadiran</th>
                  <th className="py-3 px-3 text-white">Keterangan / Alasan</th>
                  <th className="py-3 px-3 text-center w-20 text-white">WA Ortu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((std, idx) => {
                  const record = currentSession.records?.[std.id]; // bisa undefined
                  const status = record?.status; // undefined = belum dipilih
                  const catatan = record?.catatan || '';

                  return (
                    <tr
                      key={std.id}
                      className={`transition ${
                        idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-emerald-50/20'
                      } hover:bg-emerald-50/50`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                        {std.no}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {std.nama}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-slate-500">{std.gender}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {(['H', 'S', 'I', 'A', 'D'] as AttendanceStatus[]).map((st) => {
                            const isSelected = status === st;
                            let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                            if (isSelected) {
                              if (st === 'H') style = 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20';
                              else if (st === 'S') style = 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20';
                              else if (st === 'I') style = 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20';
                              else if (st === 'A') style = 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20';
                              else if (st === 'D') style = 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20';
                            }

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateRecord(std.id, st)}
                                className={`w-8 h-8 rounded-xl font-bold font-mono transition text-xs flex items-center justify-center cursor-pointer ${style}`}
                                title={
                                  st === 'H'
                                    ? 'Hadir'
                                    : st === 'S'
                                    ? 'Sakit'
                                    : st === 'I'
                                    ? 'Izin'
                                    : st === 'A'
                                    ? 'Alpa'
                                    : 'Dispensasi'
                                }
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Catatan izin/keterangan..."
                          value={catatan}
                          onChange={(e) => handleUpdateRecord(std.id, status || 'H', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#009B62] bg-white"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenWaReport('personal', std)}
                          className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs"
                          title={
                            std.noHpOrangTua
                              ? `Pratinjau / Kirim pesan WA santun ke orang tua ${std.nama} (${std.noHpOrangTua})`
                              : `Pratinjau pesan WA santun untuk orang tua ${std.nama}`
                          }
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WA</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer with Prominent Save Button */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lastSavedTime
                    ? `Terakhir disimpan ke Cloud Supabase: ${lastSavedTime}`
                    : 'Perubahan presensi dapat langsung disimpan ke database Cloud secara real-time.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveToCloud()}
                disabled={isSavingToCloud}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
              >
                {isSavingToCloud ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Presensi ke Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Unsaved Changes Notification */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-semibold">Ada perubahan isian presensi yang siap disimpan ke cloud.</span>
          </div>
          <button
            type="button"
            onClick={() => handleSaveToCloud()}
            disabled={isSavingToCloud}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            {isSavingToCloud ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Modal Create Session */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Buat Sesi Pertemuan Baru
            </h3>
            <form onSubmit={handleCreateSession} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pertemuan Ke-
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSessionData.pertemuanKe}
                    onChange={(e) =>
                      setNewSessionData({ ...newSessionData, pertemuanKe: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={newSessionData.tanggal}
                    onChange={(e) =>
                      setNewSessionData({ ...newSessionData, tanggal: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Materi Pokok / Capaian Pembelajaran (TP)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Konfigurasi Virtual LAN (VLAN) dan Trunking pada Switch Cisco"
                  value={newSessionData.topikMateri}
                  onChange={(e) =>
                    setNewSessionData({ ...newSessionData, topikMateri: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  Simpan Pertemuan Baru ke Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Sesi Pertemuan Absen yang Sudah Dibuat */}
      {isEditModalOpen && editingSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Edit Sesi Pertemuan Absen
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ubah tanggal, nomor pertemuan, atau materi ajar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSessionData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSession} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tanggal Pertemuan
                </label>
                <input
                  type="date"
                  required
                  value={editingSessionData.tanggal}
                  onChange={(e) =>
                    setEditingSessionData({ ...editingSessionData, tanggal: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Pertemuan Ke-
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingSessionData.pertemuanKe}
                  onChange={(e) =>
                    setEditingSessionData({
                      ...editingSessionData,
                      pertemuanKe: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Materi Pokok / Capaian Pembelajaran
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Pengujian Jaringan Lokal dan Troubleshoot IP Address"
                  value={editingSessionData.topikMateri || ''}
                  onChange={(e) =>
                    setEditingSessionData({ ...editingSessionData, topikMateri: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteSessionConfirm(editingSessionData);
                    setIsEditModalOpen(false);
                    setEditingSessionData(null);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Sesi</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingSessionData(null);
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingToCloud}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingToCloud ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Share Public Link (Opacity dikurangi agar background terlihat) */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-[1.5px] animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Tautan Publik Kehadiran Murid
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Wali murid dan murid dapat memantau kehadiran secara real-time tanpa perlu akun login.
              </p>
            </div>

            {shareQrUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
                <img src={shareQrUrl} alt="QR Code Share" className="w-48 h-48 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">Scan QR Code dengan kamera ponsel</p>
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
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={shareLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Buka Halaman Publik <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog WhatsApp Report with Full Preview & Mode Switcher */}
      {isWaReportModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    Pratinjau Teks WhatsApp Laporan Orang Tua
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    {currentClass.namaKelas} &bull; Pertemuan Ke-{currentSession.pertemuanKe} ({currentSession.tanggal})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWaReportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setWaReportMode('group');
                    const text = generateGroupWaReportText(currentSession);
                    setWaReportText(text);
                    setWaCopied(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    waReportMode === 'group'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Rekap KBM Kelas (Grup Ortu)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWaReportMode('personal');
                    const targetStd = selectedStudentForWa || classStudents[0];
                    if (targetStd) {
                      setSelectedStudentForWa(targetStd);
                      const text = generatePersonalWaReportText(targetStd, currentSession);
                      setWaReportText(text);
                    }
                    setWaCopied(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    waReportMode === 'personal'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Laporan Personal Murid (Japri)
                </button>
              </div>

              {waReportMode === 'personal' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Pilih Murid:</span>
                  <select
                    value={selectedStudentForWa?.id || ''}
                    onChange={(e) => {
                      const std = classStudents.find((s) => s.id === e.target.value);
                      if (std) {
                        setSelectedStudentForWa(std);
                        setWaReportText(generatePersonalWaReportText(std, currentSession));
                        setWaCopied(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {classStudents.map((std) => {
                      const st = currentSession.records?.[std.id]?.status || 'H';
                      const stLabel = st === 'H' ? 'Hadir' : st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : st === 'A' ? 'Alfa' : 'Dispen';
                      return (
                        <option key={std.id} value={std.id}>
                          {std.no}. {std.nama} [{stLabel}]
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Content Preview Canvas (WhatsApp Mockup Style) */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1 space-y-4">
              <div className="bg-[#e5ddd5] dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-300/70 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-850 p-4 sm:p-5 rounded-2xl rounded-tl-xs shadow-sm max-w-xl mx-auto space-y-3 border border-slate-200/80 dark:border-slate-750">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Pratinjau Pesan WhatsApp (Format Santun Indonesia)
                    </span>
                    <span>T.A. {teacher.tahunAjaran}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 select-all">
                    {waReportText}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {waReportMode === 'personal' && selectedStudentForWa ? (
                  <span>
                    No. WA Orang Tua: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedStudentForWa.noHpOrangTua || 'Belum diisi'}</strong>
                  </span>
                ) : (
                  <span>Laporan rekapitulasi KBM siap dikirim ke grup wali murid / orang tua</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyWaReport()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {waCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{waCopied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (waReportMode === 'personal' && selectedStudentForWa?.noHpOrangTua) {
                      handleSendToWhatsApp(waReportText, selectedStudentForWa.noHpOrangTua);
                    } else {
                      handleSendToWhatsApp(waReportText);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWaReportModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
