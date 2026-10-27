import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCacheAndReload = () => {
    try {
      localStorage.removeItem('smk_cached_ui_state');
      localStorage.removeItem('muhiba_teacher_profile');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  Aplikasi Mengalami Kendala
                </h2>
                <p className="text-xs text-slate-400">
                  {SCHOOL_CONFIG.namaSekolah} &bull; Sistem Presensi & Nilai
                </p>
              </div>
            </div>

            {import.meta.env.DEV ? (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-rose-300 break-words max-h-36 overflow-y-auto">
                {this.state.error?.message || 'Terjadi kesalahan tidak terduga saat memuat halaman.'}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-350 leading-relaxed">
                Mohon maaf, terjadi kendala saat memuat data antarmuka. Silakan coba muat ulang halaman atau hubungi pengampu mata pelajaran.
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Cache Sesi & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
