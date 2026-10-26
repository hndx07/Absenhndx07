import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PublicShareLoadingProps {
  message?: string;
}

export const PublicShareLoading: React.FC<PublicShareLoadingProps> = ({
  message = 'Memuat data transparansi resmi SMK Muhammadiyah Bawang...',
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-sm">
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
