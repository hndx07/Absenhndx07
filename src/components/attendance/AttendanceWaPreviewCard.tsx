import React from 'react';
import {
  MessageSquare,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  MessageCircle,
} from 'lucide-react';
import { AttendanceSession } from '../../types';

interface AttendanceWaPreviewCardProps {
  currentSession: AttendanceSession;
  isWaPreviewExpanded: boolean;
  waInlineCopied: boolean;
  onToggleWaPreview: () => void;
  onCopyGroupWaReport: () => void;
  onOpenWaReportModal: () => void;
  generateGroupWaReportText: (session: AttendanceSession) => string;
}

export const AttendanceWaPreviewCard: React.FC<AttendanceWaPreviewCardProps> = ({
  currentSession,
  isWaPreviewExpanded,
  waInlineCopied,
  onToggleWaPreview,
  onCopyGroupWaReport,
  onOpenWaReportModal,
  generateGroupWaReportText,
}) => {
  return (
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
            onClick={onToggleWaPreview}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title={isWaPreviewExpanded ? 'Sembunyikan pratinjau teks' : 'Tampilkan teks laporan lengkap'}
          >
            {isWaPreviewExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isWaPreviewExpanded ? 'Tutup Pratinjau' : 'Buka Pratinjau Teks'}</span>
          </button>

          <button
            type="button"
            onClick={onCopyGroupWaReport}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Salin teks laporan ke clipboard"
          >
            {waInlineCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{waInlineCopied ? 'Tersalin!' : 'Salin Laporan WA'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWaReportModal}
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
  );
};
