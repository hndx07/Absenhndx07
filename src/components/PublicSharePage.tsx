import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Calendar,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  School,
  Share2,
  BookMarked,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { getSafeSupabaseClient } from '../services/supabase';
import { getPublicShare } from '../services/data';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { ThemeToggle } from './ThemeToggle';

interface PublicSharePageProps {
  type: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  shareId: string;
}

function formatIndonesianDate(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatIndonesianDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const dStr = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dStr}, ${tStr} WIB`;
}

export const PublicSharePage: React.FC<PublicSharePageProps> = ({
  type,
  shareId,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const sharePayload = await getPublicShare(shareId);
      if (sharePayload) {
        setData(sharePayload);
      }
    } catch (err) {
      console.warn('Could not load public share from supabase', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime subscription
    const supabase = getSafeSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel(`public_share_${shareId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'public_shares', filter: `id=eq.${shareId}` },
          (payload) => {
            if (payload.new && (payload.new as any).payload) {
              setData({
                ...(payload.new as any).payload,
                created_at: (payload.new as any).created_at,
                updated_at: (payload.new as any).updated_at,
              });
              setLastRefreshed(new Date());
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [shareId]);

  // Handle share copy
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Timestamp formatting
  const effectiveTimestamp = data?.updated_at || data?.created_at;
  const formattedUpdateDate = effectiveTimestamp
    ? formatIndonesianDateTime(effectiveTimestamp)
    : `${lastRefreshed.toLocaleTimeString('id-ID')} WIB`;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Menghubungkan ke Portal Sekolah...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Memuat data transparansi resmi SMK Muhammadiyah Bawang
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      {/* Official School Header */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md sticky top-0 z-30 border-b border-indigo-900/40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="font-black text-sm sm:text-base leading-tight tracking-tight uppercase truncate">
                {SCHOOL_CONFIG.namaSekolah}
              </h1>
              <p className="text-[11px] text-indigo-200/80 truncate">
                Portal Informasi & Transparansi Akademik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Salin Tautan Publik"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Bagikan'}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 transition cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader: Address & Official URL */}
        <div className="bg-slate-950/60 border-t border-white/5 py-1.5 px-4 text-[11px] text-slate-400">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{SCHOOL_CONFIG.alamat}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <a
                href={SCHOOL_CONFIG.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-300 hover:underline"
              >
                {SCHOOL_CONFIG.website}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card with Real Timestamp */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900">
                {type === 'absen'
                  ? 'Rekap Presensi Siswa'
                  : type === 'nilai'
                  ? 'Rekap Asesmen / Nilai'
                  : type === 'agenda'
                  ? 'Agenda Mengajar Guru'
                  : 'Laporan Tabungan & Kas'}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {data?.subject ? `Mata Pelajaran: ${data.subject}` : 'Kurikulum Merdeka'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Kelas: {data?.className || 'Semua Kelas'}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Guru Pengampu:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {data?.teacher || data?.teacherName || 'Guru Pengampu SMK Muhiba'}
              </strong>
            </p>
          </div>

          {/* Timestamp Badge (Requirement: Indonesian format & database timestamp) */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pembaruan Terakhir:</span>
            </div>
            <p className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              {formattedUpdateDate}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
              <ShieldCheck className="w-3 h-3" />
              Data Resmi Terverifikasi Cloud
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {(type === 'absen' || type === 'nilai' || type === 'tabungan') && (
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa atau NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        )}

        {/* 1. TYPE ABSENSI */}
        {type === 'absen' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Daftar Presensi & Kehadiran Siswa
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl">
                {data?.sessions?.length || 0} Pertemuan Terlaksana
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[190px]">Nama Peserta Didik</th>
                    <th className="py-3 px-3 text-center w-14">Hadir</th>
                    <th className="py-3 px-3 text-center w-14">Sakit</th>
                    <th className="py-3 px-3 text-center w-14">Izin</th>
                    <th className="py-3 px-3 text-center w-14">Alpa</th>
                    <th className="py-3 px-3 text-center w-14">Dispen</th>
                    <th className="py-3 px-4 text-center w-28">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.students || [])
                    .filter((s: any) => (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((std: any, idx: number) => {
                      let h = 0, s = 0, i = 0, a = 0, d = 0;
                      (data.sessions || []).forEach((sess: any) => {
                        const rec = sess.records?.[std.id];
                        if (rec?.status === 'H') h++;
                        else if (rec?.status === 'S') s++;
                        else if (rec?.status === 'I') i++;
                        else if (rec?.status === 'A') a++;
                        else if (rec?.status === 'D') d++;
                      });

                      const total = data.sessions?.length || 1;
                      const pct = Math.round(((h + d) / total) * 100);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {std.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              NISN: {std.nisn || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {h}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {s}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">
                            {i}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-rose-600 dark:text-rose-400">
                            {a}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-purple-600 dark:text-purple-400">
                            {d}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                                pct >= 80
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TYPE NILAI */}
        {type === 'nilai' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Rekap Capaian Asesmen (KKM: {data?.kkm || 75})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[190px]">Nama Peserta Didik</th>
                    <th className="py-3 px-3 text-center w-20">Rata Formatif</th>
                    <th className="py-3 px-3 text-center w-16">STS</th>
                    <th className="py-3 px-3 text-center w-16">SAS</th>
                    <th className="py-3 px-4 text-center w-24 bg-slate-900 text-white">Nilai Akhir</th>
                    <th className="py-3 px-3 text-center w-16">Predikat</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.students || [])
                    .filter((s: any) => (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((std: any, idx: number) => {
                      const g = (data.grades || []).find((item: any) => item.studentId === std.id);
                      const fVals = [
                        g?.formatif1,
                        g?.formatif2,
                        g?.formatif3,
                        g?.formatif4,
                        g?.formatif5,
                        g?.formatif6,
                        g?.formatif7,
                        g?.formatif8,
                        g?.formatif9,
                        g?.formatif10,
                      ].filter((v): v is number => typeof v === 'number');

                      const avgF = fVals.length > 0 ? Math.round(fVals.reduce((a, b) => a + b, 0) / fVals.length) : 0;
                      const sts = g?.sumatifTengah ?? 0;
                      const sas = g?.sumatifAkhir ?? 0;
                      const finalScore = sts && sas ? Math.round(avgF * 0.5 + sts * 0.25 + sas * 0.25) : avgF || 0;

                      let predikat = 'D';
                      if (finalScore >= 90) predikat = 'A';
                      else if (finalScore >= 80) predikat = 'B';
                      else if (finalScore >= (data?.kkm || 75)) predikat = 'C';

                      const isTuntas = finalScore >= (data?.kkm || 75);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {std.nama}
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              NISN: {std.nisn || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {avgF || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                            {sts || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                            {sas || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-sm bg-slate-900 dark:bg-slate-950 text-white">
                            {finalScore}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs">
                              {predikat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                isTuntas
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isTuntas ? 'Tuntas' : 'Belum Tuntas'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TYPE TABUNGAN & KAS */}
        {type === 'tabungan' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-800/50">
              <div>
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                  Total Saldo Kas Kelas Terkumpul
                </span>
                <p className="text-3xl font-black font-mono mt-1">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data?.classCashBalance || 0)}
                </p>
              </div>
              <div className="text-xs text-indigo-200 space-y-1">
                <p>Pemasukan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data?.totalCashIn || 0)}</p>
                <p>Pengeluaran: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data?.totalCashOut || 0)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                  Saldo Tabungan Mandiri Siswa
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-4 min-w-[200px]">Nama Siswa</th>
                      <th className="py-3 px-4 text-right min-w-[150px]">Saldo Tabungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.students || [])
                      .filter((s: any) => (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((std: any, idx: number) => (
                        <tr key={std.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {std.nama}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(std.saldo || 0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. TYPE AGENDA */}
        {type === 'agenda' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Rekam Jejak Agenda Mengajar Guru
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {(data?.agendas || []).length} Agenda Tercatat
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3 w-28">Tanggal</th>
                    <th className="py-3 px-3 text-center w-24">Jam</th>
                    <th className="py-3 px-4 min-w-[250px]">Materi Pokok & Kegiatan</th>
                    <th className="py-3 px-3 text-center w-20">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.agendas || []).map((ag: any, idx: number) => (
                    <tr key={ag.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {ag.tanggal}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ag.hari}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        Ke-{ag.jamKe}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {ag.materiAjar}
                        </p>
                        {ag.kegiatan && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {ag.kegiatan}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {ag.hadirCount ?? 0} Hadir
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Official Footer */}
      <footer className="text-center text-xs text-slate-500 dark:text-slate-400 py-8 mt-8 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {SCHOOL_CONFIG.namaSekolah} &bull; Batang, Jawa Tengah
          </p>
          <p className="text-[11px] text-slate-400">
            {SCHOOL_CONFIG.alamat} &bull; Website:{' '}
            <a href={SCHOOL_CONFIG.websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {SCHOOL_CONFIG.website}
            </a>
          </p>
          <p className="text-[10px] text-slate-400 pt-2">
            &copy; 2026 SMK Muhammadiyah Bawang &bull; Sistem Informasi Presensi, Penilaian & Jurnal Guru &bull; developed by @hndx07
          </p>
        </div>
      </footer>
    </div>
  );
};
