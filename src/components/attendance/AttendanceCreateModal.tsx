import React from 'react';
import {
  BookMarked,
  X,
  Clock,
  ChevronUp,
  ChevronDown,
  Check,
  CheckCircle2,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { ClassRoom, TeacherProfile, TeachingAgenda } from '../../types';
import { TEACHING_PERIODS } from '../../utils/teachingPeriods';
import { NewSessionFormData, getIndoDay, parseTimeRangeHelper } from './types';

interface AttendanceCreateModalProps {
  isOpen: boolean;
  currentClass: ClassRoom;
  teacher: TeacherProfile;
  newSessionData: NewSessionFormData;
  newSelectedPeriods: number[];
  isNewTimeSectionExpanded: boolean;
  isNewPeriodsExpanded: boolean;
  isSavingToCloud: boolean;
  agendas?: TeachingAgenda[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setNewSessionData: React.Dispatch<React.SetStateAction<NewSessionFormData>>;
  setIsNewTimeSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNewPeriodsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  onQuickSelectPeriods: (periods: number[]) => void;
  onTogglePeriod: (periodNo: number) => void;
  isPeriodActive: (periods: number[]) => boolean;
}

export const AttendanceCreateModal: React.FC<AttendanceCreateModalProps> = ({
  isOpen,
  currentClass,
  teacher,
  newSessionData,
  newSelectedPeriods,
  isNewTimeSectionExpanded,
  isNewPeriodsExpanded,
  isSavingToCloud,
  agendas = [],
  onClose,
  onSubmit,
  setNewSessionData,
  setIsNewTimeSectionExpanded,
  setIsNewPeriodsExpanded,
  onStartTimeChange,
  onEndTimeChange,
  onQuickSelectPeriods,
  onTogglePeriod,
  isPeriodActive,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Buat Pertemuan Baru & Sinkron Agenda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Input absen langsung tersinkronisasi otomatis ke Agenda Mengajar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Rombel & Pengajar */}
        <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800">
            Kelas: {currentClass.namaKelas}
          </span>
          <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg">
            Mapel: {currentClass.mataPelajaran || teacher.mataPelajaranUtama}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-auto">
            Guru: {teacher.namaGuru}
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Row 1: Pertemuan Ke-, Tanggal & Hari */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Pertemuan Ke- <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={newSessionData.pertemuanKe}
                onChange={(e) => {
                  const pKe = Number(e.target.value);
                  const match = agendas.find((a) => a.classId === currentClass.id && a.pertemuanKe === pKe);
                  setNewSessionData((prev) => ({
                    ...prev,
                    pertemuanKe: pKe,
                    topikMateri: match?.materiAjar || prev.topikMateri,
                    kegiatan: match?.kegiatan || prev.kegiatan,
                    catatan: match?.catatan || prev.catatan,
                  }));
                }}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newSessionData.tanggal}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const dayName = getIndoDay(newDate);
                  const match = agendas.find((a) => a.classId === currentClass.id && a.tanggal === newDate);
                  setNewSessionData((prev) => ({
                    ...prev,
                    tanggal: newDate,
                    hari: dayName,
                    topikMateri: match?.materiAjar || prev.topikMateri,
                    kegiatan: match?.kegiatan || prev.kegiatan,
                    catatan: match?.catatan || prev.catatan,
                    jamKe: match?.jamKe || prev.jamKe,
                    rentangJam: match?.rentangJam || prev.rentangJam,
                  }));
                }}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Hari
              </label>
              <input
                type="text"
                required
                value={newSessionData.hari}
                onChange={(e) => setNewSessionData({ ...newSessionData, hari: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SEKSI WAKTU MENGAJAR - Collapsible Accordion (Sama dengan Agenda Mengajar) */}
          <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            {/* Header Collapsible Waktu Mengajar */}
            <div
              onClick={() => setIsNewTimeSectionExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none transition border-b border-slate-200/60 dark:border-slate-700/60"
              title={isNewTimeSectionExpanded ? 'Tutup Waktu Mengajar' : 'Buka Waktu Mengajar'}
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                    WAKTU MENGAJAR
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Jam ke: {newSessionData.jamKe} &bull; {newSessionData.rentangJam}
                </span>
              </div>

              <button
                type="button"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                {isNewTimeSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Body Collapsible Waktu Mengajar */}
            {isNewTimeSectionExpanded && (
              <div className="p-3.5 space-y-3.5 max-h-[360px] overflow-y-auto animate-in fade-in duration-200">
                {/* Grid Jam Mulai & Jam Selesai */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Jam Mulai
                    </label>
                    <input
                      type="time"
                      value={parseTimeRangeHelper(newSessionData.rentangJam).start}
                      onChange={(e) => onStartTimeChange(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Jam Selesai
                    </label>
                    <input
                      type="time"
                      value={parseTimeRangeHelper(newSessionData.rentangJam).end}
                      onChange={(e) => onEndTimeChange(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        {newSessionData.jamKe}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Pilih Cepat:</span>
                      <button
                        type="button"
                        onClick={() => onQuickSelectPeriods([1, 2, 3, 4])}
                        className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          isPeriodActive([1, 2, 3, 4])
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        1-4
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickSelectPeriods([5, 6, 7, 8])}
                        className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          isPeriodActive([5, 6, 7, 8])
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        5-8
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickSelectPeriods([9, 10, 11, 12])}
                        className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          isPeriodActive([9, 10, 11, 12])
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        9-12
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewPeriodsExpanded((prev) => !prev)}
                        className="px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isNewPeriodsExpanded ? 'Tutup Daftar' : '12 Jam'}</span>
                        {isNewPeriodsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Grid 12 Jam Pelajaran */}
                  {isNewPeriodsExpanded && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {TEACHING_PERIODS.map((period) => {
                        const isSelected = newSelectedPeriods.includes(period.no);
                        return (
                          <div
                            key={period.no}
                            onClick={() => onTogglePeriod(period.no)}
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

          {/* Materi Pokok / Capaian Pembelajaran (TP) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Materi Pokok / Capaian Pembelajaran (TP) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Konfigurasi Virtual LAN (VLAN) dan Trunking pada Switch Cisco"
              value={newSessionData.topikMateri}
              onChange={(e) => setNewSessionData({ ...newSessionData, topikMateri: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Kegiatan Pembelajaran & Sintaks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Kegiatan Pembelajaran & Sintaks
            </label>
            <textarea
              rows={2}
              placeholder="Deskripsi kegiatan (Apersepsi, Diskusi kelompok, Praktikum lab, Refleksi)..."
              value={newSessionData.kegiatan}
              onChange={(e) => setNewSessionData({ ...newSessionData, kegiatan: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Catatan / Evaluasi / Kendala Pembelajaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Catatan / Evaluasi / Kendala Pembelajaran
            </label>
            <textarea
              rows={2}
              placeholder="Catatan keaktifan murid, kendala perangkat lab, atau tindak lanjut..."
              value={newSessionData.catatan}
              onChange={(e) => setNewSessionData({ ...newSessionData, catatan: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Box Notifikasi Sinkronisasi Langsung ke Agenda Mengajar */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <span className="font-bold">Sinkronisasi Langsung ke Agenda Mengajar:</span>
              <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                Menyimpan pertemuan ini otomatis membuat & menyinkronkan Agenda Mengajar secara real-time, termasuk rekap presensi murid (hadir/tidak hadir).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingToCloud}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
            >
              {isSavingToCloud ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              <span>Simpan Pertemuan & Sinkron Agenda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
