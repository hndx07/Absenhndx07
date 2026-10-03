import React from 'react';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

interface OfficialLetterheadProps {
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({ className = '' }) => {
  return (
    <div className={`official-kop-surat pb-1 mb-4 select-none ${className}`}>
      <div className="flex items-center justify-between gap-3 sm:gap-4 pb-2">
        {/* Logo Resmi SMK Muhammadiyah Bawang */}
        <div className="w-20 sm:w-24 shrink-0 flex items-center justify-center">
          <img
            src={SCHOOL_CONFIG.logoUrl}
            alt="Logo SMK Muhammadiyah Bawang"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain print:w-20 print:h-20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
            }}
          />
        </div>

        {/* Identitas Dinas / Instansi Kop Surat */}
        <div className="flex-1 text-center font-serif text-slate-900 print:text-black">
          <h3 className="font-bold text-xs sm:text-sm tracking-wide uppercase leading-tight">
            {SCHOOL_CONFIG.majlis}
          </h3>
          <h4 className="font-bold text-xs sm:text-sm tracking-wide uppercase leading-tight mt-0.5">
            {SCHOOL_CONFIG.daerah}
          </h4>
          <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-wide uppercase my-1 leading-tight text-slate-950 print:text-black">
            {SCHOOL_CONFIG.namaSekolah}
          </h1>
          <p className="font-black text-[11px] sm:text-xs tracking-[0.25em] sm:tracking-[0.3em] uppercase leading-tight my-1 text-slate-900 print:text-black">
            T E R A K R E D I T A S I &ldquo;A&rdquo;
          </p>
          <p className="text-[10px] sm:text-[11px] leading-tight text-slate-800 print:text-black">
            {SCHOOL_CONFIG.alamat}
          </p>
          <p className="text-[10px] sm:text-[11px] leading-tight text-slate-800 print:text-black mt-0.5">
            Email : <span className="underline text-blue-800 print:text-black">{SCHOOL_CONFIG.email}</span> &bull; Website : <span className="underline text-blue-800 print:text-black">{SCHOOL_CONFIG.website}</span>
          </p>
          <p className="text-[10px] sm:text-[11px] leading-tight text-slate-800 print:text-black mt-0.5">
            Kode Pos. {SCHOOL_CONFIG.kodePos} Telp. {SCHOOL_CONFIG.telepon} Fax. {SCHOOL_CONFIG.fax}
          </p>
        </div>

        {/* Spacer Penyeimbang Agar Judul Tepat Berada di Tengah Halaman */}
        <div className="w-20 sm:w-24 shrink-0 hidden sm:block print:block"></div>
      </div>

      {/* Garis Ganda Kop Surat Resmi: Garis Tebal Atas (3px) + Garis Tipis Bawah (1px) */}
      <div className="border-b-[3px] border-black"></div>
      <div className="border-b border-black mt-[2px]"></div>
    </div>
  );
};
