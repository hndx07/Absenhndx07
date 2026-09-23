import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  GraduationCap,
  KeyRound,
} from 'lucide-react';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  isSupabaseConfigured,
} from '../services/supabase';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onOpenSettings?: () => void;
}

const STORAGE_SAVED_EMAIL = 'smk_saved_login_email';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenSettings }) => {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_SAVED_EMAIL) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Silakan masukkan alamat email yang valid.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'Supabase belum dikonfigurasi di Environment Variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY). Silakan hubungkan project Supabase Anda.'
      );
      return;
    }

    if (rememberMe) {
      try {
        localStorage.setItem(STORAGE_SAVED_EMAIL, cleanEmail);
      } catch {}
    } else {
      try {
        localStorage.removeItem(STORAGE_SAVED_EMAIL);
      } catch {}
    }

    setIsSubmitting(true);

    try {
      if (isSignUpMode) {
        const res = await signUpWithEmailPassword(cleanEmail, password, {
          nama_guru: namaLengkap.trim() || undefined,
        });

        if (res.user) {
          if (res.session) {
            setSuccessMessage('Akun guru berhasil dibuat! Masuk ke sistem...');
            setTimeout(() => {
              onLoginSuccess();
            }, 600);
          } else {
            setSuccessMessage(
              'Pendaftaran berhasil! Jika konfirmasi email aktif di Supabase, silakan periksa kotak masuk email Anda lalu masuk.'
            );
            setIsSignUpMode(false);
          }
        }
      } else {
        const res = await signInWithEmailPassword(cleanEmail, password);
        if (res.session) {
          onLoginSuccess();
        } else {
          setErrorMessage('Session tidak ditemukan. Silakan coba masuk kembali.');
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      const rawMsg = err?.message || 'Gagal masuk ke sistem Supabase.';
      if (rawMsg.includes('Invalid login credentials')) {
        setErrorMessage('Alamat email atau kata sandi tidak cocok. Silakan periksa kembali.');
      } else if (rawMsg.includes('Email not confirmed')) {
        setErrorMessage('Email Anda belum dikonfirmasi di Supabase. Silakan cek inbox/spam.');
      } else if (rawMsg.includes('User already registered')) {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih mode Masuk Akun Guru.');
      } else {
        setErrorMessage(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar Minimal */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-tight block leading-tight">
              SMK Muhammadiyah Bawang
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">
              Sistem Informasi Presensi & Penilaian 2026
            </span>
          </div>
        </div>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-indigo-200 transition flex items-center gap-1.5 border border-white/10"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Info Setup Supabase
          </button>
        )}
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white text-slate-900 rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isSignUpMode ? 'Daftar Akun Guru' : 'Masuk Akun Guru'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Autentikasi resmi berbasis Cloud Supabase (PostgreSQL & Auth)
              </p>
            </div>
          </div>

          {/* Cloud Supabase Status Pill */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition ${
              isConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-bold block">
                {isConfigured
                  ? 'Supabase Backend Terhubung'
                  : 'Konfigurasi Environment Diperlukan'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {isConfigured
                  ? 'Kredensial VITE_SUPABASE_URL & ANON KEY aktif'
                  : 'Atur VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env'}
              </span>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Form Login Email & Password Manual */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUpMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Nama Lengkap Guru & Gelar
                </label>
                <input
                  type="text"
                  required={isSignUpMode}
                  placeholder="Contoh: Hendra Setiawan, S.Kom"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Alamat Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="nama@guru.smkmuhbawang.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Kata Sandi *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi (min. 6 karakter)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Toggle Mode */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ingat Email</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold transition"
              >
                {isSignUpMode ? 'Sudah punya akun? Masuk' : 'Daftar akun baru'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isConfigured}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-bold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Memproses ke Supabase...</span>
              ) : isSignUpMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Daftar Akun Guru</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Keamanan dilindungi Row Level Security (RLS) PostgreSQL Supabase
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
