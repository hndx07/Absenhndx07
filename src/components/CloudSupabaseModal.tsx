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
  X,
  Server,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import {
  checkSupabaseConnection,
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  isValidHttpUrl,
} from '../services/supabase';
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
    connected?: boolean;
    databaseSchemaReady?: boolean;
    authReady?: boolean;
    readReady?: boolean;
    writeReady?: boolean;
    missingTables?: string[];
    message: string;
  }>({ tested: false, ok: false, message: '' });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'schema' | 'migration'>('status');

  const [inputUrl, setInputUrl] = useState(() => getSupabaseUrl());
  const [inputKey, setInputKey] = useState(() => getSupabaseAnonKey());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const currentUrl = getSupabaseUrl();
  const currentKey = getSupabaseAnonKey();
  const isConfigured = isSupabaseConfigured();
  const hasLegacyData = checkHasLegacyLocalData();
  const legacySummary = getLegacyDataSummary();

  useEffect(() => {
    if (isOpen) {
      setInputUrl(getSupabaseUrl());
      setInputKey(getSupabaseAnonKey());
      handleTestConnection();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setIsChecking(true);
    const res = await checkSupabaseConnection();
    setConnectionStatus({
      tested: true,
      ok: res.ok,
      connected: res.connected,
      databaseSchemaReady: res.databaseSchemaReady,
      authReady: res.authReady,
      readReady: res.readReady,
      writeReady: res.writeReady,
      missingTables: res.missingTables,
      message: res.message,
    });
    setIsChecking(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = inputUrl.trim();
    const cleanKey = inputKey.trim();

    if (!isValidHttpUrl(cleanUrl)) {
      alert('URL Supabase tidak valid! URL harus diawali dengan https:// (contoh: https://xyzcompany.supabase.co).');
      return;
    }

    setCustomSupabaseConfig(cleanUrl, cleanKey);
    setSaveSuccessMsg('Kredensial Supabase berhasil disimpan! Sedang menguji koneksi...');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
    await handleTestConnection();
    setActiveTab('status');
  };

  const handleResetConfig = async () => {
    if (confirm('Reset kredensial kembali ke nilai Environment Variables (.env)?')) {
      clearCustomSupabaseConfig();
      setInputUrl(getSupabaseUrl());
      setInputKey(getSupabaseAnonKey());
      setSaveSuccessMsg('Kredensial direset ke environment bawaan.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      await handleTestConnection();
    }
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
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            Status Server
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Konfigurasi URL & Kunci
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
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
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'schema'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Skrip SQL (DDL)
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
                      : connectionStatus.databaseSchemaReady === false
                      ? 'DATABASE_SCHEMA_READY = FALSE'
                      : 'Koneksi Supabase Memerlukan Konfigurasi'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    {connectionStatus.message || (isConfigured ? 'Memeriksa...' : 'Variabel lingkungan belum terpasang.')}
                  </p>
                </div>
              </div>

              {/* Current URL diagnostic */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Project URL Supabase:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isValidHttpUrl(currentUrl) ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {isValidHttpUrl(currentUrl) ? 'URL VALID' : 'URL TIDAK VALID'}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 truncate">
                  {currentUrl || '(Belum dikonfigurasi)'}
                </p>
                {!isValidHttpUrl(currentUrl) && (
                  <p className="text-[11px] text-rose-600 font-semibold pt-0.5">
                    Peringatan: Nilai di atas bukan URL HTTP/HTTPS. Silakan buka tab <button type="button" onClick={() => setActiveTab('config')} className="underline font-bold text-indigo-600 cursor-pointer">Konfigurasi URL & Kunci</button> untuk memasukkan URL project Anda.
                  </p>
                )}
              </div>

              {/* Detailed Diagnostic Matrix */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Status Diagnostik Supabase
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-600 font-mono text-[11px]">CONNECTED:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${connectionStatus.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {connectionStatus.connected ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-600 font-mono text-[11px]">SCHEMA_READY:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${connectionStatus.databaseSchemaReady ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {connectionStatus.databaseSchemaReady ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-600 font-mono text-[11px]">AUTH_READY:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${connectionStatus.authReady ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {connectionStatus.authReady ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-600 font-mono text-[11px]">READ_READY:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${connectionStatus.readReady ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {connectionStatus.readReady ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-600 font-mono text-[11px]">WRITE_READY:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${connectionStatus.writeReady ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {connectionStatus.writeReady ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
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

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-2">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-700" />
                  Konfigurasi URL & Kunci Proyek Supabase
                </h4>
                <p className="text-indigo-800 leading-relaxed">
                  Jika environment variable Vercel atau hosting belum terpasang atau salah memasukkan token, Anda dapat memasukkan URL project dan Public/Anon Key langsung di sini. Pengaturan ini akan disimpan di browser ini.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Project URL:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Format: <span className="font-mono text-indigo-600 font-bold">https://&lt;project-id&gt;.supabase.co</span> (Bukan token sb_secret_...).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Public / Anon Key:
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kunci Anon/Public dapat disalin dari Dashboard Supabase &rarr; Project Settings &rarr; API &rarr; Project API keys (anon public).
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Reset ke Bawaan (.env)
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan & Terapkan Kredensial</span>
                  </button>
                </div>
              </form>
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
