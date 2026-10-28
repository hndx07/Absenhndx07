import React from 'react';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';

export const AppFooter: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] border-t border-[#008276] mt-12 py-8 text-center text-white shadow-lg transition-colors">
      <div className="max-w-7xl mx-auto px-4 space-y-2">
        <p className="font-black text-sm sm:text-base text-white tracking-wide uppercase drop-shadow-xs">
          &copy; {SCHOOL_CONFIG.namaSekolah} &bull; BATANG, JAWA TENGAH
        </p>
        <p className="text-xs sm:text-sm font-semibold text-white">
          {SCHOOL_CONFIG.alamat} &bull; Portal Tautan Resmi:{' '}
          <a
            href={SCHOOL_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline decoration-white font-bold hover:text-white hover:decoration-white transition"
          >
            {SCHOOL_CONFIG.website}
          </a>
        </p>
        <p className="text-xs sm:text-sm font-bold text-white">
          Sistem Informasi Presensi, Penilaian & Jurnal Pendidik &bull; Dikembangkan oleh{' '}
          <span className="font-mono font-black text-emerald-950 bg-white px-2 py-0.5 rounded-md border border-white">
            @hndx07
          </span>
        </p>
        <p className="text-xs font-semibold text-white pt-0.5">
          Backend Resmi 100% PostgreSQL & Auth Supabase Cloud (Row Level Security Aktif)
        </p>
      </div>
    </footer>
  );
};
