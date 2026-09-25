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
  ExternalLink,
  Play,
} from 'lucide-react';
import {
  signInWithEmailPassword,
  isSupabaseConfigured,
} from '../services/supabase';
import { ThemeToggle } from './ThemeToggle';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

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
    <div className="relative min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background Looping Video with Light Blue Gradient Overlay (Opacity 20% so video stays clearly visible) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Base Light Blue Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />

        {/* Clear Looping Video (Tidak tertutup, berjalan otomatis dan looping) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover pointer-events-none scale-105"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>

        {/* Warna Biru Muda Gradient dengan Opacity 20% (Tidak menutup videonya) */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-sky-300 via-sky-400 to-blue-500 mix-blend-color pointer-events-none"
          style={{ opacity: 0.2 }}
        />
        {/* Soft subtle tint so login form and text stay perfectly crisp */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none"
        />
      </div>

      {/* Top Navbar Minimal */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <img
            src={SCHOOL_CONFIG.logoUrl}
            alt="Logo SMK Muhammadiyah Bawang"
            className="w-11 h-11 object-contain drop-shadow-md rounded-xl bg-white p-1 border border-white/80 shadow-md"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
            }}
          />
          <div>
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight block leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              SMK Muhammadiyah Bawang
            </span>
            <span className="text-[10px] text-sky-200 font-mono font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Sistem Informasi Presensi & Penilaian 2026
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* TikTok Video Badge */}
          <a
            href="https://vt.tiktok.com/ZSbNppdrX/"
            target="_blank"
            rel="noreferrer"
            title="Tonton video profil Smart Classroom 4.0 SMK Muhiba di TikTok"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white text-xs font-semibold border border-white/30 backdrop-blur-md transition shadow-md"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Video Smart Classroom</span>
            <ExternalLink className="w-3 h-3 text-slate-300" />
          </a>

          <ThemeToggle />
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white text-slate-900 rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-100/90 space-y-6 backdrop-blur-sm">
          {/* Header with School Logo */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center mx-auto shadow-xs p-2">
              <img
                src={SCHOOL_CONFIG.logoUrl}
                alt="Logo SMK"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
                }}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Masuk Akun Guru
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                SMK Muhammadiyah Bawang &bull; Presensi & Penilaian
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
      <footer className="relative z-10 text-center text-xs text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] font-medium py-3">
        &copy; 2026 SMK Muhammadiyah Bawang, Batang &bull; Sistem Informasi Presensi, Penilaian & Jurnal Guru &bull; developed by @hndx07
      </footer>
    </div>
  );
};
