import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  ShieldCheck,
  Lock,
  Globe,
  FileText,
  FileSpreadsheet,
  Printer,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';
import { getKurikulumMerdekaAssessment } from '../../utils/gradeCalculations';
import { SmoothScrollToTop } from '../SmoothScrollToTop';
import { ScrollProgressBar } from '../ScrollProgressBar';
import { OfficialLetterhead } from '../OfficialLetterhead';
import { saveExcelFileWithNotification } from '../../utils/exportUtils';
import { ExcelDownloadToast } from '../ExcelDownloadToast';
import { getPublicShareRefFromLocation } from '../../utils/publicShareUrl';

// Modular public share components
import { PublicShareHeader } from './PublicShareHeader';
import { PublicShareFooter } from './PublicShareFooter';
import { PublicShareLoading } from './PublicShareLoading';
import { PublicShareError } from './PublicShareError';
import { usePublicShareData, formatIndonesianDate } from './hooks/usePublicShareData';
import { PublicAttendanceSection } from './sections/PublicAttendanceSection';
import { PublicGradesSection } from './sections/PublicGradesSection';
import { PublicSavingsSection } from './sections/PublicSavingsSection';
import { PublicAgendaSection } from './sections/PublicAgendaSection';

export interface PublicSharePageProps {
  type?: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  shareId?: string;
}

export const PublicSharePage: React.FC<PublicSharePageProps> = ({
  type: initialTypeProp,
  shareId: shareIdProp,
}) => {
  // Resolve share params from props or URL
  const urlRef = useMemo(() => getPublicShareRefFromLocation(), []);
  const shareId = shareIdProp || urlRef?.shareId || '';
  const initialType = initialTypeProp || urlRef?.type || 'absen';

  const {
    data,
    loading,
    isRefreshing,
    errorType,
    errorMessage,
    searchTerm,
    setSearchTerm,
    copied,
    sortOrder,
    setSortOrder,
    effectiveType,
    satuanPendidikan,
    guruPengampu,
    nbmGuru,
    tahunAjaran,
    semester,
    kepalaSekolah,
    nbmKepala,
    loadData,
    handleCopyLink,
    formattedUpdateDate,
    sortedStudents,
  } = usePublicShareData({ initialType, shareId });

  // View mode switcher: Web Interaktif vs Dokumen Cetak A4
  const [isDocumentViewMode, setIsDocumentViewMode] = useState<boolean>(false);

  // Attendance-specific state
  const [absenViewMode, setAbsenViewMode] = useState<'latest' | 'recap'>('latest');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Grades-specific state
  const [gradeViewMode, setGradeViewMode] = useState<'summary' | 'detailed'>('summary');
  const [gradeFilterStatus, setGradeFilterStatus] = useState<'all' | 'tuntas' | 'belum_tuntas'>('all');
  const [selectedStudentGrade, setSelectedStudentGrade] = useState<any | null>(null);
  const [raporModalTab, setRaporModalTab] = useState<'document' | 'card'>('document');

  // Grade calculations
  const classStudentsList = useMemo(() => {
    const list = Array.isArray(data?.students) ? [...data.students] : [];
    return list.sort((a: any, b: any) =>
      (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' })
    );
  }, [data?.students]);

  const rawGradesList = useMemo(() => {
    return Array.isArray(data?.grades) ? data.grades : [];
  }, [data?.grades]);

  const activeGradeColumns = useMemo(() => {
    if (data?.gradeColumns && Array.isArray(data.gradeColumns) && data.gradeColumns.length > 0) {
      return data.gradeColumns;
    }
    return [
      { key: 'formatif1', label: 'Formatif 1' },
      { key: 'formatif2', label: 'Formatif 2' },
      { key: 'formatif3', label: 'Formatif 3' },
    ];
  }, [data?.gradeColumns]);

  const computedGrades = useMemo(() => {
    const kkm = Number(data?.kkm) || 75;
    return classStudentsList.map((std: any) => {
      const g = rawGradesList.find((item: any) => item.studentId === std.id);

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
      ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

      const avgF = fVals.length > 0 ? Math.round(fVals.reduce((a, b) => a + b, 0) / fVals.length) : null;
      const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
      const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

      let totalSum = 0;
      let countInputted = 0;
      fVals.forEach((v) => {
        totalSum += v;
        countInputted++;
      });
      if (sts !== null) {
        totalSum += sts;
        countInputted++;
      }
      if (sas !== null) {
        totalSum += sas;
        countInputted++;
      }

      const hasAnyScore = countInputted > 0;

      let totalWeighted = 0;
      let totalW = 0;
      if (avgF !== null) {
        totalWeighted += avgF * 0.5;
        totalW += 0.5;
      }
      if (sts !== null) {
        totalWeighted += sts * 0.25;
        totalW += 0.25;
      }
      if (sas !== null) {
        totalWeighted += sas * 0.25;
        totalW += 0.25;
      }

      const finalScore = totalW > 0 ? Math.round(totalWeighted / totalW) : 0;

      const merdekaAssessment = getKurikulumMerdekaAssessment(
        hasAnyScore ? finalScore : null,
        kkm,
        data?.mataPelajaran || data?.namaKelas,
        std.nama
      );

      return {
        student: std,
        gradeRecord: g,
        fVals,
        avgF,
        sts,
        sas,
        totalSum,
        countInputted,
        hasAnyScore,
        finalScore,
        predikat: merdekaAssessment.predikat,
        predikatLabel: merdekaAssessment.predikatLabel,
        merdekaDeskripsi: merdekaAssessment.deskripsi,
        merdekaDeskripsiSingkat: merdekaAssessment.deskripsiSingkat,
        isTuntas: merdekaAssessment.isTuntas,
      };
    });
  }, [classStudentsList, rawGradesList, data?.kkm, data?.mataPelajaran, data?.namaKelas]);

  const gradeClassStats = useMemo(() => {
    const scoredStudents = computedGrades.filter((c: any) => c.hasAnyScore);
    const totalScored = scoredStudents.length;
    if (totalScored === 0) {
      return {
        avgScore: 0,
        tuntasCount: 0,
        tuntasRate: 0,
        highestScore: 0,
        lowestScore: 0,
        totalScored: 0,
        totalStudents: computedGrades.length,
      };
    }
    const sumFinal = scoredStudents.reduce((a: number, b: any) => a + b.finalScore, 0);
    const avgScore = Math.round(sumFinal / totalScored);
    const tuntasCount = scoredStudents.filter((c: any) => c.isTuntas).length;
    const tuntasRate = Math.round((tuntasCount / totalScored) * 100);
    const allFinals = scoredStudents.map((c: any) => c.finalScore);
    const highestScore = Math.max(...allFinals);
    const lowestScore = Math.min(...allFinals);

    return {
      avgScore,
      tuntasCount,
      tuntasRate,
      highestScore,
      lowestScore,
      totalScored,
      totalStudents: computedGrades.length,
    };
  }, [computedGrades]);

  const gradeFooterTotals = useMemo(() => {
    let grandTotalSum = 0;
    let finalSum = 0;
    let finalCount = 0;
    let stsSum = 0;
    let stsCount = 0;
    let sasSum = 0;
    let sasCount = 0;
    let avgFSum = 0;
    let avgFCount = 0;

    const tpTotals: Record<string, { sum: number; count: number }> = {};
    activeGradeColumns.forEach((c: any) => {
      tpTotals[c.key] = { sum: 0, count: 0 };
    });

    computedGrades.forEach((c: any) => {
      if (c.hasAnyScore) {
        grandTotalSum += c.totalSum;
        finalSum += c.finalScore;
        finalCount++;
      }
      if (c.sts !== null) {
        stsSum += c.sts;
        stsCount++;
      }
      if (c.sas !== null) {
        sasSum += c.sas;
        sasCount++;
      }
      if (c.avgF !== null) {
        avgFSum += c.avgF;
        avgFCount++;
      }

      activeGradeColumns.forEach((col: any) => {
        const val = c.gradeRecord?.[col.key];
        if (typeof val === 'number' && !isNaN(val)) {
          tpTotals[col.key].sum += val;
          tpTotals[col.key].count++;
        }
      });
    });

    return {
      grandTotalSum,
      avgFinal: finalCount > 0 ? Math.round(finalSum / finalCount) : 0,
      stsSum,
      stsAvg: stsCount > 0 ? Math.round(stsSum / stsCount) : null,
      sasSum,
      sasAvg: sasCount > 0 ? Math.round(sasSum / sasCount) : null,
      avgFSum,
      avgFAvg: avgFCount > 0 ? Math.round(avgFSum / avgFCount) : null,
      tpTotals,
    };
  }, [computedGrades, activeGradeColumns]);

  const filteredComputedGrades = useMemo(() => {
    return computedGrades
      .filter((item: any) => {
        const matchSearch =
          (item.student?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.student?.nisn || '').includes(searchTerm);
        if (!matchSearch) return false;

        if (gradeFilterStatus === 'tuntas') return item.isTuntas;
        if (gradeFilterStatus === 'belum_tuntas') return item.hasAnyScore && !item.isTuntas;
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortOrder === 'name-asc') {
          return (a.student?.nama || '').localeCompare(b.student?.nama || '', 'id', { sensitivity: 'base' });
        }
        if (sortOrder === 'name-desc') {
          return (b.student?.nama || '').localeCompare(a.student?.nama || '', 'id', { sensitivity: 'base' });
        }
        return (a.student?.no || 0) - (b.student?.no || 0);
      });
  }, [computedGrades, searchTerm, gradeFilterStatus, sortOrder]);

  // Excel download handlers
  const handleDownloadGradesExcel = async () => {
    if (!computedGrades || computedGrades.length === 0) return;

    const rows = computedGrades.map((g: any, idx: number) => {
      const fVals: number[] = g.fVals || [];
      const avgF =
        g.avgF !== null
          ? g.avgF
          : fVals.length > 0
          ? Math.round(fVals.reduce((a: number, b: number) => a + b, 0) / fVals.length)
          : null;
      const sts = typeof g.sts === 'number' && !isNaN(g.sts) ? g.sts : null;
      const sas = typeof g.sas === 'number' && !isNaN(g.sas) ? g.sas : null;
      const sumatifVals = [sts, sas].filter((v): v is number => v !== null);
      const avgSumatif =
        sumatifVals.length > 0
          ? Math.round(sumatifVals.reduce((a, b) => a + b, 0) / sumatifVals.length)
          : null;

      const m = getKurikulumMerdekaAssessment(
        g.hasAnyScore ? g.finalScore : null,
        Number(data?.kkm) || 75,
        data?.subject || 'Mata Pelajaran',
        g.student.nama
      );
      const deskripsiLengkap = g.merdekaDeskripsi || m.deskripsi || '-';
      const totalFormatifVal = avgF !== null ? avgF : avgSumatif !== null ? avgSumatif : '-';
      const totalSumatifVal = avgSumatif !== null ? avgSumatif : avgF !== null ? avgF : '-';

      return {
        No: idx + 1,
        NISN: g.student.nisn || '-',
        'Nama Peserta Didik': g.student.nama,
        'L/P': g.student.gender || '-',
        'Total Formatif': totalFormatifVal,
        'Total Sumatif': totalSumatifVal,
        'Nilai Akhir (NA)': g.hasAnyScore ? g.finalScore : '-',
        Predikat: g.predikat,
        'Status Ketuntasan': g.isTuntas ? 'TUNTAS' : 'REMEDIAL',
        'Deskripsi Capaian Pembelajaran': deskripsiLengkap,
      };
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Rapor Merdeka');
    const classNameClean = (data?.className || 'Kelas').replace(/\s+/g, '_');
    const subjectClean = (data?.subject || 'Nilai').replace(/\s+/g, '_');
    const fname = `Nilai_${classNameClean}_${subjectClean}_${Date.now()}.xlsx`;
    saveExcelFileWithNotification(
      wb,
      fname,
      `Nilai Rapor - ${data?.className || 'Kelas'} (${data?.subject || 'Nilai'})`
    );
  };

  const handleDownloadSingleStudentExcel = async (studentGrade: any) => {
    if (!studentGrade) return;
    const std = studentGrade.student;
    const m = getKurikulumMerdekaAssessment(
      studentGrade.hasAnyScore ? studentGrade.finalScore : null,
      Number(data?.kkm) || 75,
      data?.subject || 'Mata Pelajaran',
      std.nama
    );

    const fVals: number[] = studentGrade.fVals || [];
    const avgF =
      studentGrade.avgF !== null
        ? studentGrade.avgF
        : fVals.length > 0
        ? Math.round(fVals.reduce((a: number, b: number) => a + b, 0) / fVals.length)
        : null;
    const sts = typeof studentGrade.sts === 'number' && !isNaN(studentGrade.sts) ? studentGrade.sts : null;
    const sas = typeof studentGrade.sas === 'number' && !isNaN(studentGrade.sas) ? studentGrade.sas : null;
    const sumatifVals = [sts, sas].filter((v): v is number => v !== null);
    const avgSumatif =
      sumatifVals.length > 0
        ? Math.round(sumatifVals.reduce((a, b) => a + b, 0) / sumatifVals.length)
        : null;

    const totalFormatifVal = avgF !== null ? avgF : avgSumatif !== null ? avgSumatif : '-';
    const totalSumatifVal = avgSumatif !== null ? avgSumatif : avgF !== null ? avgF : '-';

    const rows: Record<string, any>[] = [
      { 'Komponen Asesmen': 'Satuan Pendidikan', Nilai: satuanPendidikan, Keterangan: '-' },
      { 'Komponen Asesmen': 'Nama Murid', Nilai: std.nama, Keterangan: `NISN: ${std.nisn || '-'}` },
      { 'Komponen Asesmen': 'Kelas / Rombel', Nilai: data?.className || '-', Keterangan: '-' },
      { 'Komponen Asesmen': 'Mata Pelajaran', Nilai: data?.subject || 'Muatan Kejuruan', Keterangan: `KKM: ${data?.kkm || 75}` },
      { 'Komponen Asesmen': 'Pendidik Pengampu', Nilai: guruPengampu, Keterangan: nbmGuru ? `NBM: ${nbmGuru}` : '-' },
      { 'Komponen Asesmen': 'Tahun Pelajaran', Nilai: `${tahunAjaran} (${semester})`, Keterangan: '-' },
      { 'Komponen Asesmen': 'Total Formatif', Nilai: totalFormatifVal, Keterangan: 'Rata-rata Asesmen Formatif' },
      { 'Komponen Asesmen': 'Total Sumatif', Nilai: totalSumatifVal, Keterangan: 'Rata-rata Asesmen Sumatif (STS + SAS)' },
      { 'Komponen Asesmen': 'Nilai Akhir (NA)', Nilai: studentGrade.hasAnyScore ? studentGrade.finalScore : '-', Keterangan: `Skala 0-100 (KKM: ${data?.kkm || 75})` },
      { 'Komponen Asesmen': 'Predikat Capaian', Nilai: studentGrade.predikat, Keterangan: m.predikatLabel },
      { 'Komponen Asesmen': 'Status Ketuntasan', Nilai: studentGrade.isTuntas ? 'TUNTAS' : 'REMEDIAL', Keterangan: '-' },
      { 'Komponen Asesmen': 'Deskripsi Capaian Pembelajaran', Nilai: m.deskripsi, Keterangan: 'Lengkap Raport Kurikulum Merdeka' },
    ];

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor Nilai Murid');
    const stdNameClean = std.nama.replace(/\s+/g, '_');
    const fname = `Rapor_${stdNameClean}_${Date.now()}.xlsx`;
    saveExcelFileWithNotification(wb, fname, `Rapor Nilai - ${std.nama}`);
  };

  // Loading state
  if (loading && !data) {
    return <PublicShareLoading />;
  }

  // Error state
  if ((!loading && !data) || errorType) {
    return (
      <PublicShareError
        errorType={errorType || 'not_found'}
        message={errorMessage || undefined}
        onRetry={() => loadData(false)}
      />
    );
  }

  return (
    <div className="public-share-page min-h-screen relative bg-slate-50 dark:bg-black text-slate-900 dark:text-white pb-16 transition-colors selection:bg-indigo-500 selection:text-white">
      <ScrollProgressBar />

      {/* Watermark Logo Sekolah */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-50/60 dark:bg-black" />
        <img
          src={SCHOOL_CONFIG.bgImageUrl}
          alt="Watermark SMK Muhiba"
          className="w-[85vw] max-w-xl max-h-[80vh] object-contain opacity-50 dark:opacity-50 pointer-events-none filter drop-shadow-xl select-none"
          style={{ opacity: 0.5 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.bgImageFallback;
          }}
        />
        <div className="absolute inset-0 bg-transparent dark:bg-black/50 pointer-events-none" />
      </div>

      {/* Header */}
      <PublicShareHeader
        copied={copied}
        onCopyLink={handleCopyLink}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(false)}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Read-Only Assurance Notice & View Switcher */}
        <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-indigo-900/10 dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  Portal Publik Resmi (Hanya Lihat / Read-Only)
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Terisolasi
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Halaman ini disiapkan khusus bagi murid dan orang tua tanpa hak akses perubahan atau edit data.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0 no-print">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsDocumentViewMode(false)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  !isDocumentViewMode
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan Tampilan Web Interaktif"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDocumentViewMode(true)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  isDocumentViewMode
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan Format Dokumen A4 Resmi dengan Kop Surat"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Dokumen A4</span>
              </button>
            </div>

            {effectiveType === 'nilai' && (
              <button
                type="button"
                onClick={handleDownloadGradesExcel}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Download Leger Nilai ke Format File Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Download File Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Cetak Dokumen Resmi A4 atau Simpan ke PDF"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak Dokumen A4</span>
            </button>
          </div>
        </div>

        {/* 1. TAMPILAN WEB INTERAKTIF */}
        {!isDocumentViewMode && (
          <div className="space-y-6 print:hidden">
            {/* Info Card with Real Timestamp */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900">
                    {effectiveType === 'absen'
                      ? 'Rekap Presensi Murid'
                      : effectiveType === 'nilai'
                      ? 'Rekap Asesmen / Nilai'
                      : effectiveType === 'agenda'
                      ? 'Agenda Mengajar Pendidik'
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
                  Pendidik Pengampu:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {guruPengampu}
                  </strong>
                </p>
              </div>

              {/* Timestamp Badge */}
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

            {/* Search & Sort Bar */}
            {(effectiveType === 'absen' || effectiveType === 'nilai' || effectiveType === 'tabungan') && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama murid atau NISN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSortOrder('no')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      sortOrder === 'no'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Urutkan nomor urut"
                  >
                    <span>No Urut</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('name-asc')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      sortOrder === 'name-asc'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Urutkan abjad A ke Z"
                  >
                    <ArrowUpAZ className="w-3.5 h-3.5" />
                    <span>Abjad A-Z</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder('name-desc')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      sortOrder === 'name-desc'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Urutkan abjad Z ke A"
                  >
                    <ArrowDownZA className="w-3.5 h-3.5" />
                    <span>Abjad Z-A</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view: Absen */}
            {effectiveType === 'absen' && (
              <PublicAttendanceSection
                data={data}
                sortedStudents={sortedStudents}
                formatIndonesianDate={formatIndonesianDate}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                isDocumentViewMode={false}
                absenViewMode={absenViewMode}
                setAbsenViewMode={setAbsenViewMode}
                selectedSessionId={selectedSessionId}
                setSelectedSessionId={setSelectedSessionId}
              />
            )}

            {/* Sub-view: Nilai */}
            {effectiveType === 'nilai' && (
              <PublicGradesSection
                data={data}
                activeGradeColumns={activeGradeColumns}
                filteredComputedGrades={filteredComputedGrades}
                gradeClassStats={gradeClassStats}
                gradeFooterTotals={gradeFooterTotals}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                isDocumentViewMode={false}
                gradeViewMode={gradeViewMode}
                setGradeViewMode={setGradeViewMode}
                gradeFilterStatus={gradeFilterStatus}
                setGradeFilterStatus={setGradeFilterStatus}
                selectedStudentGrade={selectedStudentGrade}
                setSelectedStudentGrade={setSelectedStudentGrade}
                raporModalTab={raporModalTab}
                setRaporModalTab={setRaporModalTab}
                handleDownloadSingleStudentExcel={handleDownloadSingleStudentExcel}
                satuanPendidikan={satuanPendidikan}
                guruPengampu={guruPengampu}
                nbmGuru={nbmGuru}
                tahunAjaran={tahunAjaran}
                semester={semester}
                kepalaSekolah={kepalaSekolah}
                nbmKepala={nbmKepala}
                formatIndonesianDate={formatIndonesianDate}
              />
            )}

            {/* Sub-view: Tabungan */}
            {effectiveType === 'tabungan' && (
              <PublicSavingsSection
                data={data}
                sortedStudents={sortedStudents}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                isDocumentViewMode={false}
                formatIndonesianDate={formatIndonesianDate}
              />
            )}

            {/* Sub-view: Agenda */}
            {effectiveType === 'agenda' && (
              <PublicAgendaSection
                data={data}
                isDocumentViewMode={false}
              />
            )}
          </div>
        )}

        {/* 2. DOKUMEN CETAK RESMI A4 */}
        <div
          id="public-document-view"
          className={`${
            isDocumentViewMode ? 'block' : 'hidden print:block'
          } bg-white text-black border border-slate-300 p-6 sm:p-10 font-serif leading-relaxed max-w-[210mm] mx-auto shadow-sm rounded-xl print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:bg-white text-xs`}
        >
          {/* Kop Surat Resmi Dokumen Siap Cetak */}
          <OfficialLetterhead namaSekolah={satuanPendidikan} />

          {/* Judul Dokumen Resmi */}
          <div className="text-center my-4">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-black">
              {effectiveType === 'absen'
                ? absenViewMode === 'latest'
                  ? 'DAFTAR HADIR / PRESENSI KBM PESERTA DIDIK'
                  : 'REKAPITULASI PRESENSI / KEHADIRAN PESERTA DIDIK'
                : effectiveType === 'nilai'
                ? 'LEGER CAPAIAN HASIL ASESMEN PESERTA DIDIK'
                : effectiveType === 'agenda'
                ? 'BUKU JURNAL / AGENDA MENGAJAR PENDIDIK'
                : 'LAPORAN REKAPITULASI KAS & TABUNGAN KELAS'}
            </h2>
            <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-black mt-0.5">
              Kurikulum Merdeka • Tahun Pelajaran {tahunAjaran} ({semester})
            </p>
          </div>

          {/* Identitas Dokumen Formal */}
          <div className="border border-black p-3 mb-4 font-sans text-[11px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <table className="w-full text-left">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 text-black">Satuan Pendidikan</td>
                      <td className="w-3 py-0.5">:</td>
                      <td className="py-0.5 font-bold text-black">{satuanPendidikan}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-black">Kelas / Rombel</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-bold text-black">{data?.className || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-black">Mata Pelajaran</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-bold text-black">{data?.subject || 'Muatan Kejuruan'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="w-full text-left">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 text-black">Pendidik Pengampu</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-bold text-black">{guruPengampu}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-black">Tahun Pelajaran</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 text-black">{tahunAjaran} ({semester})</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Konten Dokumen Berdasarkan Tipe */}
          {effectiveType === 'absen' && (
            <PublicAttendanceSection
              data={data}
              sortedStudents={sortedStudents}
              formatIndonesianDate={formatIndonesianDate}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              isDocumentViewMode={true}
              absenViewMode={absenViewMode}
              setAbsenViewMode={setAbsenViewMode}
              selectedSessionId={selectedSessionId}
              setSelectedSessionId={setSelectedSessionId}
            />
          )}

          {effectiveType === 'nilai' && (
            <PublicGradesSection
              data={data}
              activeGradeColumns={activeGradeColumns}
              filteredComputedGrades={filteredComputedGrades}
              gradeClassStats={gradeClassStats}
              gradeFooterTotals={gradeFooterTotals}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              isDocumentViewMode={true}
              gradeViewMode={gradeViewMode}
              setGradeViewMode={setGradeViewMode}
              gradeFilterStatus={gradeFilterStatus}
              setGradeFilterStatus={setGradeFilterStatus}
              selectedStudentGrade={selectedStudentGrade}
              setSelectedStudentGrade={setSelectedStudentGrade}
              raporModalTab={raporModalTab}
              setRaporModalTab={setRaporModalTab}
              handleDownloadSingleStudentExcel={handleDownloadSingleStudentExcel}
              satuanPendidikan={satuanPendidikan}
              guruPengampu={guruPengampu}
              nbmGuru={nbmGuru}
              tahunAjaran={tahunAjaran}
              semester={semester}
              kepalaSekolah={kepalaSekolah}
              nbmKepala={nbmKepala}
              formatIndonesianDate={formatIndonesianDate}
            />
          )}

          {effectiveType === 'tabungan' && (
            <PublicSavingsSection
              data={data}
              sortedStudents={sortedStudents}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              isDocumentViewMode={true}
              formatIndonesianDate={formatIndonesianDate}
            />
          )}

          {effectiveType === 'agenda' && (
            <PublicAgendaSection
              data={data}
              isDocumentViewMode={true}
            />
          )}

          {/* Tanda Tangan Resmi Dokumen */}
          <div className="mt-8 font-sans text-xs">
            <div className="flex justify-end mb-4">
              <p>Bawang, {formatIndonesianDate(new Date().toISOString())}</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="font-semibold">Mengetahui,</p>
                <p className="font-semibold">Kepala {satuanPendidikan}</p>
                <div className="h-20 flex items-end justify-center">
                  <p className="font-bold underline">
                    {kepalaSekolah ? kepalaSekolah : '( .................................................... )'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  {nbmKepala
                    ? `NBM. ${nbmKepala}`
                    : 'NBM. ........................................'}
                </p>
              </div>
              <div>
                <p className="font-semibold">Pendidik Pengampu Mata Pelajaran,</p>
                <p className="text-slate-600">{data?.subject || 'Guru Pengampu'}</p>
                <div className="h-20 flex items-end justify-center">
                  <p className="font-bold underline">{guruPengampu}</p>
                </div>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  {nbmGuru ? `NBM: ${nbmGuru}` : 'NBM. -'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicShareFooter />
      <SmoothScrollToTop showPercent threshold={200} />
      <ExcelDownloadToast />
    </div>
  );
};

export default PublicSharePage;
