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
  CalendarCheck,
  BarChart3,
  UserCheck,
  Users,
  Check,
  Lock,
  Printer,
  Eye,
  Award,
  Filter,
  X,
  ChevronRight,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
  FileText,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getSafeSupabaseClient } from '../services/supabase';
import { getPublicShare, getTeacherProfile } from '../services/data';
import { TeacherProfile } from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { getKurikulumMerdekaAssessment } from '../utils/gradeCalculations';
import { SmoothScrollToTop } from './SmoothScrollToTop';
import { ScrollProgressBar } from './ScrollProgressBar';
import { OfficialLetterhead } from './OfficialLetterhead';
import { saveExcelFileWithNotification } from '../utils/exportUtils';
import { ExcelDownloadToast } from './ExcelDownloadToast';

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
  type: initialType,
  shareId,
}) => {
  const [data, setData] = useState<any>(null);
  const [cloudTeacher, setCloudTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);

  // Nilai view modes & filters
  const [gradeViewMode, setGradeViewMode] = useState<'summary' | 'detailed'>('summary');
  const [gradeFilterStatus, setGradeFilterStatus] = useState<'all' | 'tuntas' | 'belum_tuntas'>('all');
  const [selectedStudentGrade, setSelectedStudentGrade] = useState<any | null>(null);
  const [sortOrder, setSortOrder] = useState<'no' | 'name-asc' | 'name-desc'>('name-asc');

  const effectiveType: 'absen' | 'nilai' | 'tabungan' | 'agenda' =
    data?.shareType || initialType;

  // Integrated profile values with Cloud teacher profile fallback
  const satuanPendidikan =
    data?.namaSekolah || data?.school || cloudTeacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah;
  const guruPengampu =
    data?.teacherName || data?.teacher || cloudTeacher?.namaGuru || 'Pendidik Pengampu';
  const nipGuru = data?.teacherNip || cloudTeacher?.nip || '';
  const nbmGuru = data?.teacherNbm || cloudTeacher?.nbm || '';
  const tahunAjaran =
    data?.tahunAjaran || cloudTeacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran;
  const semester =
    data?.semester || cloudTeacher?.semester || SCHOOL_CONFIG.semester;
  const kepalaSekolah =
    data?.namaKepalaSekolah || cloudTeacher?.namaKepalaSekolah || '';
  const nipKepala =
    data?.nipKepalaSekolah || cloudTeacher?.nipKepalaSekolah || '';
  const nbmKepala =
    data?.nbmKepalaSekolah || cloudTeacher?.nbmKepalaSekolah || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [sharePayload, teacherData] = await Promise.all([
        getPublicShare(shareId).catch(() => null),
        getTeacherProfile().catch(() => null),
      ]);
      if (sharePayload) {
        setData(sharePayload);
      }
      if (teacherData) {
        setCloudTeacher(teacherData);
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

  // Attendance-specific state & calculations (Request: Show latest by default, provide bilah rekap semua)
  const [absenViewMode, setAbsenViewMode] = useState<'latest' | 'recap'>('latest');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isDocumentViewMode, setIsDocumentViewMode] = useState<boolean>(false);
  const [raporModalTab, setRaporModalTab] = useState<'document' | 'card'>('document');

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

  // Grade-specific calculations
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

  // Precompute computed rows for each student
  const computedGrades = useMemo(() => {
    const kkm = Number(data?.kkm) || 75;
    return classStudentsList.map((std: any, idx: number) => {
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

      // HANYA hitung nilai yang sudah diinput saja kedalam total sum (bukan yang kosong)
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

      // Bobot proporsional hanya dari komponen yang sudah terisi
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
  }, [classStudentsList, rawGradesList, data?.kkm]);

  // Overall class statistics
  const gradeClassStats = useMemo(() => {
    const kkm = Number(data?.kkm) || 75;
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
  }, [computedGrades, data?.kkm]);

  // Column-wise sums and averages for footer
  const gradeFooterTotals = useMemo(() => {
    let grandTotalSum = 0;
    let studentsWithTotalSum = 0;

    let stsSum = 0;
    let stsCount = 0;

    let sasSum = 0;
    let sasCount = 0;

    let avgFSum = 0;
    let avgFCount = 0;

    let finalSum = 0;
    let finalCount = 0;

    const tpTotals: Record<string, { sum: number; count: number }> = {};
    activeGradeColumns.forEach((c: any) => {
      tpTotals[c.key] = { sum: 0, count: 0 };
    });

    computedGrades.forEach((c: any) => {
      if (c.hasAnyScore) {
        grandTotalSum += c.totalSum;
        studentsWithTotalSum++;
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

  // Sorted and filtered students list for Absen & Tabungan
  const sortedStudents = useMemo(() => {
    const list = Array.isArray(data?.students) ? [...data.students] : [];
    return list
      .filter(
        (s: any) =>
          (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.nisn || '').includes(searchTerm)
      )
      .sort((a: any, b: any) => {
        if (sortOrder === 'name-asc') {
          return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
        }
        if (sortOrder === 'name-desc') {
          return (b.nama || '').localeCompare(a.nama || '', 'id', { sensitivity: 'base' });
        }
        return (a.no || 0) - (b.no || 0);
      });
  }, [data?.students, searchTerm, sortOrder]);

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

  if (!loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
              Tautan Publik Tidak Ditemukan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Tautan publik ini mungkin belum dibagikan atau tautan yang Anda masukkan kurang tepat. Pastikan Anda membuka link resmi yang dibagikan oleh pendidik mata pelajaran SMK Muhammadiyah Bawang.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={loadData}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Segarkan Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unduh Berkas Excel Khusus Nilai di Link Preview Publik (Hanya Total Formatif, Total Sumatif, Nilai Akhir & Deskripsi Lengkap)
  const handleDownloadGradesExcel = () => {
    if (!computedGrades || computedGrades.length === 0) return;

    const rows = computedGrades.map((g: any, idx: number) => {
      const fVals: number[] = g.fVals || [];
      const sumFormatif = fVals.length > 0 ? fVals.reduce((a, b) => a + b, 0) : null;
      const sts = typeof g.sts === 'number' && !isNaN(g.sts) ? g.sts : null;
      const sas = typeof g.sas === 'number' && !isNaN(g.sas) ? g.sas : null;
      let sumSumatif: number | null = null;
      if (sts !== null || sas !== null) {
        sumSumatif = (sts !== null ? sts : 0) + (sas !== null ? sas : 0);
      }

      const m = getKurikulumMerdekaAssessment(
        g.hasAnyScore ? g.finalScore : null,
        Number(data?.kkm) || 75,
        data?.subject || 'Mata Pelajaran',
        g.student.nama
      );
      const deskripsiLengkap = g.merdekaDeskripsi || m.deskripsi || '-';

      const rowObj: Record<string, any> = {
        No: idx + 1,
        NISN: g.student.nisn || '-',
        'Nama Peserta Didik': g.student.nama,
        'L/P': g.student.gender || '-',
        'Jumlah Total Nilai Formatif': sumFormatif !== null ? sumFormatif : '-',
        'Jumlah Total Nilai Sumatif': sumSumatif !== null ? sumSumatif : '-',
        'Nilai Akhir (NA)': g.hasAnyScore ? g.finalScore : '-',
        'Predikat': g.predikat,
        'Status Ketuntasan': g.isTuntas ? 'TUNTAS' : 'REMEDIAL',
        'Deskripsi Capaian Pembelajaran': deskripsiLengkap,
      };

      return rowObj;
    });

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

  // Unduh Berkas Excel untuk Rapor Individu Murid
  const handleDownloadSingleStudentExcel = (studentGrade: any) => {
    if (!studentGrade) return;
    const std = studentGrade.student;
    const m = getKurikulumMerdekaAssessment(
      studentGrade.hasAnyScore ? studentGrade.finalScore : null,
      Number(data?.kkm) || 75,
      data?.subject || 'Mata Pelajaran',
      std.nama
    );

    const fVals: number[] = studentGrade.fVals || [];
    const sumFormatif = fVals.length > 0 ? fVals.reduce((a, b) => a + b, 0) : null;
    const sts = typeof studentGrade.sts === 'number' && !isNaN(studentGrade.sts) ? studentGrade.sts : null;
    const sas = typeof studentGrade.sas === 'number' && !isNaN(studentGrade.sas) ? studentGrade.sas : null;
    let sumSumatif: number | null = null;
    if (sts !== null || sas !== null) {
      sumSumatif = (sts !== null ? sts : 0) + (sas !== null ? sas : 0);
    }

    const rows: Record<string, any>[] = [
      { 'Komponen Asesmen': 'Satuan Pendidikan', Nilai: satuanPendidikan, Keterangan: '-' },
      { 'Komponen Asesmen': 'Nama Murid', Nilai: std.nama, Keterangan: `NISN: ${std.nisn || '-'}` },
      { 'Komponen Asesmen': 'Kelas / Rombel', Nilai: data?.className || '-', Keterangan: '-' },
      { 'Komponen Asesmen': 'Mata Pelajaran', Nilai: data?.subject || 'Muatan Kejuruan', Keterangan: `KKM: ${data?.kkm || 75}` },
      { 'Komponen Asesmen': 'Pendidik Pengampu', Nilai: guruPengampu, Keterangan: nbmGuru || nipGuru ? `NIP/NBM: ${nbmGuru || nipGuru}` : '-' },
      { 'Komponen Asesmen': 'Tahun Pelajaran', Nilai: `${tahunAjaran} (${semester})`, Keterangan: '-' },
      { 'Komponen Asesmen': 'Jumlah Total Nilai Formatif', Nilai: sumFormatif !== null ? sumFormatif : '-', Keterangan: 'Total Asesmen Formatif' },
      { 'Komponen Asesmen': 'Jumlah Total Nilai Sumatif', Nilai: sumSumatif !== null ? sumSumatif : '-', Keterangan: 'Total Asesmen Sumatif (STS + SAS)' },
      { 'Komponen Asesmen': 'Nilai Akhir (NA)', Nilai: studentGrade.hasAnyScore ? studentGrade.finalScore : '-', Keterangan: `Skala 0-100 (KKM: ${data?.kkm || 75})` },
      { 'Komponen Asesmen': 'Predikat Capaian', Nilai: studentGrade.predikat, Keterangan: m.predikatLabel },
      { 'Komponen Asesmen': 'Status Ketuntasan', Nilai: studentGrade.isTuntas ? 'TUNTAS' : 'REMEDIAL', Keterangan: '-' },
      { 'Komponen Asesmen': 'Deskripsi Capaian Pembelajaran', Nilai: m.deskripsi, Keterangan: 'Lengkap Raport Kurikulum Merdeka' },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor Nilai Murid');
    const stdNameClean = std.nama.replace(/\s+/g, '_');
    const fname = `Rapor_${stdNameClean}_${Date.now()}.xlsx`;
    saveExcelFileWithNotification(wb, fname, `Rapor Nilai - ${std.nama}`);
  };

  return (
    <div className="public-share-page min-h-screen relative bg-slate-50 dark:bg-black text-slate-900 dark:text-white pb-16 transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Scroll Reading Progress Bar with Smooth Animation */}
      <ScrollProgressBar />

      {/* Background Image Watermark from 44857.png across all preview links with 0.5 opacity */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        {/* Pitch black background in dark mode */}
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
        {/* Subtle vignette/contrast overlay so pure white text reads with 100% clarity */}
        <div className="absolute inset-0 bg-transparent dark:bg-black/50 pointer-events-none" />
      </div>

      {/* Official School Header - Muhammadiyah Visual Identity Gradient */}
      <header className="relative z-20 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white shadow-lg sticky top-0 border-b border-[#008276]/40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <img
              src={SCHOOL_CONFIG.logoUrl}
              alt="Logo SMK Muhammadiyah Bawang"
              className="w-10 h-10 object-contain drop-shadow-md rounded-xl p-0.5 bg-white border border-white/30 shrink-0 shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = SCHOOL_CONFIG.logoFallback;
              }}
            />
            <div className="truncate">
              <h1 className="font-black text-sm sm:text-base leading-tight tracking-tight uppercase truncate">
                {SCHOOL_CONFIG.namaSekolah}
              </h1>
              <p className="text-[11px] text-emerald-100 truncate">
                Portal Informasi & Transparansi Akademik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-semibold flex items-center gap-1 cursor-pointer border border-white/15"
              title="Salin Tautan Publik"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Bagikan'}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15"
              title="Segarkan Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader: Address & Official URL */}
        <div className="bg-[#1c2363]/80 border-t border-white/10 py-1.5 px-4 text-[11px] text-emerald-100">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">{SCHOOL_CONFIG.alamat}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <a
                href={SCHOOL_CONFIG.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-200 hover:text-white hover:underline"
              >
                {SCHOOL_CONFIG.website}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Official Isolated Read-Only Assurance Notice */}
        <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-indigo-900/10 dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
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
            {/* View Mode Switcher: Web vs Dokumen Cetak A4 */}
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

        {/* 1. TAMPILAN WEB INTERAKTIF (Disembunyikan saat mode Dokumen A4 atau saat cetak) */}
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
                {data?.teacher || data?.teacherName || 'Pendidik Pengampu SMK Muhiba'}
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

            {/* Quick Sort Buttons */}
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

        {/* 1. TYPE ABSENSI */}
        {effectiveType === 'absen' && (
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
                                className={`transition ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-indigo-50/40 dark:bg-slate-800/60'} hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60`}
                              >
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
              </div>
            )}
          </div>
        )}

        {/* 2. TYPE NILAI */}
        {effectiveType === 'nilai' && (
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

            {/* Bilah Kontrol & Filter Tampilan (Read-Only) */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Filter Status */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setGradeFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    gradeFilterStatus === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Semua Murid ({computedGrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGradeFilterStatus('tuntas')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    gradeFilterStatus === 'tuntas'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Tuntas ({gradeClassStats.tuntasCount})
                </button>
                <button
                  type="button"
                  onClick={() => setGradeFilterStatus('belum_tuntas')}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    gradeFilterStatus === 'belum_tuntas'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Belum Tuntas ({Math.max(0, gradeClassStats.totalScored - gradeClassStats.tuntasCount)})
                </button>
              </div>

              {/* Toggle Mode Tampilan Tabel */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Mode Tabel:</span>
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGradeViewMode('summary')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      gradeViewMode === 'summary'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Ringkasan Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeViewMode('detailed')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      gradeViewMode === 'detailed'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Rincian Formatif Lengkap
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadGradesExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ml-1"
                  title="Download Data Nilai ke Format Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Excel</span>
                </button>
              </div>
            </div>

            {/* Tabel Nilai Terisolasi Read-Only */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                    Daftar Nilai Murid (KKM: {data?.kkm || 75})
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Hanya nilai yang sudah diinput saja yang dihitung kedalam Total Sum & Rata-rata.
                  </p>
                </div>
                <span className="text-[11px] text-emerald-100 font-mono">
                  Menampilkan {filteredComputedGrades.length} dari {computedGrades.length} murid
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th
                        onClick={() => setSortOrder('no')}
                        className="py-3 px-3 text-center w-12 sticky left-0 bg-[#009B62] text-white z-10 cursor-pointer hover:opacity-90 transition select-none"
                        title="Klik untuk sortir nomor urut"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>No</span>
                          {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-white" />}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                        className="py-3 px-4 min-w-[200px] sticky left-12 bg-[#008276] text-white z-10 cursor-pointer hover:opacity-90 transition select-none"
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
                      
                      {gradeViewMode === 'detailed' ? (
                        <>
                          {activeGradeColumns.map((col: any) => (
                            <th key={col.key} className="py-3 px-3 text-center w-16 whitespace-nowrap text-white">
                              {col.label}
                            </th>
                          ))}
                          <th className="py-3 px-3 text-center w-20 text-white">Rata Formatif</th>
                          <th className="py-3 px-3 text-center w-16 text-white">STS</th>
                          <th className="py-3 px-3 text-center w-16 text-white">SAS</th>
                          <th
                            className="py-3 px-3 text-center w-20 bg-white/15 text-white font-bold"
                            title="Hanya nilai yang sudah diinput saja yang dihitung kedalam total sum"
                          >
                            Total Sum
                          </th>
                          <th className="py-3 px-4 text-center w-24 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-black shadow-xs">Nilai Akhir</th>
                          <th className="py-3 px-3 text-center w-16 text-white">Predikat</th>
                          <th className="py-3 px-4 text-center w-28 text-white">Status</th>
                        </>
                      ) : (
                        <>
                          <th
                            className="py-3 px-3 text-center w-20 bg-white/15 text-white font-bold"
                            title="Hanya nilai yang sudah diinput saja yang dihitung kedalam total sum"
                          >
                            Total Sum
                          </th>
                          <th className="py-3 px-3 text-center w-20 text-white">Rata Formatif</th>
                          <th className="py-3 px-3 text-center w-16 text-white">STS</th>
                          <th className="py-3 px-3 text-center w-16 text-white">SAS</th>
                          <th className="py-3 px-4 text-center w-24 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-black shadow-xs">Nilai Akhir</th>
                          <th className="py-3 px-3 text-center w-16 text-white">Predikat</th>
                          <th className="py-3 px-4 text-center w-28 text-white">Status</th>
                          <th className="py-3 px-3 text-center w-24 text-white">Rapor</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredComputedGrades.length > 0 ? (
                      filteredComputedGrades.map((item: any, idx: number) => {
                        const {
                          student: std,
                          gradeRecord: g,
                          avgF,
                          sts,
                          sas,
                          totalSum,
                          countInputted,
                          hasAnyScore,
                          finalScore,
                          predikat,
                          isTuntas,
                        } = item;

                        return (
                          <tr
                            key={std.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500 sticky left-0 bg-white dark:bg-slate-900">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white sticky left-12 bg-white dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentGrade(item)}
                                className="text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer group"
                              >
                                <span className="group-hover:underline">{std.nama}</span>
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                  NISN: {std.nisn || '-'}
                                </span>
                              </button>
                            </td>

                            {gradeViewMode === 'detailed' ? (
                              <>
                                {activeGradeColumns.map((col: any) => {
                                  const val = g?.[col.key];
                                  const hasVal = typeof val === 'number' && !isNaN(val);
                                  return (
                                    <td
                                      key={col.key}
                                      className="py-3 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300"
                                    >
                                      {hasVal ? val : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                    </td>
                                  );
                                })}
                                <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {avgF !== null ? avgF : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                  {sts !== null ? sts : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                  {sas !== null ? sas : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                                  {hasAnyScore ? (
                                    <span title={`Total dari ${countInputted} nilai terisi (kosong diabaikan)`}>
                                      {totalSum}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-black text-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xs">
                                  {hasAnyScore ? finalScore : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-bold">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs">
                                    {predikat}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {!hasAnyScore ? (
                                    <span className="inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      Belum Ada Nilai
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                        isTuntas
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      {isTuntas ? 'Tuntas' : 'Belum Tuntas'}
                                    </span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                                  {hasAnyScore ? (
                                    <span title={`Total dari ${countInputted} nilai terisi (kosong diabaikan)`}>
                                      {totalSum}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {avgF !== null ? avgF : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                  {sts !== null ? sts : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                  {sas !== null ? sas : '-'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-black text-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xs">
                                  {hasAnyScore ? finalScore : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-bold">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs">
                                    {predikat}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {!hasAnyScore ? (
                                    <span className="inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      Belum Ada Nilai
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                                        isTuntas
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      {isTuntas ? 'Tuntas' : 'Belum Tuntas'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentGrade(item)}
                                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                                    title="Lihat Rapor Capaian Individu"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Rapor</span>
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={gradeViewMode === 'detailed' ? 8 + activeGradeColumns.length : 10}
                          className="py-8 text-center text-slate-400 dark:text-slate-500"
                        >
                          Tidak ada murid yang sesuai dengan filter atau kata kunci pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Footer Ringkasan: Total Sum & Rata-rata */}
                  <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 font-bold text-[11px]">
                    {/* Baris Total Sum (Hanya nilai terisi) */}
                    <tr className="border-b border-slate-200 dark:border-slate-750">
                      <td colSpan={2} className="py-2.5 px-4 text-right font-black uppercase text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-850">
                        Total Sum (Terisi Sahaja):
                      </td>
                      {gradeViewMode === 'detailed' ? (
                        <>
                          {activeGradeColumns.map((col: any) => (
                            <td key={col.key} className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {gradeFooterTotals.tpTotals[col.key]?.sum || 0}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {gradeFooterTotals.avgFSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {gradeFooterTotals.stsSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {gradeFooterTotals.sasSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/60">
                            {gradeFooterTotals.grandTotalSum}
                          </td>
                          <td colSpan={3} className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-normal">
                            Akumulasi Seluruh Nilai Murid
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/60">
                            {gradeFooterTotals.grandTotalSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {gradeFooterTotals.avgFSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {gradeFooterTotals.stsSum}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {gradeFooterTotals.sasSum}
                          </td>
                          <td colSpan={4} className="py-2.5 px-3 text-center text-[10px] text-slate-400 font-normal">
                            Akumulasi Seluruh Nilai Murid
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Baris Rata-rata Kelas */}
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 text-right font-black uppercase text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-850">
                        Rata-Rata Kelas:
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
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto max-h-[94vh] overflow-y-auto print:border-none print:shadow-none print:p-0 print:max-w-none print:max-h-none print:overflow-visible">
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

                      {effectiveType === 'nilai' && selectedStudentGrade && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleStudentExcel(selectedStudentGrade)}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Download Rapor Siswa ke Format Microsoft Excel (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Download Excel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Cetak Dokumen Rapor A4"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Rapor A4</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentGrade(null)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Tutup"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* KONTEN 1: DOKUMEN CETAK A4 (RAPOR RESMI) */}
                  <div
                    id="print-rapor-container"
                    className={`${
                      raporModalTab === 'document' ? 'block' : 'hidden print:block'
                    } bg-white text-slate-900 border border-slate-300 p-6 sm:p-10 font-serif leading-relaxed max-w-[210mm] mx-auto shadow-sm rounded-xl print:border-none print:shadow-none print:p-0 print:m-0`}
                  >
                    {/* Toolbar Unduh Excel di Lembar Rapor Siap Cetak (no-print) */}
                    <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between no-print text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-semibold text-emerald-900">Format Rapor Siap Cetak A4 & Spreadsheet</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleStudentExcel(selectedStudentGrade)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        title="Download Rapor ke File Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                    </div>

                    <OfficialLetterhead namaSekolah={satuanPendidikan} />

                    {/* Judul Dokumen */}
                    <div className="text-center my-4">
                      <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-slate-950">
                        LEMBAR LAPORAN CAPAIAN HASIL BELAJAR MURID
                      </h2>
                      <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-slate-700 mt-0.5">
                        RAPOR ASESMEN FORMATIF & SUMATIF &bull; KURIKULUM MERDEKA
                      </p>
                    </div>

                    {/* Identitas Murid & Rombel */}
                    <div className="border border-black p-3 mb-4 font-sans text-[11px]">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div>
                          <table className="w-full text-left">
                            <tbody>
                              <tr>
                                <td className="w-32 py-0.5 text-slate-700">Satuan Pendidikan</td>
                                <td className="w-3 py-0.5">:</td>
                                <td className="py-0.5 font-bold text-slate-950">{satuanPendidikan}</td>
                              </tr>
                              <tr>
                                <td className="w-32 py-0.5 text-slate-700">Nama Murid</td>
                                <td className="w-3 py-0.5">:</td>
                                <td className="py-0.5 font-bold text-slate-950">{selectedStudentGrade.student.nama}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-700">NISN</td>
                                <td className="py-0.5">:</td>
                                <td className="py-0.5 font-mono">{selectedStudentGrade.student.nisn || '-'}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-700">Kelas / Rombel</td>
                                <td className="py-0.5">:</td>
                                <td className="py-0.5 font-bold text-slate-950">{data?.className}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <table className="w-full text-left">
                            <tbody>
                              <tr>
                                <td className="w-32 py-0.5 text-slate-700">Mata Pelajaran</td>
                                <td className="py-0.5">:</td>
                                <td className="py-0.5 font-bold text-slate-950">{data?.subject || 'Konsentrasi Keahlian'}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-700">Pendidik Pengampu</td>
                                <td className="py-0.5">:</td>
                                <td className="py-0.5 font-bold text-slate-950">{guruPengampu}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-700">Tahun Pelajaran</td>
                                <td className="py-0.5">:</td>
                                <td className="py-0.5">{tahunAjaran} ({semester})</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Tabel Rincian Nilai Capaian */}
                    <div className="mb-4">
                      <h3 className="font-sans font-bold text-xs uppercase mb-1.5 text-slate-900">
                        A. Capaian Asesmen Pembelajaran
                      </h3>
                      <table className="w-full border-collapse border border-black text-center text-[11px] font-sans">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-black p-2 w-8">No</th>
                            <th className="border border-black p-2 text-left">Komponen Asesmen / Indikator</th>
                            <th className="border border-black p-2 w-20">KKM / KKTP</th>
                            <th className="border border-black p-2 w-24">Nilai Capaian</th>
                            <th className="border border-black p-2 w-24">Predikat</th>
                            <th className="border border-black p-2">Keterangan Ketuntasan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeGradeColumns.map((col: any, idx: number) => {
                            const val = selectedStudentGrade.gradeRecord?.[col.key];
                            return (
                              <tr key={col.key}>
                                <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                                <td className="border border-black p-1.5 text-left font-medium">{col.label}</td>
                                <td className="border border-black p-1.5 font-mono">{data?.kkm || 75}</td>
                                <td className="border border-black p-1.5 font-mono font-bold">{typeof val === 'number' && !isNaN(val) ? val : '-'}</td>
                                <td className="border border-black p-1.5 font-semibold">{typeof val === 'number' && !isNaN(val) ? (val >= 88 ? 'A' : val >= (data?.kkm || 75) ? 'B' : 'C') : '-'}</td>
                                <td className="border border-black p-1.5">{typeof val === 'number' && !isNaN(val) ? (val >= (data?.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-'}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-50 font-bold">
                            <td className="border border-black p-1.5" colSpan={2}>Rata-Rata Asesmen Formatif</td>
                            <td className="border border-black p-1.5 font-mono">{data?.kkm || 75}</td>
                            <td className="border border-black p-1.5 font-mono">{selectedStudentGrade.avgF !== null ? selectedStudentGrade.avgF : '-'}</td>
                            <td className="border border-black p-1.5">{selectedStudentGrade.avgF !== null ? (selectedStudentGrade.avgF >= 88 ? 'A' : selectedStudentGrade.avgF >= (data?.kkm || 75) ? 'B' : 'C') : '-'}</td>
                            <td className="border border-black p-1.5">{selectedStudentGrade.avgF !== null ? (selectedStudentGrade.avgF >= (data?.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-'}</td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1.5 font-mono">{activeGradeColumns.length + 1}</td>
                            <td className="border border-black p-1.5 text-left font-medium">Asesmen Sumatif Tengah Semester (STS)</td>
                            <td className="border border-black p-1.5 font-mono">{data?.kkm || 75}</td>
                            <td className="border border-black p-1.5 font-mono font-bold">{selectedStudentGrade.sts !== null ? selectedStudentGrade.sts : '-'}</td>
                            <td className="border border-black p-1.5 font-semibold">{selectedStudentGrade.sts !== null ? (selectedStudentGrade.sts >= 88 ? 'A' : selectedStudentGrade.sts >= (data?.kkm || 75) ? 'B' : 'C') : '-'}</td>
                            <td className="border border-black p-1.5">{selectedStudentGrade.sts !== null ? (selectedStudentGrade.sts >= (data?.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-'}</td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1.5 font-mono">{activeGradeColumns.length + 2}</td>
                            <td className="border border-black p-1.5 text-left font-medium">Asesmen Sumatif Akhir Semester (SAS)</td>
                            <td className="border border-black p-1.5 font-mono">{data?.kkm || 75}</td>
                            <td className="border border-black p-1.5 font-mono font-bold">{selectedStudentGrade.sas !== null ? selectedStudentGrade.sas : '-'}</td>
                            <td className="border border-black p-1.5 font-semibold">{selectedStudentGrade.sas !== null ? (selectedStudentGrade.sas >= 88 ? 'A' : selectedStudentGrade.sas >= (data?.kkm || 75) ? 'B' : 'C') : '-'}</td>
                            <td className="border border-black p-1.5">{selectedStudentGrade.sas !== null ? (selectedStudentGrade.sas >= (data?.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-'}</td>
                          </tr>
                          <tr className="bg-slate-100 font-black text-xs">
                            <td className="border border-black p-2 text-center" colSpan={2}>NILAI AKHIR RAPOR (NA)</td>
                            <td className="border border-black p-2 font-mono">{data?.kkm || 75}</td>
                            <td className="border border-black p-2 font-mono text-sm">{selectedStudentGrade.hasAnyScore ? selectedStudentGrade.finalScore : '-'}</td>
                            <td className="border border-black p-2 text-sm">{selectedStudentGrade.predikat}</td>
                            <td className="border border-black p-2 font-bold">{selectedStudentGrade.isTuntas ? 'TUNTAS KOMPETENSI' : 'BELUM TUNTAS'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deskripsi Capaian Pembelajaran */}
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

                    {/* Kolom Tanda Tangan Resmi Dokumen */}
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
                          <p className="font-bold underline">{data?.teacher || data?.teacherName || 'Pendidik Pengampu'}</p>
                          <p className="text-[11px] text-slate-600">NBM/NIP. -</p>
                        </div>
                      </div>
                      <div className="text-center mt-6">
                        <p className="font-semibold">Mengetahui,</p>
                        <p className="font-semibold">Kepala SMK Muhammadiyah Bawang</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline">( .................................................... )</p>
                        <p className="text-[11px] text-slate-600">NBM / NIP. ........................................</p>
                      </div>
                    </div>
                  </div>

                  {/* KONTEN 2: RINGKASAN KARTU (CARD VIEW) */}
                  {raporModalTab === 'card' && (
                    <div className="space-y-4 no-print">
                      {/* Student Identity Box */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Identitas Murid
                        </span>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {selectedStudentGrade.student.nama}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5 font-mono">
                          <span>NISN: {selectedStudentGrade.student.nisn || '-'}</span>
                          <span>Pendidik: {data?.teacher || data?.teacherName || 'Pendidik Pengampu'}</span>
                        </div>
                      </div>

                      {/* Rincian Asesmen Individu */}
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

                      {/* Hasil Akhir & Status KKM */}
                      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4.5 rounded-2xl flex items-center justify-between shadow-lg border border-indigo-400/30">
                        <div>
                          <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider block">
                            Nilai Akhir Rapor (Kurikulum Merdeka)
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-black font-mono drop-shadow-xs">
                              {selectedStudentGrade.hasAnyScore ? selectedStudentGrade.finalScore : '-'}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-mono font-bold border border-white/25 shadow-2xs backdrop-blur-xs">
                              Predikat: {selectedStudentGrade.predikat} &bull; {selectedStudentGrade.predikatLabel || (selectedStudentGrade.predikat === 'A' ? 'Sangat Baik' : selectedStudentGrade.predikat === 'B' ? 'Baik' : selectedStudentGrade.predikat === 'C' ? 'Cukup' : 'Perlu Bimbingan')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-wider block mb-1">
                            Status Ketuntasan (KKM: {data?.kkm || 75})
                          </span>
                          {!selectedStudentGrade.hasAnyScore ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/25">
                              Belum Ada Nilai
                            </span>
                          ) : selectedStudentGrade.isTuntas ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-400 text-emerald-950 shadow-xs border border-emerald-300">
                              Tuntas Capaian
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-400 text-rose-950 shadow-xs border border-rose-300">
                              Perlu Bimbingan / Remedial
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Deskripsi Otomatis Capaian Kompetensi Kurikulum Merdeka */}
                      <div className="bg-indigo-50/70 dark:bg-zinc-900 p-4 rounded-2xl border border-indigo-100 dark:border-zinc-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider block">
                          Deskripsi Capaian Kompetensi
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {selectedStudentGrade.gradeRecord?.catatan || selectedStudentGrade.merdekaDeskripsi || 'Belum ada catatan capaian kompetensi.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 no-print">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Rapor Murid (A4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentGrade(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. TYPE TABUNGAN & KAS */}
        {effectiveType === 'tabungan' && (
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
                  Saldo Tabungan Mandiri Murid
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <th
                        onClick={() => setSortOrder('no')}
                        className="py-3 px-3 text-center w-12 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none"
                        title="Klik untuk sortir nomor urut"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>No</span>
                          {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                        className="py-3 px-4 min-w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none"
                        title="Klik untuk sortir nama alfabetis (A-Z / Z-A)"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Nama Murid</span>
                          {sortOrder === 'name-asc' ? (
                            <span className="flex items-center text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                              <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                            </span>
                          ) : sortOrder === 'name-desc' ? (
                            <span className="flex items-center text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                              <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                            </span>
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right min-w-[150px]">Saldo Tabungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedStudents.map((std: any, idx: number) => (
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
        {effectiveType === 'agenda' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Rekam Jejak Agenda Mengajar Pendidik
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
        </div>
      )}

      {/* 2. DOKUMEN CETAK RESMI A4 (SESUAI STANDAR SMK MUHAMMADIYAH BAWANG) */}
      <div
        id="public-document-view"
        className={`${
          isDocumentViewMode ? 'block' : 'hidden print:block'
        } bg-white text-black border border-slate-300 p-6 sm:p-10 font-serif leading-relaxed max-w-[210mm] mx-auto shadow-sm rounded-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs`}
      >
        {/* Kop Surat Resmi Dokumen Siap Cetak (Serupa dengan Agenda Mengajar) */}
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
            {effectiveType === 'absen' && absenViewMode === 'latest' && currentSession
              ? `Pertemuan Ke-${currentSession.pertemuanKe} • Tanggal: ${formatIndonesianDate(currentSession.tanggal)}`
              : `Kurikulum Merdeka • Tahun Pelajaran ${tahunAjaran} (${semester})`}
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
                  {effectiveType === 'absen' && currentSession && (
                    <tr>
                      <td className="py-0.5 text-black">Materi / Topik</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 text-black">{currentSession.topikMateri || 'Kegiatan Belajar Mengajar'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* KONTEN TABEL RESMI BERDASARKAN TIPE */}
        {/* 1. Tipe Absensi Sesi Terakhir */}
        {effectiveType === 'absen' && absenViewMode === 'latest' && currentSession && (
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

        {/* 2. Tipe Absensi Rekapitulasi Kumulatif */}
        {effectiveType === 'absen' && absenViewMode === 'recap' && (
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

        {/* 3. Tipe Nilai (Leger Nilai Asesmen) */}
        {effectiveType === 'nilai' && (
          <div className="mb-4">
            {/* Toolbar Download File Excel Dokumen Siap Cetak (no-print) */}
            <div className="mb-3.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-slate-900 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-emerald-950">Dokumen Siap Cetak Leger Nilai & Asesmen</p>
                  <p className="text-[11px] text-emerald-800">
                    Unduh lembar nilai ini dalam format file Microsoft Excel (.xlsx) resmi dengan data terstruktur lengkap.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadGradesExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download File Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File Excel (.xlsx)</span>
              </button>
            </div>

            <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-1.5 w-7">No</th>
                  <th className="border border-black p-1.5 w-24">NISN</th>
                  <th className="border border-black p-1.5 text-left">Nama Peserta Didik</th>
                  {activeGradeColumns.map((c: any, i: number) => (
                    <th key={c.key} className="border border-black p-1.5 w-12" title={c.label}>
                      F{i + 1}
                    </th>
                  ))}
                  <th className="border border-black p-1.5 w-12 font-bold">Rata F</th>
                  <th className="border border-black p-1.5 w-12 font-bold">STS</th>
                  <th className="border border-black p-1.5 w-12 font-bold">SAS</th>
                  <th className="border border-black p-1.5 w-14 font-black">NA</th>
                  <th className="border border-black p-1.5 w-12 font-bold">Pred</th>
                  <th className="border border-black p-1.5 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {computedGrades.map((g: any, idx: number) => (
                  <tr key={g.student.id} className="hover:bg-slate-50">
                    <td className="border border-black p-1 font-mono">{idx + 1}</td>
                    <td className="border border-black p-1 font-mono">{g.student.nisn || '-'}</td>
                    <td className="border border-black p-1 text-left font-medium">{g.student.nama}</td>
                    {activeGradeColumns.map((col: any) => {
                      const val = g.gradeRecord?.[col.key];
                      return (
                        <td key={col.key} className="border border-black p-1 font-mono">
                          {typeof val === 'number' && !isNaN(val) ? val : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-black p-1 font-mono font-semibold">{g.avgF !== null ? g.avgF : '-'}</td>
                    <td className="border border-black p-1 font-mono font-semibold">{g.sts !== null ? g.sts : '-'}</td>
                    <td className="border border-black p-1 font-mono font-semibold">{g.sas !== null ? g.sas : '-'}</td>
                    <td className="border border-black p-1 font-mono font-bold">{g.hasAnyScore ? g.finalScore : '-'}</td>
                    <td className="border border-black p-1 font-semibold">{g.predikat}</td>
                    <td className="border border-black p-1 font-medium">{g.isTuntas ? 'TUNTAS' : 'REMEDIAL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Tipe Agenda */}
        {effectiveType === 'agenda' && (
          <div className="mb-4">
            <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-1.5 w-7">No</th>
                  <th className="border border-black p-1.5 w-24">Hari / Tanggal</th>
                  <th className="border border-black p-1.5 w-16">Jam Ke</th>
                  <th className="border border-black p-1.5 text-left">Materi Pokok & Capaian Pembelajaran</th>
                  <th className="border border-black p-1.5 w-16">Hadir</th>
                  <th className="border border-black p-1.5 w-16">Absen</th>
                  <th className="border border-black p-1.5 w-16">Paraf</th>
                </tr>
              </thead>
              <tbody>
                {(data?.agendas || []).map((ag: any, idx: number) => (
                  <tr key={ag.id || idx}>
                    <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                    <td className="border border-black p-1.5 text-left">{ag.hari}, {ag.tanggal}</td>
                    <td className="border border-black p-1.5 font-mono">{ag.jamKe}</td>
                    <td className="border border-black p-1.5 text-left">
                      <p className="font-semibold">{ag.materiAjar}</p>
                      {ag.kegiatan && <p className="text-[9px] text-slate-600">{ag.kegiatan}</p>}
                    </td>
                    <td className="border border-black p-1.5 font-mono">{ag.hadirCount ?? 0}</td>
                    <td className="border border-black p-1.5 font-mono">{ag.tidakHadirCount ?? 0}</td>
                    <td className="border border-black p-1.5 font-mono text-[9px]">&#10003;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Tipe Tabungan & Kas */}
        {effectiveType === 'tabungan' && (
          <div className="mb-4">
            <table className="w-full border-collapse border border-black text-center text-[11px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-2 w-8">No</th>
                  <th className="border border-black p-2 text-left">Nama Peserta Didik</th>
                  <th className="border border-black p-2 w-40 text-right">Saldo Tabungan (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((std: any, idx: number) => (
                  <tr key={std.id}>
                    <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                    <td className="border border-black p-1.5 text-left font-medium">{std.nama}</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(std.saldo || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tanda Tangan Resmi Dokumen Terintegrasi Profil Guru Cloud */}
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
                {nipKepala
                  ? `NIP. ${nipKepala}`
                  : nbmKepala
                  ? `NBM. ${nbmKepala}`
                  : 'NBM / NIP. ........................................'}
              </p>
            </div>
            <div>
              <p className="font-semibold">Pendidik Pengampu Mata Pelajaran,</p>
              <p className="text-slate-600">{data?.subject || 'Guru Pengampu'}</p>
              <div className="h-20 flex items-end justify-center">
                <p className="font-bold underline">{guruPengampu}</p>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                {nbmGuru || nipGuru ? `NBM / NIP: ${nbmGuru || nipGuru}` : 'NBM / NIP. -'}
              </p>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* Official Footer matching Header Color Identity - No Opacity */}
      <footer className="text-center py-8 mt-10 border-t border-[#008276] bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <p className="font-black text-sm text-white uppercase tracking-wider">
            &copy; {SCHOOL_CONFIG.namaSekolah} &bull; BATANG, JAWA TENGAH
          </p>
          <p className="text-xs font-semibold text-white">
            {SCHOOL_CONFIG.alamat} &bull; Portal Resmi:{' '}
            <a href={SCHOOL_CONFIG.websiteUrl} target="_blank" rel="noreferrer" className="text-white underline decoration-white font-bold hover:text-white hover:decoration-white transition">
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

      {/* Floating Animated Smooth Scroll To Top Button with Circular Progress */}
      <SmoothScrollToTop showPercent threshold={200} />

      {/* Toast Notifikasi Download File Excel Selesai */}
      <ExcelDownloadToast />
    </div>
  );
};
