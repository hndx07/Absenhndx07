import React from 'react';
import { MapPin, Phone, Mail, Globe, Navigation, GraduationCap } from 'lucide-react';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

export const SchoolMapView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              Profil & Lokasi Kampus
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">SMK Muhammadiyah Bawang</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Lokasi Kampus SMK Muhammadiyah Bawang
          </h2>
          <p className="text-xs text-slate-500">
            Pusat Pendidikan Kejuruan Vokasi Unggulan berbasis Karakter Islami di Kecamatan Bawang, Kabupaten Batang
          </p>
        </div>

        <a
          href="https://maps.google.com/?q=SMK+Muhammadiyah+Bawang+Batang"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Navigation className="w-4 h-4" />
          Buka Petunjuk Arah di Google Maps
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-slate-800">
                Peta Satelit & Jalan SMK Muhammadiyah Bawang
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Koordinat: -7.0988, 109.9160
            </span>
          </div>

          <div className="w-full h-96 relative bg-slate-100">
            <iframe
              title="Peta Lokasi SMK Muhammadiyah Bawang"
              src="https://maps.google.com/maps?q=SMK%20Muhammadiyah%20Bawang%20Jl.%20Bawang-Sukorejo%20KM%2001%20Jlamprang%20Bawang%20Batang%2051274&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>

        {/* School Profile Sidebar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center mx-auto mb-2 shadow-xs p-1.5">
              <img
                src={SCHOOL_CONFIG.logoUrl}
                alt="Logo SMK Muhammadiyah Bawang"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
                }}
              />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mt-2">
              SMK Muhammadiyah Bawang
            </h3>
            <p className="text-xs text-indigo-600 font-semibold">
              Kec. Bawang, Kab. Batang, Jawa Tengah
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Jl. Bawang-Sukorejo KM 01, Jlamprang, Bawang, 51274, Kabupaten Batang, Jawa Tengah
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-mono text-slate-700 dark:text-slate-300">(0285) 4486909</span>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
              <a
                href="mailto:smkmutu1@yahoo.co.id"
                className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-mono"
              >
                smkmutu1@yahoo.co.id
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
              <a
                href="https://smkmuhiba.sch.id"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline font-semibold"
              >
                smkmuhiba.sch.id
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Konsentrasi Keahlian / Jurusan:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 text-xs text-slate-600">
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TO (Teknik Otomotif)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TJKT (Teknik Jaringan Komputer & Telekomunikasi)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>Akl/perbankan syari'ah</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TKR (Teknik Kendaraan Ringan)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TSM (Teknik Sepeda Motor)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TKJ (Teknik Komputer & Jaringan)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span>TJAT (Teknik Jaringan Akses Telekomunikasi)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
