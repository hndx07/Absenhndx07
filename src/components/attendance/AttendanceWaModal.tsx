import React from 'react';
import {
  MessageSquare,
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { AttendanceSession, ClassRoom, Student, TeacherProfile } from '../../types';

interface AttendanceWaModalProps {
  isOpen: boolean;
  currentSession: AttendanceSession | null;
  currentClass: ClassRoom;
  teacher: TeacherProfile;
  classStudents: Student[];
  waReportMode: 'group' | 'personal';
  selectedStudentForWa: Student | null;
  waReportText: string;
  waCopied: boolean;
  onClose: () => void;
  onSwitchMode: (mode: 'group' | 'personal') => void;
  onSelectStudent: (student: Student) => void;
  onCopy: () => void;
  onSendWa: () => void;
}

export const AttendanceWaModal: React.FC<AttendanceWaModalProps> = ({
  isOpen,
  currentSession,
  currentClass,
  teacher,
  classStudents,
  waReportMode,
  selectedStudentForWa,
  waReportText,
  waCopied,
  onClose,
  onSwitchMode,
  onSelectStudent,
  onCopy,
  onSendWa,
}) => {
  if (!isOpen || !currentSession) return null;

  return (
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
            onClick={onClose}
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
              onClick={() => onSwitchMode('group')}
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
              onClick={() => onSwitchMode('personal')}
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
                    onSelectStudent(std);
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
              onClick={onCopy}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {waCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{waCopied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            <button
              type="button"
              onClick={onSendWa}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
