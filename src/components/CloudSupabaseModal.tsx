import React, { useState } from 'react';
import { X, Cloud, Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseUrl } from '../services/supabase';

interface CloudSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncNow?: () => Promise<void>;
}

export const CloudSupabaseModal: React.FC<CloudSupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncNow,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isConfigured = isSupabaseConfigured();
  const url = getSupabaseUrl();

  if (!isOpen) return null;

  const handleCopySQLNotice = () => {
    navigator.clipboard.writeText('Lihat file supabase-schema.sql di root project untuk skema tabel lengkap.');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSync = async () => {
    if (!onSyncNow) return;
    setIsSyncing(true);
    try {
      await onSyncNow();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header with Muhammadiyah Visual Identity */}
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-white">Sinkronisasi Cloud & Supabase</h3>
              <p className="text-xs text-emerald-100">
                Penyimpanan Database Cloud Native & Offline-First
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Box */}
          <div
            className={`p-4 rounded-2xl border ${
              isConfigured
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {isConfigured ? 'Supabase Terhubung (Cloud Active)' : 'Mode Penyimpanan Lokal (Offline-First)'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {isConfigured
                    ? `Aplikasi terhubung ke instance Supabase: ${url}. Semua data secara otomatis disinkronkan ke cloud.`
                    : 'Aplikasi saat ini berjalan menggunakan LocalStorage browser. Data tetap aman di perangkat Anda.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync action if configured */}
          {isConfigured && onSyncNow && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Sinkronkan Ulang Sekarang</h4>
                <p className="text-[11px] text-slate-500">Ambil pembaruan terbaru dari Supabase Cloud</p>
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-[#009B62] hover:bg-[#008276] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>
            </div>
          )}

          {/* SQL Schema Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Struktur Database PostgreSQL Supabase</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Skema database lengkap telah disediakan dalam file <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">supabase-schema.sql</code> di proyek ini. Skema mencakup tabel profil guru, kelas, siswa, presensi, nilai kurikulum merdeka, jurnal agenda mengajar, dan tabungan siswa lengkap dengan Row Level Security (RLS).
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-600 truncate mr-2">
                supabase-schema.sql (100% RLS & Multi-class Ready)
              </span>
              <button
                type="button"
                onClick={handleCopySQLNotice}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#009B62] text-xs font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
