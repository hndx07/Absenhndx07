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
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  checkSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
} from '../services/supabase';
import { syncAllToSupabase } from '../utils/storage';
import { SupabaseConfig } from '../types';

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
  const [config, setConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({ tested: false, ok: false, message: '' });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'schema' | 'sync'>('config');

  useEffect(() => {
    if (isOpen) {
      const cur = getStoredSupabaseConfig();
      setConfig(cur);
      handleTestConnection(cur);
    }
  }, [isOpen]);

  const handleTestConnection = async (conf = config) => {
    setIsChecking(true);
    // save temporarily to test
    saveSupabaseConfig(conf);
    const res = await checkSupabaseConnection();
    setConnectionStatus({
      tested: true,
      ok: res.ok,
      message: res.message,
    });
    setIsChecking(false);
  };

  const handleSave = async () => {
    saveSupabaseConfig(config);
    await handleTestConnection(config);
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    const result = await syncAllToSupabase();
    setIsSyncing(false);
    if (result.success) {
      const updated = getStoredSupabaseConfig();
      setConfig(updated);
      if (onSyncComplete) onSyncComplete();
    }
    alert(result.message);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
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
              <h3 className="font-bold text-lg leading-tight">Integrasi Cloud Supabase</h3>
              <p className="text-xs text-indigo-200/80">
                PostgreSQL, Google OAuth, Realtime & Row Level Security
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
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Koneksi & API Keys
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sync'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Sinkronisasi Data
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
            Skrip SQL (DDL)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  connectionStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {connectionStatus.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">
                    {connectionStatus.ok ? 'Tersambung ke Cloud Supabase' : 'Status Koneksi Cloud'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">
                    {connectionStatus.message ||
                      'Menggunakan arsitektur Browser-First. Jika kredensial kosong, data disimpan 100% aman di LocalStorage browser Anda.'}
                  </p>
                </div>
              </div>

              {/* Form Input URL & Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value.trim() })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Dapat diperoleh dari dashboard Supabase: Project Settings → API → Project URL.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supabase Anon / Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.supabaseAnonKey}
                  onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value.trim() })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Kunci publik aman untuk frontend (Project Settings → API → Project API Keys → anon).
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isChecking}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isChecking && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simpan & Uji Koneksi
                </button>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition flex items-center gap-1.5 ml-auto"
                >
                  Buka Supabase <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  Mekanisme Browser-First & Cloud Sync
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Aplikasi ini dirancang <strong>Browser-First</strong>. Setiap presensi siswa, nilai
                  formatif/sumatif, jurnal mengajar, dan tabungan tersimpan instan di penyimpanan lokal browser.
                  Anda dapat menyinkronkan seluruh basis data ke tabel PostgreSQL Supabase kapan pun secara aman.
                </p>
                {config.lastSyncedAt && (
                  <p className="text-xs text-indigo-700 font-medium mt-2">
                    Terakhir disinkronkan: {new Date(config.lastSyncedAt).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div className="p-5 bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                <RefreshCw className={`w-10 h-10 text-indigo-600 mb-2 ${isSyncing ? 'animate-spin' : ''}`} />
                <h5 className="font-bold text-slate-800 text-sm">Sinkronkan Seluruh Data Lokal ke Cloud</h5>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                  Mengunggah profil guru, daftar kelas, peserta didik, data kehadiran, penilaian, dan kas ke tabel Supabase.
                </p>
                <button
                  type="button"
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sedang Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Sinkronkan ke Cloud Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Salin skrip SQL ini lalu jalankan di menu <strong>SQL Editor</strong> di dashboard Supabase Anda.
                </p>
                <button
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSchema ? 'Tersalin!' : 'Salin Semua SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-indigo-500">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
