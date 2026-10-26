import React, { useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  BarChart3,
  Users,
  UserCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
} from 'lucide-react';

interface PublicShareAttendanceViewProps {
  data: any;
  sortedStudents: any[];
  formatIndonesianDate: (iso?: string) => string;
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'no' | 'name-asc' | 'name-desc'>>;
  isDocumentViewMode: boolean;
  absenViewMode: 'latest' | 'recap';
  setAbsenViewMode: (mode: 'latest' | 'recap') => void;
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
}

export const PublicShareAttendanceView: React.FC<PublicShareAttendanceViewProps> = ({
  data,
  sortedStudents,
  formatIndonesianDate,
  sortOrder,
  setSortOrder,
  isDocumentViewMode,
  absenViewMode,
  setAbsenViewMode,
  selectedSessionId,
  setSelectedSessionId,
}) => {
  const sortedSessions = useMemo(() => {
    if (!data?.sessions || !Array.isArray(data.sessions)) return [];
    return [...data.sessions].sort((a: any, b: any) => {
      const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
      const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.pertemuanKe || 0) - (a.pertemuanKe || 0);
    });
  }, [data?.sessions]);

  const latestSession = sortedSessions[0] || null;

  const currentSession = useMemo(() => {
    if (selectedSessionId) {
      return sortedSessions.find((s: any) => s.id === selectedSessionId) || latestSession;
    }
    return latestSession;
  }, [sortedSessions, selectedSessionId, latestSession]);

  const currentSessionStats = useMemo(() => {
    if (!currentSession || !data?.students) {
      return { h: 0, s: 0, i: 0, a: 0, d: 0, total: 0, rate: 0 };
    }
    let h = 0, s = 0, i = 0, a = 0, d = 0;
    const total = data.students.length || 1;
    data.students.forEach((std: any) => {
      const rec = currentSession.records?.[std.id];
      const st = rec?.status;
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
      else if (st === 'D') d++;
    });
    const rate = Math.round(((h + d) / total) * 100);
    return { h, s, i, a, d, total: data.students.length, rate };
  }, [currentSession, data?.students]);

  const cumulativeStats = useMemo(() => {
    if (!data?.sessions || !data?.students || data.sessions.length === 0) {
      return { avgRate: 0, totalMeetings: 0, perfectAttendanceCount: 0 };
    }
    let totalHAndD = 0;
    const totalPossible = data.sessions.length * data.students.length || 1;
    let perfectCount = 0;

    data.students.forEach((std: any) => {
      let stdHAndD = 0;
      data.sessions.forEach((sess: any) => {
        const st = sess.records?.[std.id]?.status;
        if (st === 'H' || st === 'D') {
          stdHAndD++;
          totalHAndD++;
        }
      });
      if (stdHAndD === data.sessions.length) {
        perfectCount++;
      }
    });

    const avgRate = Math.round((totalHAndD / totalPossible) * 100);
    return {
      avgRate,
      totalMeetings: data.sessions.length,
      perfectAttendanceCount: perfectCount,
    };
  }, [data?.sessions, data?.students]);

  // If in Document A4 mode
  if (isDocumentViewMode) {
    return (
      <>
        {absenViewMode === 'latest' && currentSession && (
          <div className="mb-4">
            <table className="w-full border-collapse border border-black text-center text-[11px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-2 w-8">No</th>
                  <th className="border border-black p-2 w-28 text-center">NISN</th>
                  <th className="border border-black p-2 text-left">Nama Lengkap Peserta Didik</th>
                  <th className="border border-black p-2 w-12 text-center">L/P</th>
                  <th className="border border-black p-2 w-28 text-center">Status Kehadiran</th>
                  <th className="border border-black p-2 text-left">Catatan / Keterangan</th>
                  <th className="border border-black p-2 w-16 text-center">Paraf</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((std: any, idx: number) => {
                  const rec = currentSession.records?.[std.id];
                  const st = rec?.status || 'H';
                  const labelStatus =
                    st === 'H'
                      ? 'Hadir (H)'
                      : st === 'S'
                      ? 'Sakit (S)'
                      : st === 'I'
                      ? 'Izin (I)'
                      : st === 'A'
                      ? 'Alpa (A)'
                      : 'Dispen (D)';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-mono">{std.nisn || '-'}</td>
                      <td className="border border-black p-1.5 text-left font-medium">{std.nama}</td>
                      <td className="border border-black p-1.5 font-mono">{std.gender || '-'}</td>
                      <td className="border border-black p-1.5 font-bold">{labelStatus}</td>
                      <td className="border border-black p-1.5 text-left text-[10px]">{rec?.catatan || '-'}</td>
                      <td className="border border-black p-1.5 text-center text-[10px] font-mono">&#10003;</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 print:bg-slate-100 font-bold text-[10px]">
                  <td className="border border-black p-2 text-center" colSpan={4}>
                    REKAPITULASI SESI PERTEMUAN INI: Total {currentSessionStats.total} Murid
                  </td>
                  <td className="border border-black p-2 text-center" colSpan={3}>
                    Hadir: {currentSessionStats.h} &bull; Sakit: {currentSessionStats.s} &bull; Izin: {currentSessionStats.i} &bull; Alpa: {currentSessionStats.a} &bull; Dispen: {currentSessionStats.d} &bull; Tingkat Kehadiran: {currentSessionStats.rate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {absenViewMode === 'recap' && (
          <div className="mb-4">
            <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-1.5 w-7">No</th>
                  <th className="border border-black p-1.5 w-24">NISN</th>
                  <th className="border border-black p-1.5 text-left">Nama Peserta Didik</th>
                  <th className="border border-black p-1.5 w-10">L/P</th>
                  <th className="border border-black p-1.5 w-10">H</th>
                  <th className="border border-black p-1.5 w-10">S</th>
                  <th className="border border-black p-1.5 w-10">I</th>
                  <th className="border border-black p-1.5 w-10">A</th>
                  <th className="border border-black p-1.5 w-10">D</th>
                  <th className="border border-black p-1.5 w-14">Total</th>
                  <th className="border border-black p-1.5 w-14">% Hadir</th>
                  <th className="border border-black p-1.5 w-24">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((std: any, idx: number) => {
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
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-mono">{std.nisn || '-'}</td>
                      <td className="border border-black p-1.5 text-left font-medium">{std.nama}</td>
                      <td className="border border-black p-1.5 font-mono">{std.gender || '-'}</td>
                      <td className="border border-black p-1.5 font-mono font-bold">{h}</td>
                      <td className="border border-black p-1.5 font-mono">{s}</td>
                      <td className="border border-black p-1.5 font-mono">{i}</td>
                      <td className="border border-black p-1.5 font-mono">{a}</td>
                      <td className="border border-black p-1.5 font-mono">{d}</td>
                      <td className="border border-black p-1.5 font-mono font-bold">{h + s + i + a + d}</td>
                      <td className="border border-black p-1.5 font-mono font-bold">{pct}%</td>
                      <td className="border border-black p-1.5 text-[10px]">
                        {pct >= 85 ? 'Sangat Baik' : pct >= 75 ? 'Cukup' : 'Perlu Perhatian'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  // Interactive Web Mode
  return (
    <div className="space-y-4">
      {/* Bilah Navigasi / Tab Pilihan Tampilan Presensi */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbsenViewMode('latest')}
            className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              absenViewMode === 'latest'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span>Absen Terakhir (Terbaru)</span>
            {latestSession && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                  absenViewMode === 'latest'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Ke-{latestSession.pertemuanKe}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAbsenViewMode('recap')}
            className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              absenViewMode === 'recap'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Bilah Rekap Semua Absen</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                absenViewMode === 'recap'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {sortedSessions.length} Sesi
            </span>
          </button>
        </div>

        {/* Selector untuk memilih sesi tertentu jika dalam mode detail sesi */}
        {absenViewMode === 'latest' && sortedSessions.length > 1 && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap hidden md:inline">
              Pilih Sesi Lain:
            </span>
            <select
              value={currentSession?.id || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="min-h-[44px] px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto cursor-pointer"
            >
              {sortedSessions.map((sess: any) => (
                <option key={sess.id} value={sess.id}>
                  Pertemuan {sess.pertemuanKe} ({sess.tanggal}){' '}
                  {sess.id === latestSession?.id ? '★ Terakhir Diinput' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KONTEN 1: TAMPILAN ABSEN TERAKHIR YANG DIINPUT (DEFAULT) */}
      {absenViewMode === 'latest' && (
        <div className="space-y-4">
          {currentSession ? (
            <>
              {/* Header Informasi Sesi Terakhir */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-100 dark:border-indigo-900">
                        Pertemuan Ke-{currentSession.pertemuanKe}
                      </span>
                      {currentSession.id === latestSession?.id && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Absen Terakhir Diinput
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      📅 {formatIndonesianDate(currentSession.tanggal)}
                    </h3>
                  </div>

                  {currentSession.topikMateri && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs sm:max-w-xs">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                        Materi / Topik Pembelajaran:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentSession.topikMateri}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stat Chips Sesi Terakhir */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl text-center border border-slate-200/60 dark:border-slate-750">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Murid</span>
                    <span className="text-base font-black font-mono text-slate-800 dark:text-slate-200">
                      {currentSessionStats.total}
                    </span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl text-center border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">Hadir (H)</span>
                    <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                      {currentSessionStats.h}
                    </span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-2xl text-center border border-blue-200/60 dark:border-blue-900/40">
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-bold">Sakit (S)</span>
                    <span className="text-base font-black font-mono text-blue-700 dark:text-blue-300">
                      {currentSessionStats.s}
                    </span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-2xl text-center border border-amber-200/60 dark:border-amber-900/40">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-bold">Izin (I)</span>
                    <span className="text-base font-black font-mono text-amber-700 dark:text-amber-300">
                      {currentSessionStats.i}
                    </span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-2xl text-center border border-rose-200/60 dark:border-rose-900/40">
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-bold">Alpa (A)</span>
                    <span className="text-base font-black font-mono text-rose-700 dark:text-rose-300">
                      {currentSessionStats.a}
                    </span>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-2xl text-center border border-purple-200/60 dark:border-purple-900/40">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold">Dispen (D)</span>
                    <span className="text-base font-black font-mono text-purple-700 dark:text-purple-300">
                      {currentSessionStats.d}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabel Murid Pada Sesi Terakhir */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-200" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Rincian Presensi Murid: Pertemuan {currentSession.pertemuanKe}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-950 bg-white/95 px-2.5 py-1 rounded-xl shadow-xs">
                    Tingkat Kehadiran: {currentSessionStats.rate}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                        <th
                          onClick={() => setSortOrder('no')}
                          className="py-3.5 px-3 text-center w-12 text-white cursor-pointer hover:bg-white/10 transition select-none"
                          title="Klik untuk sortir nomor urut"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>No</span>
                            {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-white" />}
                          </div>
                        </th>
                        <th
                          onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                          className="py-3.5 px-4 min-w-[200px] text-white cursor-pointer hover:bg-white/10 transition select-none"
                          title="Klik untuk sortir nama alfabetis (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Nama Murid</span>
                            {sortOrder === 'name-asc' ? (
                              <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                                <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                              </span>
                            ) : sortOrder === 'name-desc' ? (
                              <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                                <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                              </span>
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-emerald-200" />
                            )}
                          </div>
                        </th>
                        <th className="py-3.5 px-4 text-center w-36 text-white">Status Kehadiran</th>
                        <th className="py-3.5 px-4 min-w-[180px] text-white">Catatan / Keterangan</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedStudents.map((std: any, idx: number) => {
                        const rec = currentSession.records?.[std.id];
                        const status = rec?.status || 'H';
                        const catatan = rec?.catatan;

                        return (
                          <tr
                            key={std.id}
                            className={`transition ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/40 dark:bg-slate-800/60'} hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50`}
                          >
                            <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {std.nama}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                NISN: {std.nisn || '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {status === 'H' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3.5 h-3.5" />
                                  Hadir
                                </span>
                              )}
                              {status === 'S' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Sakit
                                </span>
                              )}
                              {status === 'I' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Izin
                                </span>
                              )}
                              {status === 'A' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  Alpa
                                </span>
                              )}
                              {status === 'D' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Dispen
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {catatan ? (
                                <span className="italic bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-750 inline-block text-[11px]">
                                  "{catatan}"
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Data Presensi Yang Diinput
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pendidik pengampu belum melakukan input absensi untuk kelas ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* KONTEN 2: BILAH REKAP SEMUA ABSEN (KUMULATIF) */}
      {absenViewMode === 'recap' && (
        <div className="space-y-4">
          {/* Ringkasan Kumulatif */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Pertemuan Terlaksana
                </span>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {cumulativeStats.totalMeetings} Sesi
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Rata-Rata Kehadiran
                </span>
                <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {cumulativeStats.avgRate}%
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Kehadiran 100% Sempurna
                </span>
                <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
                  {cumulativeStats.perfectAttendanceCount} Murid
                </p>
              </div>
            </div>
          </div>

          {/* Tabel Rekap Kumulatif Semua Pertemuan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Bilah Rekap Akumulasi Seluruh Pertemuan ({data?.sessions?.length || 0} Pertemuan)
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-950 bg-white/95 px-2.5 py-1 rounded-xl shadow-xs">
                Rekap Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                    <th
                      onClick={() => setSortOrder('no')}
                      className="py-3 px-3 text-center w-12 text-white cursor-pointer hover:bg-white/10 transition select-none"
                      title="Klik untuk sortir nomor urut"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>No</span>
                        {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-white" />}
                      </div>
                    </th>
                    <th
                      onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                      className="py-3 px-4 min-w-[190px] text-white cursor-pointer hover:bg-white/10 transition select-none"
                      title="Klik untuk sortir nama alfabetis (A-Z / Z-A)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Murid</span>
                        {sortOrder === 'name-asc' ? (
                          <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                            <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                          </span>
                        ) : sortOrder === 'name-desc' ? (
                          <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                            <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-emerald-200" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-14 text-white">Hadir</th>
                    <th className="py-3 px-3 text-center w-14 text-white">Sakit</th>
                    <th className="py-3 px-3 text-center w-14 text-white">Izin</th>
                    <th className="py-3 px-3 text-center w-14 text-white">Alpa</th>
                    <th className="py-3 px-3 text-center w-14 text-white">Dispen</th>
                    <th className="py-3 px-4 text-center w-28 text-white">% Kehadiran</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedStudents.map((std: any, idx: number) => {
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
                      <tr
                        key={std.id}
                        className={`transition ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/40 dark:bg-slate-800/60'} hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50`}
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {std.nama}
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
        </div>
      )}
    </div>
  );
};
