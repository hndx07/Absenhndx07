import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Settings,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { signInWithGoogleOAuth, checkSupabaseConnection } from '../services/supabase';
import { TeacherProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (profile?: Partial<TeacherProfile>) => void;
  onOpenSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenSettings,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: 'Memeriksa status Supabase...',
  });

  useEffect(() => {
    checkSupabaseConnection().then((res) => setCloudStatus(res));
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogleOAuth();
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      // Fallback if Supabase OAuth is not configured or in sandbox: allow teacher to continue in offline/demo mode or prompt
      alert(
        `Catatan OAuth: ${err.message || 'Supabase Auth redirect'}\n\nAnda dapat masuk dalam Mode Guru SMK Muhammadiyah Bawang (Browser-First).`
      );
      onLoginSuccess();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = () => {
    onLoginSuccess({
      namaGuru: 'Hendra Setiawan, S.Kom',
      nip: '19880512 201502 1 003',
      nbm: '1182940',
      namaSekolah: 'SMK Muhammadiyah Bawang',
      mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
      isLoggedIn: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      {/* Top Navbar Minimal */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <SchoolLogo size={42} />
          <div className="hidden sm:block">
            <span className="font-bold text-white text-sm">SMK Muhammadiyah Bawang</span>
            <span className="block text-[10px] text-indigo-300">Batang, Jawa Tengah &bull; 2026</span>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-indigo-200 transition flex items-center gap-1.5 border border-white/10"
        >
          <Settings className="w-3.5 h-3.5" />
          Konfigurasi Supabase
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 rounded-3xl p-8 shadow-2xl border border-white/20 space-y-6">
          <div className="text-center space-y-3">
            <SchoolLogo size={76} className="mx-auto" />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Aplikasi Presensi & Nilai Siswa
              </h2>
              <p className="text-xs text-indigo-600 font-extrabold uppercase tracking-wider mt-1">
                SMK Muhammadiyah Bawang
              </p>
              <p className="text-[12px] text-slate-500 mt-1">
                Sistem Informasi Presensi, Penilaian & Buku Jurnal Guru
              </p>
            </div>
          </div>

          {/* Cloud Supabase Status Pill */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition ${
              cloudStatus.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            {cloudStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-bold block">
                {cloudStatus.ok ? 'Tersambung ke Cloud Supabase' : 'Arsitektur Browser-First'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {cloudStatus.message}
              </span>
            </div>
          </div>

          {/* Login Actions */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-60 group"
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
            </button>

            <button
              onClick={handleDemoLogin}
              className="w-full py-3.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Mode Guru (Browser-First)</span>
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400 space-y-1 border-t border-slate-100">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Data tersimpan di perangkat lokal & dapat disinkronkan ke Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-indigo-200/70 py-3">
        &copy; 2026 SMK Muhammadiyah Bawang, Batang &bull; Sistem Informasi Presensi, Penilaian & Jurnal Guru
      </footer>
    </div>
  );
};
