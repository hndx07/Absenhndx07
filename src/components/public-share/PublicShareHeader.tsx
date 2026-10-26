import React from 'react';
import { ShieldCheck, Share2, RefreshCw, MapPin, Globe } from 'lucide-react';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';

interface PublicShareHeaderProps {
  copied: boolean;
  onCopyLink: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const PublicShareHeader: React.FC<PublicShareHeaderProps> = ({
  copied,
  onCopyLink,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <header className="relative z-20 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white shadow-lg sticky top-0 border-b border-[#008276]/40">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 truncate">
          <img
            src={SCHOOL_CONFIG.logoUrl}
            alt="Logo SMK Muhammadiyah Bawang"
            className="w-10 h-10 object-contain drop-shadow-md rounded-xl p-0.5 bg-white border border-white/30 shrink-0 shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
            }}
          />
          <div className="truncate">
            <h1 className="font-black text-sm sm:text-base leading-tight tracking-tight uppercase truncate">
              {SCHOOL_CONFIG.namaSekolah}
            </h1>
            <p className="text-[11px] text-emerald-100 truncate">
              Portal Informasi & Transparansi Akademik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-white text-[11px] font-bold shadow-2xs backdrop-blur-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span>Akses Publik Resmi</span>
          </div>
          <button
            type="button"
            onClick={onCopyLink}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-semibold flex items-center gap-1 cursor-pointer border border-white/15 shadow-xs"
            title="Salin Tautan Publik"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Bagikan'}</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15 shadow-xs"
            title="Segarkan Data Real-Time"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subheader: Address & Official URL */}
      <div className="bg-[#1c2363]/80 border-t border-white/10 py-1.5 px-4 text-[11px] text-emerald-100">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="truncate">{SCHOOL_CONFIG.alamat}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <a
              href={SCHOOL_CONFIG.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-200 hover:text-white hover:underline"
            >
              {SCHOOL_CONFIG.website}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
