import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import {
  signInWithEmailPassword,
  isSupabaseConfigured,
} from '../services/supabase';
import { ThemeToggle } from './ThemeToggle';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const STORAGE_SAVED_EMAIL = 'smk_saved_login_email';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_SAVED_EMAIL) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
        'Supabase belum dikonfigurasi di Environment Variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).'
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
      const res = await signInWithEmailPassword(cleanEmail, password);
      if (res.session) {
        onLoginSuccess();
      } else {
        setErrorMessage('Sesi login tidak ditemukan. Silakan coba kembali.');
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      const rawMsg = err?.message || 'Gagal masuk ke sistem Supabase.';
      if (rawMsg.includes('Invalid login credentials')) {
        setErrorMessage('Alamat email atau kata sandi salah. Silakan periksa kembali.');
      } else if (rawMsg.includes('Email not confirmed')) {
        setErrorMessage('Email Anda belum dikonfirmasi di Supabase. Silakan periksa email.');
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
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-200 shadow-xs">
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
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
                Masuk Akun Guru
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Silakan masukkan kredensial akun guru Anda
              </p>
            </div>
          </div>

          {/* Alert Error Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form Login Email & Password */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Masukkan kata sandi"
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

            {/* Remember Email */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ingat Email Saya</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-bold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Memproses Masuk...</span>
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
        &copy; 2026 SMK Muhammadiyah Bawang, Batang &bull; Sistem Informasi Presensi, Penilaian & Jurnal Guru &bull; developed by @hndx07
      </footer>
    </div>
  );
};
