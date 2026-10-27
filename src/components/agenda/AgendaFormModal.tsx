import React from 'react';
import {
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Users,
  CheckCircle2,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { ClassRoom, TeachingAgenda, TeacherProfile, Student } from '../../types';
import { TEACHING_PERIODS } from './types';
import { SearchableClassSelect } from '../SearchableClassSelect';

interface AbsentStudentInfo {
  name: string;
  status: string;
  statusLabel: string;
  catatan?: string;
}

interface AttendanceBreakdownInfo {
  hasSession: boolean;
  totalStudents: number;
  hadir: number;
  tidakHadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dispen: number;
  absentStudents: AbsentStudentInfo[];
  pertemuanKe?: number;
  topikMateri?: string;
}

interface AgendaFormModalProps {
  isModalOpen: boolean;
  editingAgenda: Partial<TeachingAgenda> | null;
  classes: ClassRoom[];
  teacher: TeacherProfile;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setEditingAgenda: React.Dispatch<React.SetStateAction<Partial<TeachingAgenda> | null>>;
  isTimeSectionExpanded: boolean;
  setIsTimeSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  parseTimeRange: (rangeStr?: string) => { start: string; end: string };
  handleStartTimeChange: (newStart: string) => void;
  handleEndTimeChange: (newEnd: string) => void;
  handleTogglePeriod: (periodNo: number) => void;
  handleQuickSelectPeriods: (periods: number[]) => void;
  isPeriodsActive: (periods: number[]) => boolean;
  isPeriodsExpanded: boolean;
  setIsPeriodsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPeriods: number[];
  targetClassStudents: Student[];
  attendanceBreakdown: AttendanceBreakdownInfo;
  handleSyncFromAttendance: () => void;
  handleSetAllPresentInAgenda: () => void;
}

export const AgendaFormModal: React.FC<AgendaFormModalProps> = ({
  isModalOpen,
  editingAgenda,
  classes,
  teacher,
  isSaving,
  onClose,
  onSubmit,
  setEditingAgenda,
  isTimeSectionExpanded,
  setIsTimeSectionExpanded,
  parseTimeRange,
  handleStartTimeChange,
  handleEndTimeChange,
  handleTogglePeriod,
  handleQuickSelectPeriods,
  isPeriodsActive,
  isPeriodsExpanded,
  setIsPeriodsExpanded,
  selectedPeriods,
  targetClassStudents,
  attendanceBreakdown,
  handleSyncFromAttendance,
  handleSetAllPresentInAgenda,
}) => {
  if (!isModalOpen || !editingAgenda) return null;

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
                setEditingAgenda((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    classId: newClsId,
                    classNameSnapshot: sel?.namaKelas || '',
                    mataPelajaran: sel?.mataPelajaran || prev.mataPelajaran || teacher.mataPelajaranUtama,
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
                        setEditingAgenda((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            tanggal: newDate,
                            hari: days[d.getDay()] || 'Senin',
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

              {attendanceBreakdown.hasSession ? (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Presensi Ditemukan (Pertemuan Ke-{attendanceBreakdown.pertemuanKe})
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
              onClick={onClose}
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
  );
};
