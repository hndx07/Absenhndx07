import React from 'react';
import { MapPin, Phone, Mail, Globe, Navigation, School, Compass, ExternalLink } from 'lucide-react';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

export const SchoolMapView: React.FC = () => {
  const mapEmbedUrl =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.825633887012!2d109.91497217594951!3d-7.146193792858168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e70395726e6ef37%3A0xe54fb72590fc3be5!2sSMK%20Muhammadiyah%20Bawang!5e0!3m2!1sid!2sid!4v1710000000000!5m2!1sid!2sid';

  const directionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=SMK+Muhammadiyah+Bawang+Batang';

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Compass className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{SCHOOL_CONFIG.namaSekolah}</h2>
              <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Kecamatan Bawang, Kabupaten Batang, Jawa Tengah</span>
              </p>
            </div>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start md:self-auto px-4 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-[#009B62]" />
            <span>Petunjuk Arah (Google Maps)</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Contact & Profile grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-[#009B62] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Alamat Lengkap</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{SCHOOL_CONFIG.alamat}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-[#292E82] shrink-0 mt-0.5">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Kontak & Telepon</h4>
              <p className="text-xs text-slate-600 mt-0.5">{SCHOOL_CONFIG.telepon}</p>
              <p className="text-xs text-slate-600">{SCHOOL_CONFIG.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-[#008276] shrink-0 mt-0.5">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Website & Portal</h4>
              <a
                href={SCHOOL_CONFIG.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#009B62] hover:underline font-semibold block mt-0.5"
              >
                {SCHOOL_CONFIG.website}
              </a>
              <span className="text-[11px] text-slate-500">Akreditasi & Lembaga Pendidikan Muhammadiyah</span>
            </div>
          </div>
        </div>

        {/* Embedded Interactive Map */}
        <div className="p-6">
          <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100">
            <iframe
              title="Peta Lokasi SMK Muhammadiyah Bawang"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
