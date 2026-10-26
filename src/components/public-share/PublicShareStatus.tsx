import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface PublicShareLoadingProps {
  message?: string;
}

export const PublicShareLoading: React.FC<PublicShareLoadingProps> = ({
  message = 'Memuat data transparansi resmi SMK Muhammadiyah Bawang...',
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            Menghubungkan ke Portal Sekolah...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PublicShareErrorProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  isExpiredOrRevoked?: boolean;
}

export const PublicShareError: React.FC<PublicShareErrorProps> = ({
  title = 'Tautan Publik Tidak Ditemukan',
  message,
  onRetry,
  isExpiredOrRevoked = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
            {isExpiredOrRevoked ? 'Tautan Telah Berakhir atau Dicabut' : title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {message ||
              (isExpiredOrRevoked
                ? 'Masa berlaku tautan publik ini telah berakhir atau akses telah dicabut oleh pendidik demi keamanan data siswa. Silakan hubungi guru yang bersangkutan untuk mendapatkan tautan terbaru.'
                : 'Tautan publik ini mungkin belum dibagikan atau tautan yang Anda masukkan kurang tepat. Pastikan Anda membuka link resmi yang dibagikan oleh pendidik mata pelajaran SMK Muhammadiyah Bawang.')}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Segarkan Lagi
          </button>
        </div>
      </div>
    </div>
  );
};
