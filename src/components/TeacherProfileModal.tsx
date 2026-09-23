import React, { useState, useRef } from 'react';
import {
  User,
  Save,
  Download,
  Upload,
  LogOut,
  X,
  Check,
  Shield,
  FileJson,
  School,
} from 'lucide-react';
import { TeacherProfile } from '../types';
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
  saveStoredTeacher,
} from '../utils/storage';
import { signOutSupabase } from '../services/supabase';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherProfile;
  onUpdateTeacher: (updated: TeacherProfile) => void;
  onLogout: () => void;
  onDataRestored: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onUpdateTeacher,
  onLogout,
  onDataRestored,
}) => {
  const [profile, setProfile] = useState<TeacherProfile>({ ...teacher });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredTeacher(profile);
    onUpdateTeacher(profile);
    alert('Profil Guru berhasil diperbarui!');
    onClose();
  };

  const handleDownloadBackup = () => {
    const jsonStr = createDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SMK_Muh_Bawang_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = restoreDatabaseBackup(content);
        if (result.success) {
          alert(result.message);
          onDataRestored();
          onClose();
        } else {
          alert(result.message);
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePerformLogout = async () => {
    if (confirm('Keluar dari sesi guru saat ini?')) {
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
                Administrasi Guru SMK Muhammadiyah Bawang
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Guru (dengan Gelar) *
                </label>
                <input
                  type="text"
                  required
                  value={profile.namaGuru}
                  onChange={(e) => setProfile({ ...profile, namaGuru: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={profile.nip}
                  onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  NBM (Nomor Baku Muhammadiyah)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1182940"
                  value={profile.nbm || ''}
                  onChange={(e) => setProfile({ ...profile, nbm: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={profile.tahunAjaran}
                  onChange={(e) => setProfile({ ...profile, tahunAjaran: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Semester
                </label>
                <select
                  value={profile.semester}
                  onChange={(e) => setProfile({ ...profile, semester: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Satuan Pendidikan
                </label>
                <input
                  type="text"
                  value={profile.namaSekolah}
                  onChange={(e) => setProfile({ ...profile, namaSekolah: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan Profil
              </button>
            </div>
          </form>

          {/* Backup and Restore Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <FileJson className="w-4 h-4 text-indigo-600" />
              Cadangkan & Pulihkan Basis Data (JSON)
            </h4>
            <p className="text-xs text-slate-500">
              Unduh cadangan seluruh data lokal siswa, nilai, presensi, jurnal, dan kas kelas untuk disimpan secara offline.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                Unduh Cadangan JSON
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                Pulihkan dari File JSON
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sesi Akun Guru</span>
            <button
              type="button"
              onClick={handlePerformLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
