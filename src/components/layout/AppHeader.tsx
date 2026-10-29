import React from 'react';
import { Menu, GraduationCap, ChevronDown } from 'lucide-react';
import { ClassRoom } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';

interface AppHeaderProps {
  activeClass: ClassRoom;
  onToggleSideNav: () => void;
  onOpenClassModal: () => void;
  isDemoMode?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeClass,
  onToggleSideNav,
  onOpenClassModal,
  isDemoMode,
}) => {
  return (
    <header className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white border-b border-[#008276]/40 sticky top-0 z-40 shadow-lg backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Hamburger (Menu Samping) & Logo Sekolah */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleSideNav}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition border border-white/20 shadow-xs flex items-center justify-center shrink-0 cursor-pointer lg:hidden"
              title="Buka Menu Navigasi Samping"
              aria-label="Buka Menu Navigasi Samping"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src={SCHOOL_CONFIG.logoUrl}
                alt="Logo SMK Muhammadiyah Bawang"
                className="w-10 h-10 object-contain drop-shadow-sm rounded-xl p-0.5 bg-white border border-white/30 shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
                }}
              />
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white tracking-tight text-sm sm:text-base drop-shadow-xs">
                    SMK Muhammadiyah Bawang
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold border border-white/25">
                    Kurikulum Merdeka
                  </span>
                </div>
                <span className="text-xs text-emerald-100 font-medium">
                  Sistem Presensi, Penilaian & Jurnal Pendidik
                </span>
              </div>
            </div>
          </div>

          {/* Pilihan Kelas */}
          <div className="flex items-center justify-center flex-1 max-w-md mx-2">
            <button
              type="button"
              onClick={onOpenClassModal}
              className="flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition shadow-xs border border-white/25 backdrop-blur-xs cursor-pointer"
              title="Pilih atau kelola kelas"
            >
              <GraduationCap className="w-4 h-4 text-emerald-100 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-none">
                Kelas: {activeClass.namaKelas}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-100" />
            </button>
          </div>

          {/* Penanda Status Supabase / Demo */}
          <div className="flex items-center gap-2 shrink-0">
            {isDemoMode ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-100 text-xs font-bold shadow-2xs backdrop-blur-xs"
                title="Mode Demo (Uji Coba Sistem) - Berjalan dalam isolasi sesi lokal"
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <span className="hidden sm:inline">Mode Demo (Uji Coba)</span>
                <span className="sm:hidden text-[11px]">Demo</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold shadow-2xs backdrop-blur-xs"
                title="Database PostgreSQL Supabase Cloud Aktif & Sinkron (RLS)"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="hidden sm:inline">Cloud Supabase Aktif</span>
                <span className="sm:hidden text-[11px]">Cloud Aktif</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
