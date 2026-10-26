import React from 'react';
import {
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  Filter,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
  Printer,
  X,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { OfficialLetterhead } from '../OfficialLetterhead';

interface PublicShareGradesViewProps {
  data: any;
  activeGradeColumns: any[];
  filteredComputedGrades: any[];
  gradeClassStats: any;
  gradeFooterTotals: any;
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'no' | 'name-asc' | 'name-desc'>>;
  isDocumentViewMode: boolean;
  gradeViewMode: 'summary' | 'detailed';
  setGradeViewMode: (mode: 'summary' | 'detailed') => void;
  gradeFilterStatus: 'all' | 'tuntas' | 'belum_tuntas';
  setGradeFilterStatus: (status: 'all' | 'tuntas' | 'belum_tuntas') => void;
  selectedStudentGrade: any;
  setSelectedStudentGrade: (g: any) => void;
  raporModalTab: 'document' | 'card';
  setRaporModalTab: (tab: 'document' | 'card') => void;
  handleDownloadSingleStudentExcel: (studentGrade: any) => void;
  satuanPendidikan: string;
  guruPengampu: string;
  nbmGuru: string;
  tahunAjaran: string;
  semester: string;
  kepalaSekolah: string;
  nbmKepala: string;
  formatIndonesianDate: (iso?: string) => string;
}

export const PublicShareGradesView: React.FC<PublicShareGradesViewProps> = ({
  data,
  activeGradeColumns,
  filteredComputedGrades,
  gradeClassStats,
  gradeFooterTotals,
  sortOrder,
  setSortOrder,
  isDocumentViewMode,
  gradeViewMode,
  setGradeViewMode,
  gradeFilterStatus,
  setGradeFilterStatus,
  selectedStudentGrade,
  setSelectedStudentGrade,
  raporModalTab,
  setRaporModalTab,
  handleDownloadSingleStudentExcel,
  satuanPendidikan,
  guruPengampu,
  nbmGuru,
  tahunAjaran,
  semester,
  kepalaSekolah,
  nbmKepala,
  formatIndonesianDate,
}) => {
  // If in Document A4 mode
  if (isDocumentViewMode) {
    return (
      <div className="mb-4">
        <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100">
              <th className="border border-black p-1.5 w-7" rowSpan={2}>
                No
              </th>
              <th className="border border-black p-1.5 w-24 text-center" rowSpan={2}>
                NISN
              </th>
              <th className="border border-black p-1.5 text-left min-w-[150px]" rowSpan={2}>
                Nama Peserta Didik
              </th>
              <th className="border border-black p-1.5 w-8" rowSpan={2}>
                L/P
              </th>
              <th
                className="border border-black p-1"
                colSpan={activeGradeColumns.length + 1}
              >
                Asesmen Formatif
              </th>
              <th className="border border-black p-1" colSpan={2}>
                Asesmen Sumatif
              </th>
              <th className="border border-black p-1.5 w-14" rowSpan={2}>
                Nilai Akhir (NA)
              </th>
              <th className="border border-black p-1.5 w-12" rowSpan={2}>
                Predikat
              </th>
              <th className="border border-black p-1.5 w-20" rowSpan={2}>
                Ketuntasan
              </th>
            </tr>
            <tr className="bg-slate-50 print:bg-slate-50 text-[9px]">
              {activeGradeColumns.map((col: any) => (
                <th key={col.key} className="border border-black p-1 w-9">
                  {col.label}
                </th>
              ))}
              <th className="border border-black p-1 w-10 font-bold">Rata F</th>
              <th className="border border-black p-1 w-9">STS</th>
              <th className="border border-black p-1 w-9">SAS</th>
            </tr>
          </thead>
          <tbody>
            {filteredComputedGrades.map((g: any, idx: number) => {
              return (
                <tr key={g.student.id} className="hover:bg-slate-50">
                  <td className="border border-black p-1 font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-mono">{g.student.nisn || '-'}</td>
                  <td className="border border-black p-1 text-left font-medium">{g.student.nama}</td>
                  <td className="border border-black p-1 font-mono">{g.student.gender || '-'}</td>
                  {activeGradeColumns.map((col: any) => {
                    const val = g.gradeRecord?.[col.key];
                    const hasVal = typeof val === 'number' && !isNaN(val);
                    return (
                      <td key={col.key} className="border border-black p-1 font-mono">
                        {hasVal ? val : '-'}
                      </td>
                    );
                  })}
                  <td className="border border-black p-1 font-mono font-bold">
                    {g.avgF !== null ? g.avgF : '-'}
                  </td>
                  <td className="border border-black p-1 font-mono">
                    {g.sts !== null ? g.sts : '-'}
                  </td>
                  <td className="border border-black p-1 font-mono">
                    {g.sas !== null ? g.sas : '-'}
                  </td>
                  <td className="border border-black p-1 font-mono font-bold">
                    {g.hasAnyScore ? g.finalScore : '-'}
                  </td>
                  <td className="border border-black p-1 font-bold">{g.predikat}</td>
                  <td className="border border-black p-1 font-semibold text-[9px]">
                    {g.hasAnyScore ? (g.isTuntas ? 'TUNTAS' : 'REMEDIAL') : '-'}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 print:bg-slate-100 font-bold text-[9px]">
              <td className="border border-black p-1.5 text-center" colSpan={4}>
                RATA-RATA KELAS
              </td>
              {activeGradeColumns.map((col: any) => {
                const info = gradeFooterTotals.tpTotals[col.key];
                const avgVal = info && info.count > 0 ? Math.round(info.sum / info.count) : '-';
                return (
                  <td key={col.key} className="border border-black p-1 font-mono">
                    {avgVal}
                  </td>
                );
              })}
              <td className="border border-black p-1 font-mono">
                {gradeFooterTotals.avgFAvg ?? '-'}
              </td>
              <td className="border border-black p-1 font-mono">
                {gradeFooterTotals.stsAvg ?? '-'}
              </td>
              <td className="border border-black p-1 font-mono">
                {gradeFooterTotals.sasAvg ?? '-'}
              </td>
              <td className="border border-black p-1 font-mono">
                {gradeFooterTotals.avgFinal}
              </td>
              <td className="border border-black p-1 text-center" colSpan={2}>
                Target KKM: {data?.kkm || 75}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Interactive Web Mode
  return (
    <div className="space-y-5">
      {/* Ringkasan Statistik Asesmen Kelas (Read-Only KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold block truncate">
              Rata-Rata Kelas
            </span>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {gradeClassStats.avgScore > 0 ? gradeClassStats.avgScore : '-'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold block truncate">
              Ketuntasan KKM
            </span>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {gradeClassStats.totalScored > 0 ? `${gradeClassStats.tuntasRate}%` : '-'}
            </p>
            <span className="text-[10px] text-slate-400 block truncate">
              {gradeClassStats.tuntasCount} dari {gradeClassStats.totalScored} murid
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold block truncate">
              Tertinggi / Terendah
            </span>
            <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {gradeClassStats.totalScored > 0
                ? `${gradeClassStats.highestScore} / ${gradeClassStats.lowestScore}`
                : '-'}
            </p>
            <span className="text-[10px] text-slate-400 block truncate">
              Skor akhir murid
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-bold block truncate">
              Standar KKM
            </span>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {data?.kkm || 75}
            </p>
            <span className="text-[10px] text-slate-400 block truncate">
              Batas ketuntasan
            </span>
          </div>
        </div>
      </div>

      {/* Baris Filter dan Pilihan Mode Tampilan Nilai */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setGradeFilterStatus('all')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              gradeFilterStatus === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Semua ({filteredComputedGrades.length})
          </button>
          <button
            type="button"
            onClick={() => setGradeFilterStatus('tuntas')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              gradeFilterStatus === 'tuntas'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tuntas ({gradeClassStats.tuntasCount})
          </button>
          <button
            type="button"
            onClick={() => setGradeFilterStatus('belum_tuntas')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              gradeFilterStatus === 'belum_tuntas'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            Remedial ({Math.max(0, gradeClassStats.totalScored - gradeClassStats.tuntasCount)})
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setGradeViewMode('summary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                gradeViewMode === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Ringkasan
            </button>
            <button
              type="button"
              onClick={() => setGradeViewMode('detailed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                gradeViewMode === 'detailed'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Detail Kolom
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Leger Nilai Interaktif */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Leger Penilaian Murid Kurikulum Merdeka
              </h3>
              <p className="text-[11px] text-emerald-100">
                Klik baris nama murid untuk melihat atau mencetak rapor individu resmi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-white/20 text-white px-2.5 py-1 rounded-xl">
              Target KKM: {data?.kkm || 75}
            </span>
          </div>
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
                    <span>Nama Peserta Didik</span>
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

                {gradeViewMode === 'detailed' ? (
                  <>
                    {activeGradeColumns.map((col: any) => (
                      <th key={col.key} className="py-3.5 px-3 text-center w-16 text-white">
                        {col.label}
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-center w-18 text-white">Rata Formatif</th>
                    <th className="py-3.5 px-3 text-center w-16 text-white">STS</th>
                    <th className="py-3.5 px-3 text-center w-16 text-white">SAS</th>
                    <th className="py-3.5 px-3 text-center w-24 text-white">Total Nilai</th>
                    <th className="py-3.5 px-4 text-center w-24 text-white">Nilai Akhir (NA)</th>
                    <th className="py-3.5 px-3 text-center w-16 text-white">Predikat</th>
                    <th className="py-3.5 px-4 text-center w-24 text-white">Status</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-3 text-center w-24 text-white">Total Nilai</th>
                    <th className="py-3.5 px-3 text-center w-24 text-white">Rata Formatif</th>
                    <th className="py-3.5 px-3 text-center w-20 text-white">STS</th>
                    <th className="py-3.5 px-3 text-center w-20 text-white">SAS</th>
                    <th className="py-3.5 px-4 text-center w-24 text-white">Nilai Akhir (NA)</th>
                    <th className="py-3.5 px-3 text-center w-16 text-white">Predikat</th>
                    <th className="py-3.5 px-4 text-center w-24 text-white">Status</th>
                    <th className="py-3.5 px-4 min-w-[220px] text-white">Deskripsi Capaian</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredComputedGrades.map((g: any, idx: number) => {
                return (
                  <tr
                    key={g.student.id}
                    onClick={() => setSelectedStudentGrade(g)}
                    className={`transition cursor-pointer ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/40 dark:bg-slate-800/60'
                    } hover:bg-indigo-50 dark:hover:bg-indigo-950/60`}
                    title="Klik untuk membuka lembar rapor individu murid"
                  >
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600">
                        {g.student.nama}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        NISN: {g.student.nisn || '-'}
                      </span>
                    </td>

                    {gradeViewMode === 'detailed' ? (
                      <>
                        {activeGradeColumns.map((col: any) => {
                          const val = g.gradeRecord?.[col.key];
                          const hasVal = typeof val === 'number' && !isNaN(val);
                          return (
                            <td key={col.key} className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                              {hasVal ? val : '-'}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {g.avgF !== null ? g.avgF : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {g.sts !== null ? g.sts : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {g.sas !== null ? g.sas : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40">
                          {g.hasAnyScore ? g.totalSum : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-slate-900 dark:text-white bg-indigo-50/40 dark:bg-indigo-950/30">
                          {g.hasAnyScore ? g.finalScore : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {g.predikat}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {g.hasAnyScore ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                g.isTuntas
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {g.isTuntas ? 'Tuntas' : 'Remedial'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40">
                          {g.hasAnyScore ? g.totalSum : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {g.avgF !== null ? g.avgF : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {g.sts !== null ? g.sts : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {g.sas !== null ? g.sas : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-slate-900 dark:text-white bg-indigo-50/40 dark:bg-indigo-950/30">
                          {g.hasAnyScore ? g.finalScore : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {g.predikat}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {g.hasAnyScore ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                g.isTuntas
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {g.isTuntas ? 'Tuntas' : 'Remedial'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs truncate">
                          {g.gradeRecord?.catatan || g.merdekaDeskripsiSingkat || g.merdekaDeskripsi || '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={2} className="py-2.5 px-4 text-center uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Rata-Rata Kelas
                </td>
                {gradeViewMode === 'detailed' ? (
                  <>
                    {activeGradeColumns.map((col: any) => {
                      const info = gradeFooterTotals.tpTotals[col.key];
                      const avgVal = info && info.count > 0 ? Math.round(info.sum / info.count) : '-';
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {avgVal}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {gradeFooterTotals.avgFAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {gradeFooterTotals.stsAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {gradeFooterTotals.sasAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/60">
                      -
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-black text-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xs">
                      {gradeFooterTotals.avgFinal}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-normal">
                      Target KKM: {data?.kkm || 75}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/60">
                      -
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {gradeFooterTotals.avgFAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {gradeFooterTotals.stsAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {gradeFooterTotals.sasAvg ?? '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-black text-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xs">
                      {gradeFooterTotals.avgFinal}
                    </td>
                    <td colSpan={3} className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-normal">
                      Target KKM: {data?.kkm || 75}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Detail Rapor Capaian Individu Murid (Read-Only) */}
      {selectedStudentGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print-modal-active">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto max-h-[94vh] overflow-y-auto print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:max-h-none print:overflow-visible print:bg-white">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Rapor Capaian Murid: {selectedStudentGrade.student.nama}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {data?.className} &bull; {data?.subject || 'Mata Pelajaran'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tab Switcher inside Modal */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setRaporModalTab('document')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      raporModalTab === 'document'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dokumen Cetak A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRaporModalTab('card')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      raporModalTab === 'card'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Ringkasan</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSingleStudentExcel(selectedStudentGrade)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Download Rapor Individu Murid Ini ke Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Cetak Rapor Individu Murid Ini"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentGrade(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KONTEN 1: DOKUMEN CETAK A4 RESMI (DEFAULT SAAT BUKA MODAL) */}
            {raporModalTab === 'document' && (
              <div className="bg-white text-black p-6 sm:p-8 font-serif leading-relaxed border border-slate-300 print:border-none shadow-sm rounded-xl print:rounded-none print:p-0 print:m-0 text-xs">
                <OfficialLetterhead namaSekolah={satuanPendidikan} />

                <div className="text-center my-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider underline">
                    LEMBAR LAPORAN CAPAIAN HASIL BELAJAR PESERTA DIDIK
                  </h2>
                  <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-slate-800 mt-0.5">
                    Kurikulum Merdeka • Tahun Pelajaran {tahunAjaran} ({semester})
                  </p>
                </div>

                <div className="border border-black p-3 mb-4 font-sans text-[11px]">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <table className="w-full text-left">
                        <tbody>
                          <tr>
                            <td className="w-32 py-0.5 text-slate-700">Nama Peserta Didik</td>
                            <td className="w-3 py-0.5">:</td>
                            <td className="py-0.5 font-bold uppercase">{selectedStudentGrade.student.nama}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-700">NISN</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-mono">{selectedStudentGrade.student.nisn || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-700">Kelas / Rombel</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold">{data?.className || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <table className="w-full text-left">
                        <tbody>
                          <tr>
                            <td className="w-32 py-0.5 text-slate-700">Satuan Pendidikan</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold">{satuanPendidikan}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-700">Mata Pelajaran</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold">{data?.subject || 'Muatan Kejuruan'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-700">Pendidik Pengampu</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold">{guruPengampu}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mb-4 font-sans">
                  <h3 className="font-bold text-xs uppercase mb-1.5 text-slate-900">
                    A. Nilai Capaian Kompetensi
                  </h3>
                  <table className="w-full border-collapse border border-black text-center text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-100">
                        <th className="border border-black p-2 w-8">No</th>
                        <th className="border border-black p-2 text-left">Mata Pelajaran</th>
                        <th className="border border-black p-2 w-16">KKM</th>
                        <th className="border border-black p-2 w-20">Nilai Akhir</th>
                        <th className="border border-black p-2 w-16">Predikat</th>
                        <th className="border border-black p-2 w-32">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-2 font-mono">1</td>
                        <td className="border border-black p-2 text-left font-bold">{data?.subject || 'Muatan Kejuruan'}</td>
                        <td className="border border-black p-2 font-mono">{data?.kkm || 75}</td>
                        <td className="border border-black p-2 font-mono text-sm">{selectedStudentGrade.hasAnyScore ? selectedStudentGrade.finalScore : '-'}</td>
                        <td className="border border-black p-2 text-sm">{selectedStudentGrade.predikat}</td>
                        <td className="border border-black p-2 font-bold">{selectedStudentGrade.isTuntas ? 'TUNTAS KOMPETENSI' : 'BELUM TUNTAS'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mb-6 font-sans">
                  <h3 className="font-bold text-xs uppercase mb-1.5 text-slate-900">
                    B. Deskripsi Capaian Kompetensi
                  </h3>
                  <div className="border border-black p-3 text-[11px] leading-relaxed">
                    <p className="font-semibold text-slate-900 mb-1">
                      Capaian Kompetensi Peserta Didik:
                    </p>
                    <p className="text-slate-800 text-justify">
                      {selectedStudentGrade.gradeRecord?.catatan || selectedStudentGrade.merdekaDeskripsi || 'Ananda telah menunjukkan usaha belajar yang baik dalam penguasaan tujuan pembelajaran yang ditetapkan.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 font-sans text-xs">
                  <div className="flex justify-end mb-4">
                    <p>Bawang, {formatIndonesianDate(new Date().toISOString())}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p className="font-semibold">Mengetahui,</p>
                      <p className="text-slate-600">Orang Tua / Wali Murid</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline">( .................................................... )</p>
                    </div>
                    <div>
                      <p className="font-semibold">Pendidik Mata Pelajaran,</p>
                      <p className="text-slate-600">{data?.subject || 'Guru Pengampu'}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline">{guruPengampu}</p>
                      <p className="text-[11px] text-slate-600">{nbmGuru ? `NBM. ${nbmGuru}` : 'NBM. -'}</p>
                    </div>
                  </div>
                  <div className="text-center mt-6">
                    <p className="font-semibold">Mengetahui,</p>
                    <p className="font-semibold">Kepala SMK Muhammadiyah Bawang</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline">{kepalaSekolah ? kepalaSekolah : '( .................................................... )'}</p>
                    <p className="text-[11px] text-slate-600">{nbmKepala ? `NBM. ${nbmKepala}` : 'NBM. ........................................'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* KONTEN 2: RINGKASAN KARTU (CARD VIEW) */}
            {raporModalTab === 'card' && (
              <div className="space-y-4 no-print">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Identitas Murid
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedStudentGrade.student.nama}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5 font-mono">
                    <span>NISN: {selectedStudentGrade.student.nisn || '-'}</span>
                    <span>Pendidik: {guruPengampu}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Rincian Capaian Asesmen:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {activeGradeColumns.map((col: any) => {
                      const val = selectedStudentGrade.gradeRecord?.[col.key];
                      const hasVal = typeof val === 'number' && !isNaN(val);
                      return (
                        <div
                          key={col.key}
                          className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750"
                        >
                          <span className="text-[10px] text-slate-400 block font-semibold truncate">{col.label}</span>
                          <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {hasVal ? val : '-'}
                          </p>
                        </div>
                      );
                    })}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-semibold">Rata Formatif</span>
                      <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                        {selectedStudentGrade.avgF !== null ? selectedStudentGrade.avgF : '-'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <span className="text-[10px] text-slate-400 block font-semibold">STS (Tengah Sem.)</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {selectedStudentGrade.sts !== null ? selectedStudentGrade.sts : '-'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <span className="text-[10px] text-slate-400 block font-semibold">SAS (Akhir Sem.)</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {selectedStudentGrade.sas !== null ? selectedStudentGrade.sas : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4.5 rounded-2xl flex items-center justify-between shadow-lg border border-indigo-400/30">
                  <div>
                    <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider block">
                      Nilai Akhir Rapor (Kurikulum Merdeka)
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black font-mono drop-shadow-xs">
                        {selectedStudentGrade.hasAnyScore ? selectedStudentGrade.finalScore : '-'}
                      </span>
                      <span className="text-xs text-indigo-200">/ 100</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold text-xs">
                        Predikat {selectedStudentGrade.predikat}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-indigo-200 block">Status KKM ({data?.kkm || 75})</span>
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase mt-1 ${
                        selectedStudentGrade.isTuntas
                          ? 'bg-emerald-400 text-emerald-950 shadow-xs'
                          : 'bg-rose-400 text-rose-950 shadow-xs'
                      }`}
                    >
                      {selectedStudentGrade.isTuntas ? 'TUNTAS' : 'REMEDIAL'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Deskripsi Capaian Pembelajaran:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                    {selectedStudentGrade.gradeRecord?.catatan || selectedStudentGrade.merdekaDeskripsi || 'Ananda telah menunjukkan usaha belajar yang baik dalam penguasaan tujuan pembelajaran yang ditetapkan.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
