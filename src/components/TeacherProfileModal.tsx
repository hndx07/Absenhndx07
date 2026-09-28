import React, { useState, useEffect } from 'react';
import {
  User,
  Save,
  Download,
  LogOut,
  X,
  FileJson,
  Database,
  CheckCircle2,
  RefreshCw,
  Info,
  RotateCcw,
} from 'lucide-react';
import { TeacherProfile } from '../types';
import { createOrUpdateTeacherProfile } from '../services/data';
import { signOutSupabase } from '../services/supabase';
import {
  checkHasLegacyLocalData,
  getLegacyDataSummary,
  migrateLegacyLocalStorageToSupabase,
} from '../utils/storage';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherProfile;
  onUpdateTeacher: (updated: TeacherProfile) => void;
  onLogout: () => void;
  onDataMigrated?: () => void;
  onDownloadBackup?: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onUpdateTeacher,
  onLogout,
  onDataMigrated,
  onDownloadBackup,
}) => {
  const [profile, setProfile] = useState<TeacherProfile>({ ...teacher });
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile({ ...teacher });
      setIsDirty(false);
    }
  }, [isOpen, teacher]);

  if (!isOpen) return null;

  const hasLegacyData = checkHasLegacyLocalData();
  const legacySummary = getLegacyDataSummary();

  const handleFieldChange = (field: keyof TeacherProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleReset = () => {
    setProfile({ ...teacher });
    setIsDirty(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await createOrUpdateTeacherProfile(profile);
      onUpdateTeacher(saved);
      setIsDirty(false);
      alert('Identitas guru & tahun ajaran berhasil disimpan ke PostgreSQL Supabase!');
      onClose();
    } catch (err: any) {
      alert(`Gagal memperbarui profil: ${err?.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunMigration = async () => {
    if (!confirm('Pindahkan seluruh data lokal lama dari browser ke database Supabase?')) {
      return;
    }
    setIsMigrating(true);
    setMigrationStatus('Memindahkan data...');
    try {
      const res = await migrateLegacyLocalStorageToSupabase();
      setMigrationStatus(res.message);
      alert(res.message);
      if (res.success && onDataMigrated) {
        onDataMigrated();
      }
    } catch (e: any) {
      setMigrationStatus(`Gagal: ${e?.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handlePerformLogout = async () => {
    if (confirm('Keluar dari sesi Supabase Auth?')) {
      await signOutSupabase();
      onLogout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Pengaturan Profil Guru & Data</h3>
              <p className="text-xs text-indigo-200">
                Data tersimpan di tabel teacher_profiles Supabase
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Draft Notification Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-indigo-950 dark:text-indigo-200">
                Mode Draft (Aman & Terkontrol)
              </p>
              <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
                Isian identitas guru dan tahun ajaran <strong>tidak langsung tersimpan ke cloud server</strong> saat Anda mengetik. Data baru akan disinkronkan ke PostgreSQL Supabase hanya saat tombol <em>Simpan Profil ke Supabase</em> ditekan.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Nama Lengkap Guru (dengan Gelar) *
                </label>
                <input
                  type="text"
                  required
                  value={profile.namaGuru}
                  onChange={(e) => handleFieldChange('namaGuru', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={profile.nip}
                  onChange={(e) => handleFieldChange('nip', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  NBM (Nomor Baku Muhammadiyah)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1182940"
                  value={profile.nbm || ''}
                  onChange={(e) => handleFieldChange('nbm', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={profile.tahunAjaran}
                  onChange={(e) => handleFieldChange('tahunAjaran', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Semester
                </label>
                <select
                  value={profile.semester}
                  onChange={(e) => handleFieldChange('semester', e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 dark:text-white font-semibold"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Nama Satuan Pendidikan
                </label>
                <input
                  type="text"
                  value={profile.namaSekolah}
                  onChange={(e) => handleFieldChange('namaSekolah', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {isDirty ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Isian
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Semua isian sinkron</span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ml-auto"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Menyimpan...' : 'Simpan Profil ke Supabase'}
              </button>
            </div>
          </form>

          {/* Legacy Migration Section (Requirement T) */}
          {hasLegacyData && (
            <div className="pt-4 border-t border-slate-200 space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Database className="w-4 h-4 text-amber-700" />
                <span>Migrasi Data Lokal Lama ke Supabase</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Ditemukan data lama di peramban: {legacySummary.classes} kelas, {legacySummary.students} siswa, {legacySummary.attendance} absensi, {legacySummary.grades} nilai, {legacySummary.agendas} jurnal.
              </p>
              <button
                type="button"
                onClick={handleRunMigration}
                disabled={isMigrating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isMigrating ? 'Mengimpor ke Supabase...' : 'Impor Data Lokal ke Supabase'}
              </button>
              {migrationStatus && <p className="text-xs font-semibold text-amber-950 mt-1">{migrationStatus}</p>}
            </div>
          )}

          {/* Backup Export */}
          {onDownloadBackup && (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  Unduh Salinan JSON
                </h4>
                <p className="text-[11px] text-slate-500">Ekspor salinan data Supabase aktif ke file JSON.</p>
              </div>
              <button
                type="button"
                onClick={onDownloadBackup}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                Unduh JSON
              </button>
            </div>
          )}

          {/* Sign Out */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sesi Supabase Auth</span>
            <button
              type="button"
              onClick={handlePerformLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
