import React, { useEffect, useState } from 'react';
import {
  School,
  CheckCircle2,
  Calendar,
  Search,
  RefreshCw,
  Award,
  Wallet,
  BookOpen,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { getStoredPublicShares } from '../utils/storage';
import { getSupabaseClient } from '../services/supabase';
import { PublicShareRecord } from '../types';

interface PublicSharePageProps {
  type: 'absen' | 'nilai' | 'tabungan';
  shareId: string;
  onBackToApp?: () => void;
}

export const PublicSharePage: React.FC<PublicSharePageProps> = ({
  type,
  shareId,
  onBackToApp,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    // 1. Try local storage first
    const stored = getStoredPublicShares();
    if (stored[shareId]) {
      setData(stored[shareId].data);
    }

    // 2. Try Supabase cloud fetch
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: cloudData, error } = await supabase
          .from('public_shares')
          .select('*')
          .eq('id', shareId)
          .single();

        if (!error && cloudData?.payload) {
          setData(cloudData.payload);
        }
      } catch (err) {
        console.warn('Could not load from supabase', err);
      }
    }

    setLoading(false);
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime subscription if available
    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel(`public_share_${shareId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'public_shares', filter: `id=eq.${shareId}` },
          (payload) => {
            if (payload.new && (payload.new as any).payload) {
              setData((payload.new as any).payload);
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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Memuat data publik sekolah...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Public Header */}
      <header className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size={42} />
            <div>
              <h1 className="font-extrabold text-sm sm:text-base leading-tight">
                SMK Muhammadiyah Bawang
              </h1>
              <p className="text-[11px] text-indigo-200">
                Portal Transparansi Informasi Wali Murid & Siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 transition"
              title="Perbarui Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Masuk Guru
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold font-mono uppercase">
              {type === 'absen' ? 'Rekap Presensi Siswa' : type === 'nilai' ? 'Rekap Penilaian Siswa' : 'Laporan Keuangan & Tabungan'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Kelas: {data?.className || 'X TKJ 1'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {data?.subject && `Mata Pelajaran: ${data.subject} • `}
              Guru Pengampu: {data?.teacher || 'Guru SMK Muhammadiyah Bawang'}
            </p>
          </div>

          <div className="text-right text-xs text-slate-400">
            <p>Pembaruan Terakhir:</p>
            <p className="font-mono font-bold text-slate-700">{lastRefreshed.toLocaleTimeString('id-ID')} WIB</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* TYPE 1: ABSENSI */}
        {type === 'absen' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Daftar Kehadiran Siswa
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {data?.sessions?.length || 0} Pertemuan Terlaksana
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Peserta Didik</th>
                    <th className="py-3 px-3 text-center w-16">Hadir</th>
                    <th className="py-3 px-3 text-center w-16">Sakit</th>
                    <th className="py-3 px-3 text-center w-16">Izin</th>
                    <th className="py-3 px-3 text-center w-16">Alfa</th>
                    <th className="py-3 px-4 text-center w-28">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.students
                    ?.filter((s: any) => s.nama.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((std: any, idx: number) => {
                      let h = 0, s = 0, i = 0, a = 0;
                      (data.sessions || []).forEach((sess: any) => {
                        const rec = sess.records?.[std.id];
                        if (rec?.status === 'H') h++;
                        else if (rec?.status === 'S') s++;
                        else if (rec?.status === 'I') i++;
                        else if (rec?.status === 'A') a++;
                      });

                      const total = data.sessions?.length || 1;
                      const pct = Math.round((h / total) * 100);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {std.nama}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              NISN: {std.nisn || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                            {h}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-blue-600">
                            {s}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-amber-600">
                            {i}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-rose-600">
                            {a}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                                pct >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
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

        {/* TYPE 2: NILAI */}
        {type === 'nilai' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Rekap Capaian Asesmen (KKM: {data?.kkm || 75})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Peserta Didik</th>
                    <th className="py-3 px-3 text-center w-20">Rata Formatif</th>
                    <th className="py-3 px-3 text-center w-16">STS</th>
                    <th className="py-3 px-3 text-center w-16">SAS</th>
                    <th className="py-3 px-4 text-center w-24 bg-slate-900 text-white">Nilai Akhir</th>
                    <th className="py-3 px-3 text-center w-16">Predikat</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.students
                    ?.filter((s: any) => s.nama.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((std: any, idx: number) => {
                      const g = data.grades?.find((item: any) => item.studentId === std.id);
                      const fVals = [
                        g?.formatif1,
                        g?.formatif2,
                        g?.formatif3,
                        g?.formatif4,
                        g?.formatif5,
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
                        <tr key={std.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {std.nama}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                            {avgF || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700">
                            {sts || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700">
                            {sas || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-sm bg-slate-900 text-white">
                            {finalScore}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono">
                              {predikat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                isTuntas
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
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

        {/* TYPE 3: TABUNGAN */}
        {type === 'tabungan' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider">
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

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Saldo Tabungan Mandiri Siswa
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-12">No</th>
                      <th className="py-3 px-4 min-w-[200px]">Nama Siswa</th>
                      <th className="py-3 px-4 text-right min-w-[150px]">Saldo Tabungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data?.students
                      ?.filter((s: any) => s.nama.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((std: any, idx: number) => (
                        <tr key={std.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {std.nama}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-700">
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
      </main>
    </div>
  );
};
