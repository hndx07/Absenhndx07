import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Database,
  ShieldCheck,
  ExternalLink,
  X,
  Server,
} from 'lucide-react';
import { checkSupabaseConnection, isSupabaseConfigured } from '../services/supabase';
import {
  checkHasLegacyLocalData,
  getLegacyDataSummary,
  migrateLegacyLocalStorageToSupabase,
} from '../utils/storage';

interface CloudSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const CloudSupabaseModal: React.FC<CloudSupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({ tested: false, ok: false, message: '' });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'schema' | 'migration'>('status');

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const isConfigured = isSupabaseConfigured();
  const hasLegacyData = checkHasLegacyLocalData();
  const legacySummary = getLegacyDataSummary();

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setConnectionStatus({
      tested: true,
      ok: res.ok,
      message: res.message,
    });
    setIsChecking(false);
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationResult('Sedang memindahkan data lokal ke Supabase...');
    try {
      const res = await migrateLegacyLocalStorageToSupabase();
      setMigrationResult(res.message);
      if (res.success && onSyncComplete) {
        onSyncComplete();
      }
    } catch (e: any) {
      setMigrationResult(`Gagal: ${e?.message || 'Error'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const copySqlToClipboard = () => {
    fetch('/supabase-schema.sql')
      .then((r) => r.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopiedSchema(true);
        setTimeout(() => setCopiedSchema(false), 2500);
      })
      .catch(() => {
        // Fallback schema text
        navigator.clipboard.writeText(
          '-- Silakan buka file supabase-schema.sql di root project untuk melihat seluruh skrip DDL.'
        );
        setCopiedSchema(true);
        setTimeout(() => setCopiedSchema(false), 2500);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Status Cloud Supabase</h3>
              <p className="text-xs text-indigo-200/80">
                PostgreSQL, Supabase Auth, Realtime & Row Level Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            Status & Environment
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'migration'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Migrasi Data Lama
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Skrip SQL (supabase-schema.sql)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  connectionStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {connectionStatus.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">
                    {connectionStatus.ok
                      ? 'Tersambung ke PostgreSQL Supabase'
                      : 'Koneksi Supabase Memerlukan Konfigurasi'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    {connectionStatus.message || (isConfigured ? 'Memeriksa...' : 'Variabel lingkungan belum terpasang.')}
                  </p>
                </div>
              </div>

              {/* Environment Variables Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Variabel Lingkungan (Environment Variables)
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-600 block">VITE_SUPABASE_URL</span>
                    <span className="font-mono text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 block truncate">
                      {envUrl || '(Belum diset - tambahkan di .env atau Vercel Settings)'}
                    </span>
                  </div>

                  <div>
                    <span className="font-mono font-bold text-slate-600 block">VITE_SUPABASE_ANON_KEY</span>
                    <span className="font-mono text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 block truncate">
                      {envKey ? `${envKey.slice(0, 16)}...${envKey.slice(-8)}` : '(Belum diset - tambahkan di .env atau Vercel Settings)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vercel Deployment Instructions */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs space-y-2 text-indigo-950">
                <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  Panduan Deploy ke Vercel:
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Buka Dashboard <strong>Vercel</strong> &rarr; Pilih project ini &rarr; <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
                  <li>Tambahkan <code className="font-mono font-bold text-indigo-700">VITE_SUPABASE_URL</code> dengan URL project Supabase Anda.</li>
                  <li>Tambahkan <code className="font-mono font-bold text-indigo-700">VITE_SUPABASE_ANON_KEY</code> dengan Anon/Publishable key Supabase Anda.</li>
                  <li><em>Catatan Keamanan:</em> <strong>JANGAN PERNAH</strong> memasukkan <code>service_role</code> key ke frontend.</li>
                </ol>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isChecking}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Menguji Koneksi...' : 'Uji Koneksi Ulang'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-700" />
                  Alat Migrasi Satu Kali (LocalStorage &rarr; Supabase)
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  Gunakan fitur ini jika Anda memiliki data lama yang tersimpan di browser untuk dipindahkan secara permanen ke PostgreSQL Supabase.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Data Kelas:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.classes}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Data Siswa:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.students}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Sesi Presensi:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.attendance}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Nilai Siswa:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.grades}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Jurnal Mengajar:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.agendas}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="text-slate-500 block">Transaksi Kas:</span>
                  <span className="font-bold text-slate-800 text-sm">{legacySummary.savings}</span>
                </div>
              </div>

              {migrationResult && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-xl font-medium">
                  {migrationResult}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunMigration}
                  disabled={isMigrating || !hasLegacyData}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  {isMigrating ? 'Memproses Migrasi...' : hasLegacyData ? 'Mulai Migrasi ke Supabase' : 'Tidak Ada Data Lokal Lama'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Skrip DDL & RLS PostgreSQL</h4>
                  <p className="text-xs text-slate-500">
                    File <code className="font-mono">supabase-schema.sql</code> telah disiapkan di root project.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {copiedSchema ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copiedSchema ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono max-h-72 overflow-y-auto space-y-1">
                <p className="text-emerald-400">-- 1. Jalankan di Supabase Dashboard &rarr; SQL Editor &rarr; New Query</p>
                <p className="text-slate-400">-- Tabel: teacher_profiles, classes, students, attendance_sessions,</p>
                <p className="text-slate-400">-- student_grades, grade_columns, teaching_agendas, saving_transactions, public_shares</p>
                <p className="text-indigo-300">-- Seluruh tabel privat telah dilengkapi Row Level Security (RLS) dengan auth.uid()</p>
                <p className="text-slate-400">-- Silakan klik tombol "Salin Skrip SQL" di atas atau buka file supabase-schema.sql.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
