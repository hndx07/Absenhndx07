import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, CheckCircle2, X, Download } from 'lucide-react';

export interface ExcelToastItem {
  id: string;
  fileName: string;
  title: string;
  timestamp: string;
}

export const ExcelDownloadToast: React.FC = () => {
  const [toasts, setToasts] = useState<ExcelToastItem[]>([]);

  useEffect(() => {
    const handleDownloadEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileName: string; title: string; timestamp: string }>;
      if (!customEvent.detail) return;

      const newToast: ExcelToastItem = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: customEvent.detail.fileName || 'Data_Export.xlsx',
        title: customEvent.detail.title || 'File Excel Berhasil Diunduh',
        timestamp: customEvent.detail.timestamp || new Date().toLocaleTimeString('id-ID'),
      };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('excel-download-completed', handleDownloadEvent);
    return () => {
      window.removeEventListener('excel-download-completed', handleDownloadEvent);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none sm:max-w-md no-print">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-slate-900 border-2 border-emerald-500/70 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 text-slate-900 dark:text-white animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-md"
          role="alert"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/30">
            <FileSpreadsheet className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black tracking-wide uppercase">Unduhan Selesai</span>
              <span className="text-[10px] text-slate-400 font-mono ml-auto">{toast.timestamp}</span>
            </div>

            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5 truncate">
              {toast.title}
            </h4>

            <div className="mt-1 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-200 truncate select-all">
                {toast.fileName}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              File Excel telah tersimpan di folder <strong>Unduhan (Downloads)</strong> perangkat Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
