import React from 'react';
import {
  Edit2,
  X,
  Clock,
  ChevronUp,
  ChevronDown,
  Check,
  Trash2,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { AttendanceSession } from '../../types';
import { TEACHING_PERIODS } from '../../utils/teachingPeriods';
import { getIndoDay, parseTimeRangeHelper } from './types';

interface AttendanceEditModalProps {
  isOpen: boolean;
  editingSessionData: AttendanceSession | null;
  editSelectedPeriods: number[];
  isEditTimeSectionExpanded: boolean;
  isEditPeriodsExpanded: boolean;
  isSavingToCloud: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  setEditingSessionData: React.Dispatch<React.SetStateAction<AttendanceSession | null>>;
  setIsEditTimeSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditPeriodsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  onQuickSelectPeriods: (periods: number[]) => void;
  onTogglePeriod: (periodNo: number) => void;
  isPeriodActive: (periods: number[]) => boolean;
}

export const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
  isOpen,
  editingSessionData,
  editSelectedPeriods,
  isEditTimeSectionExpanded,
  isEditPeriodsExpanded,
  isSavingToCloud,
  onClose,
  onSubmit,
  onDelete,
  setEditingSessionData,
  setIsEditTimeSectionExpanded,
  setIsEditPeriodsExpanded,
  onStartTimeChange,
  onEndTimeChange,
  onQuickSelectPeriods,
  onTogglePeriod,
  isPeriodActive,
}) => {
  if (!isOpen || !editingSessionData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Edit Sesi Pertemuan Absen & Agenda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perubahan langsung tersinkronisasi ke Agenda Mengajar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
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
                value={editingSessionData.pertemuanKe}
                onChange={(e) =>
                  setEditingSessionData({
                    ...editingSessionData,
                    pertemuanKe: Number(e.target.value),
                  })
                }
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Tanggal Pertemuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={editingSessionData.tanggal}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const dayName = getIndoDay(newDate);
                  setEditingSessionData({
                    ...editingSessionData,
                    tanggal: newDate,
                    hari: dayName,
                  });
                }}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Hari
              </label>
              <input
                type="text"
                required
                value={editingSessionData.hari || getIndoDay(editingSessionData.tanggal)}
                onChange={(e) =>
                  setEditingSessionData({
                    ...editingSessionData,
                    hari: e.target.value,
                  })
                }
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SEKSI WAKTU MENGAJAR - Collapsible Accordion */}
          <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div
              onClick={() => setIsEditTimeSectionExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none transition border-b border-slate-200/60 dark:border-slate-700/60"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                    WAKTU MENGAJAR
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Jam ke: {editingSessionData.jamKe || '1 - 4'} &bull; {editingSessionData.rentangJam || '07:15 - 09:15 WIB'}
                </span>
              </div>

              <button
                type="button"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                {isEditTimeSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isEditTimeSectionExpanded && (
              <div className="p-3.5 space-y-3.5 max-h-[360px] overflow-y-auto animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Jam Mulai
                    </label>
                    <input
                      type="time"
                      value={parseTimeRangeHelper(editingSessionData.rentangJam).start}
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
                      value={parseTimeRangeHelper(editingSessionData.rentangJam).end}
                      onChange={(e) => onEndTimeChange(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Jam ke:
                      </span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {editingSessionData.jamKe || '1 - 4'}
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
                        onClick={() => setIsEditPeriodsExpanded((prev) => !prev)}
                        className="px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isEditPeriodsExpanded ? 'Tutup Daftar' : '12 Jam'}</span>
                        {isEditPeriodsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {isEditPeriodsExpanded && (
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {TEACHING_PERIODS.map((period) => {
                        const isSelected = editSelectedPeriods.includes(period.no);
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

          {/* Materi Pokok / Capaian Pembelajaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Materi Pokok / Capaian Pembelajaran <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Pengujian Jaringan Lokal dan Troubleshoot IP Address"
              value={editingSessionData.topikMateri || ''}
              onChange={(e) =>
                setEditingSessionData({ ...editingSessionData, topikMateri: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              value={editingSessionData.kegiatan || ''}
              onChange={(e) =>
                setEditingSessionData({ ...editingSessionData, kegiatan: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              value={editingSessionData.catatan || ''}
              onChange={(e) =>
                setEditingSessionData({ ...editingSessionData, catatan: e.target.value })
              }
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Sesi</span>
            </button>

            <div className="flex items-center gap-2">
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
                {isSavingToCloud ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                <span>Simpan Perubahan & Sinkron Agenda</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
