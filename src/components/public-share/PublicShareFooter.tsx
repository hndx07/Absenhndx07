import React from 'react';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';

export const PublicShareFooter: React.FC = () => {
  return (
    <footer className="text-center py-8 mt-10 border-t border-[#008276] bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 space-y-2">
        <p className="font-black text-sm text-white uppercase tracking-wider">
          &copy; {SCHOOL_CONFIG.namaSekolah} &bull; BATANG, JAWA TENGAH
        </p>
        <p className="text-xs font-semibold text-white">
          {SCHOOL_CONFIG.alamat} &bull; Portal Resmi:{' '}
          <a
            href={SCHOOL_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline decoration-white font-bold hover:text-white hover:decoration-white transition"
          >
            {SCHOOL_CONFIG.website}
          </a>
        </p>
        <p className="text-xs font-extrabold text-white pt-1">
          Sistem Informasi Presensi, Penilaian & Jurnal Pendidik &bull; Dikembangkan oleh{' '}
          <span className="font-mono bg-white text-slate-900 px-2 py-0.5 rounded-md border border-white font-bold">
            @hndx07
          </span>
        </p>
      </div>
    </footer>
  );
};
