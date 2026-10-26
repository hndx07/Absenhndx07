import React from 'react';
import { AlertCircle, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';

export type PublicShareErrorType = 'not_found' | 'expired' | 'revoked' | 'network' | 'invalid_token';

interface PublicShareErrorProps {
  errorType?: PublicShareErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const PublicShareError: React.FC<PublicShareErrorProps> = ({
  errorType = 'not_found',
  title,
  message,
  onRetry,
}) => {
  let displayTitle = title;
  let displayMessage = message;
  let Icon = AlertCircle;
  let iconBg = 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400';

  switch (errorType) {
    case 'expired':
      displayTitle = displayTitle || 'Masa Berlaku Tautan Telah Berakhir';
      displayMessage =
        displayMessage ||
        'Tautan publik ini telah melewati batas waktu berlaku yang ditentukan pendidik. Silakan hubungi pendidik mata pelajaran SMK Muhammadiyah Bawang untuk memperoleh tautan pembaruan terbaru.';
      Icon = AlertCircle;
      break;
    case 'revoked':
      displayTitle = displayTitle || 'Akses Tautan Telah Dicabut';
      displayMessage =
        displayMessage ||
        'Akses publik untuk tautan ini telah dinonaktifkan atau dicabut oleh pendidik demi perlindungan data dan privasi siswa.';
      Icon = ShieldAlert;
      iconBg = 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400';
      break;
    case 'invalid_token':
      displayTitle = displayTitle || 'Format Token Tautan Tidak Valid';
      displayMessage =
        displayMessage ||
        'Format token pada alamat link tidak valid atau terpotong. Pastikan Anda menyalin seluruh alamat link secara lengkap.';
      Icon = AlertCircle;
      break;
    case 'network':
      displayTitle = displayTitle || 'Kendala Jaringan / Sambungan';
      displayMessage =
        displayMessage ||
        'Gagal menyambung ke server Supabase. Pastikan perangkat Anda terhubung ke internet lalu coba segarkan kembali.';
      Icon = WifiOff;
      break;
    default:
      displayTitle = displayTitle || 'Tautan Publik Tidak Ditemukan';
      displayMessage =
        displayMessage ||
        'Tautan publik ini mungkin belum dibagikan atau tautan yang Anda masukkan kurang tepat. Pastikan Anda membuka tautan resmi yang dibagikan oleh pendidik mata pelajaran SMK Muhammadiyah Bawang.';
      Icon = AlertCircle;
      break;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto ${iconBg}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
            {displayTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {displayMessage}
          </p>
        </div>
        {onRetry && (
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
        )}
      </div>
    </div>
  );
};
