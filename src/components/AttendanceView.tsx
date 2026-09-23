import React, { useState } from 'react';
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
  TrendingUp,
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
import { createOrUpdatePublicShare } from '../services/data';

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
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    pertemuanKe: (classSessions.length > 0 ? Math.max(...classSessions.map((s) => s.pertemuanKe)) : 0) + 1,
    topikMateri: '',
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected session for editing records
  const currentSession = classSessions.find((s) => s.id === activeSessionId) || classSessions[0];

  // Helper to change status for a student in current session
  const handleUpdateRecord = (studentId: string, status: AttendanceStatus, catatan?: string) => {
    if (!currentSession) return;
    const existingRecords = currentSession.records || {};
    const updated = {
      ...currentSession,
      records: {
        ...existingRecords,
        [studentId]: {
          status,
          catatan: catatan !== undefined ? catatan : (existingRecords[studentId]?.catatan || ''),
        },
      },
    };
    onSaveSession(updated);
  };

  // Set All Present shortcut
  const handleSetAllPresent = () => {
    if (!currentSession) return;
    const records: Record<string, { status: AttendanceStatus; catatan: string }> = {};
    classStudents.forEach((std) => {
      records[std.id] = {
        status: 'H',
        catatan: currentSession.records?.[std.id]?.catatan || '',
      };
    });
    onSaveSession({
      ...currentSession,
      records,
    });
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `att_${Date.now()}`;
    const initialRecords: Record<string, { status: AttendanceStatus; catatan: string }> = {};
    classStudents.forEach((s) => {
      initialRecords[s.id] = { status: 'H', catatan: '' };
    });

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

  // Stats for current session
  let countH = 0, countS = 0, countI = 0, countA = 0;
  if (currentSession) {
    classStudents.forEach((std) => {
      const st = currentSession.records?.[std.id]?.status;
      if (st === 'H') countH++;
      else if (st === 'S') countS++;
      else if (st === 'I') countI++;
      else if (st === 'A') countA++;
    });
  }
  const totalInSession = classStudents.length || 1;
  const attendanceRate = Math.round((countH / totalInSession) * 100);

  // Generate public share link
  const handleOpenShare = async () => {
    const shareId = `att_share_${currentClass.id}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}?absen_share=${shareId}`;
    setShareLink(fullLink);

    // Save record in local storage and supabase
    const shareRecord: PublicShareRecord = {
      id: shareId,
      type: 'absen',
      classId: currentClass.id,
      title: `Presensi Siswa Kelas ${currentClass.namaKelas} - SMK Muhammadiyah Bawang`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        className: currentClass.namaKelas,
        subject: currentClass.mataPelajaran,
        teacher: teacher.namaGuru,
        school: teacher.namaSekolah,
        students: classStudents,
        sessions: classSessions,
      },
    };

    try {
      await createOrUpdatePublicShare(shareRecord);
    } catch (err) {
      console.warn('Could not sync share to cloud', err);
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

  const filteredStudents = classStudents.filter((s) =>
    s.nama.toLowerCase().includes(filterQuery.toLowerCase())
  );

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
              Buku Presensi & Kehadiran Siswa
            </h2>
            <p className="text-xs text-slate-500">
              SMK Muhammadiyah Bawang &bull; Tahun Ajaran {teacher.tahunAjaran} ({teacher.semester})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => exportAttendanceToExcel(currentClass, classStudents, classSessions, teacher)}
                className="px-3 py-1.5 hover:bg-white text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title="Unduh file Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel
              </button>
              <button
                onClick={() => exportAttendanceToPDF(currentClass, classStudents, classSessions, teacher)}
                className="px-3 py-1.5 hover:bg-white text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title="Cetak format PDF resmi"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Sessions Pills Carousel */}
        {classSessions.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Daftar Sesi Pertemuan ({classSessions.length} Pertemuan)
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {classSessions.map((session) => {
                const isSelected = (currentSession?.id === session.id);
                return (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-semibold transition text-left border flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/30'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold">Pertemuan {session.pertemuanKe}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                      {session.tanggal}
                    </span>
                  </button>
                );
              })}
            </div>
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
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-[11px] font-bold text-indigo-200">
                  Pertemuan Ke-{currentSession.pertemuanKe}
                </span>
                <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentSession.tanggal}
                </span>
              </div>
              <h3 className="font-bold text-base mt-2 leading-snug">
                {currentSession.topikMateri || 'Tanpa topik materi'}
              </h3>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
              <button
                onClick={handleSetAllPresent}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Set Semua Hadir (100%)
              </button>
              <button
                onClick={() => {
                  if (confirm(`Hapus sesi pertemuan ke-${currentSession.pertemuanKe}?`)) {
                    onDeleteSession(currentSession.id);
                  }
                }}
                className="text-xs text-rose-300 hover:text-rose-100 underline decoration-rose-400"
              >
                Hapus Sesi
              </button>
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
                ({countH}/{classStudents.length} Siswa)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-2 gap-2 text-center">
            <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100">
              <span className="block text-emerald-800 font-bold text-lg font-mono">{countH}</span>
              <span className="text-[11px] font-bold text-emerald-600">Hadir (H)</span>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-100">
              <span className="block text-blue-800 font-bold text-lg font-mono">{countS}</span>
              <span className="text-[11px] font-bold text-blue-600">Sakit (S)</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-100">
              <span className="block text-amber-800 font-bold text-lg font-mono">{countI}</span>
              <span className="text-[11px] font-bold text-amber-600">Izin (I)</span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-2xl border border-rose-100">
              <span className="block text-rose-800 font-bold text-lg font-mono">{countA}</span>
              <span className="text-[11px] font-bold text-rose-600">Alfa (A)</span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Grid per Student */}
      {currentSession && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Kehadiran Siswa
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12">No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Nama Peserta Didik</th>
                  <th className="py-2.5 px-3 text-center w-14">L/P</th>
                  <th className="py-2.5 px-3 text-center min-w-[200px]">Status Kehadiran</th>
                  <th className="py-2.5 px-3">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((std) => {
                  const record = currentSession.records?.[std.id] || { status: 'H', catatan: '' };
                  const status = record.status;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition">
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
                          {(['H', 'S', 'I', 'A'] as AttendanceStatus[]).map((st) => {
                            const isSelected = status === st;
                            let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                            if (isSelected) {
                              if (st === 'H') style = 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20';
                              else if (st === 'S') style = 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20';
                              else if (st === 'I') style = 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20';
                              else if (st === 'A') style = 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20';
                            }

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateRecord(std.id, st)}
                                className={`w-9 h-8 rounded-xl font-bold font-mono transition text-xs flex items-center justify-center ${style}`}
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
                          value={record.catatan || ''}
                          onChange={(e) => handleUpdateRecord(std.id, status, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Mulai Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Share Public Link */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Tautan Publik Kehadiran Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Wali murid dan siswa dapat memantau kehadiran secara real-time tanpa perlu akun login.
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
    </div>
  );
};
