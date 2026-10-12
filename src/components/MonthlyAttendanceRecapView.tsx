import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Filter,
  FileSpreadsheet,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Building,
  GraduationCap,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  Flame,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceSession, ClassRoom, Student, TeacherProfile, AttendanceStatus } from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { SmoothHorizontalScroller } from './SmoothHorizontalScroller';
import { OfficialLetterhead } from './OfficialLetterhead';
import { saveExcelFileWithNotification } from '../utils/exportUtils';
import { resequenceStudentsAlphabetically } from '../services/data';

interface MonthlyAttendanceRecapViewProps {
  currentClass: ClassRoom;
  classes: ClassRoom[];
  students: Student[];
  sessions: AttendanceSession[];
  teacher: TeacherProfile;
}

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MonthlyAttendanceRecapView: React.FC<MonthlyAttendanceRecapViewProps> = ({
  currentClass,
  classes,
  students,
  sessions,
  teacher,
}) => {
  const currentDate = new Date();
  const currentMonthIdx = currentDate.getMonth();
  const [startMonth, setStartMonth] = useState<number>(currentMonthIdx); // 0-11
  const [endMonth, setEndMonth] = useState<number>(currentMonthIdx); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClass.id || 'all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'no' | 'name-asc' | 'name-desc'>('name-asc');

  const currentPresetMode = useMemo(() => {
    const minM = Math.min(startMonth, endMonth);
    const maxM = Math.max(startMonth, endMonth);
    if (minM === currentMonthIdx && maxM === currentMonthIdx) return 'this_month';
    if (minM === 0 && maxM === 2) return 'q1';
    if (minM === 3 && maxM === 5) return 'q2';
    if (minM === 6 && maxM === 8) return 'q3';
    if (minM === 9 && maxM === 11) return 'q4';
    const last3Start = Math.max(0, currentMonthIdx - 2);
    if (minM === last3Start && maxM === currentMonthIdx && currentMonthIdx >= 2) return 'last_3_months';
    if (minM === 6 && maxM === 11) return 'sem_gasal';
    if (minM === 0 && maxM === 5) return 'sem_genap';
    if (minM === 0 && maxM === 11) return 'full_year';
    return 'custom';
  }, [startMonth, endMonth, currentMonthIdx]);

  const handlePeriodSelect = (mode: string) => {
    if (mode === 'this_month') {
      setStartMonth(currentMonthIdx);
      setEndMonth(currentMonthIdx);
    } else if (mode === 'q1') {
      setStartMonth(0);
      setEndMonth(2);
    } else if (mode === 'q2') {
      setStartMonth(3);
      setEndMonth(5);
    } else if (mode === 'q3') {
      setStartMonth(6);
      setEndMonth(8);
    } else if (mode === 'q4') {
      setStartMonth(9);
      setEndMonth(11);
    } else if (mode === 'last_3_months') {
      setStartMonth(Math.max(0, currentMonthIdx - 2));
      setEndMonth(currentMonthIdx);
    } else if (mode === 'sem_gasal') {
      setStartMonth(6);
      setEndMonth(11);
    } else if (mode === 'sem_genap') {
      setStartMonth(0);
      setEndMonth(5);
    } else if (mode === 'full_year') {
      setStartMonth(0);
      setEndMonth(11);
    }
  };

  // Filter sessions by month range (startMonth s.d. endMonth) and year
  const filteredSessions = useMemo(() => {
    const minM = Math.min(startMonth, endMonth);
    const maxM = Math.max(startMonth, endMonth);
    return sessions.filter((s) => {
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
      if (!s.tanggal) return false;
      const d = new Date(s.tanggal);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== selectedYear) return false;
      const m = d.getMonth();
      if (m < minM || m > maxM) return false;
      return true;
    });
  }, [sessions, selectedClassId, selectedYear, startMonth, endMonth]);

  // Students to display
  const targetStudents = useMemo(() => {
    let list = resequenceStudentsAlphabetically(students, selectedClassId !== 'all' ? selectedClassId : undefined);
    if (selectedClassId !== 'all') {
      list = list.filter((std) => std.classId === selectedClassId);
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter(
        (std) => std.nama.toLowerCase().includes(q) || (std.nisn || '').includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      }
      if (sortOrder === 'name-desc') {
        return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
      }
      return a.no - b.no;
    });
  }, [students, selectedClassId, studentSearch, sortOrder]);

  // Map students recap
  const studentRecap = useMemo(() => {
    const totalSessions = filteredSessions.length;

    return targetStudents.map((std, idx) => {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alpa = 0;
      let dispen = 0;

      filteredSessions.forEach((sess) => {
        const rec = sess.records?.[std.id];
        const st = rec?.status;
        if (st === 'H') hadir++;
        else if (st === 'I') izin++;
        else if (st === 'S') sakit++;
        else if (st === 'A') alpa++;
        else if (st === 'D') dispen++;
      });

      // Persentase kehadiran: (Hadir + Dispen) / total sesi * 100
      const totalPerekaman = hadir + izin + sakit + alpa + dispen;
      const basisHitung = totalSessions > 0 ? totalSessions : (totalPerekaman || 1);
      const persentase = totalSessions > 0
        ? Math.round(((hadir + dispen) / totalSessions) * 100)
        : 100;

      const cls = classes.find((c) => c.id === std.classId);

      return {
        noUrut: idx + 1,
        student: std,
        className: cls ? cls.namaKelas : currentClass.namaKelas,
        hadir,
        izin,
        sakit,
        alpa,
        dispen,
        totalPerekaman,
        persentase,
      };
    }).filter((item) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'H') return item.hadir > 0;
      if (statusFilter === 'I') return item.izin > 0;
      if (statusFilter === 'S') return item.sakit > 0;
      if (statusFilter === 'A') return item.alpa > 0;
      if (statusFilter === 'D') return item.dispen > 0;
      if (statusFilter === 'kritis') return item.persentase < 75;
      return true;
    });
  }, [targetStudents, filteredSessions, classes, currentClass, statusFilter]);

  // Overall statistics
  const summaryStats = useMemo(() => {
    const totalSesi = filteredSessions.length;
    let sumH = 0, sumI = 0, sumS = 0, sumA = 0, sumD = 0;

    studentRecap.forEach((r) => {
      sumH += r.hadir;
      sumI += r.izin;
      sumS += r.sakit;
      sumA += r.alpa;
      sumD += r.dispen;
    });

    const totalEntries = sumH + sumI + sumS + sumA + sumD;
    const avgPersen = studentRecap.length > 0
      ? Math.round(studentRecap.reduce((acc, c) => acc + c.persentase, 0) / studentRecap.length)
      : 100;

    return {
      totalSesi,
      totalSiswa: studentRecap.length,
      sumH,
      sumI,
      sumS,
      sumA,
      sumD,
      totalEntries,
      avgPersen,
    };
  }, [filteredSessions, studentRecap]);

  const minMonth = Math.min(startMonth, endMonth);
  const maxMonth = Math.max(startMonth, endMonth);
  const isThreeMonths = maxMonth - minMonth === 2;

  let quarterName = '';
  if (minMonth === 0 && maxMonth === 2) quarterName = 'Triwulan 1';
  else if (minMonth === 3 && maxMonth === 5) quarterName = 'Triwulan 2';
  else if (minMonth === 6 && maxMonth === 8) quarterName = 'Triwulan 3';
  else if (minMonth === 9 && maxMonth === 11) quarterName = 'Triwulan 4';
  else if (isThreeMonths) quarterName = 'Rekap 3 Bulan';

  const monthLabel = minMonth === maxMonth
    ? NAMA_BULAN[minMonth]
    : isThreeMonths
    ? `${quarterName ? quarterName + ' (' : 'Rekap 3 Bulan ('}${NAMA_BULAN[minMonth]} - ${NAMA_BULAN[maxMonth]})`
    : `${NAMA_BULAN[minMonth]} s.d. ${NAMA_BULAN[maxMonth]}`;

  const safeMonthFileLabel = minMonth === maxMonth
    ? NAMA_BULAN[minMonth]
    : isThreeMonths
    ? `3_Bulan_${quarterName.replace(/\s+/g, '_')}_${NAMA_BULAN[minMonth]}_sd_${NAMA_BULAN[maxMonth]}`
    : `${NAMA_BULAN[minMonth]}_sd_${NAMA_BULAN[maxMonth]}`;

  const activeClassObj = classes.find((c) => c.id === selectedClassId);
  const classLabel = selectedClassId === 'all' ? 'Seluruh Rombel' : (activeClassObj?.namaKelas || currentClass.namaKelas);

  // Export to Excel
  const handleExportExcel = () => {
    const dataRows = studentRecap.map((r) => ({
      No: r.noUrut,
      NISN: r.student.nisn,
      'Nama Murid': r.student.nama,
      'L/P': r.student.gender,
      Kelas: r.className,
      'Hadir (H)': r.hadir,
      'Izin (I)': r.izin,
      'Sakit (S)': r.sakit,
      'Alpa (A)': r.alpa,
      'Dispen (D)': r.dispen,
      'Persentase Kehadiran': `${r.persentase}%`,
      Keterangan: r.persentase >= 85 ? 'Sangat Baik' : r.persentase >= 75 ? 'Cukup' : 'Perhatian Khusus',
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');

    // Add info header metadata with explicit 3-month recap title if active
    const reportTitle = isThreeMonths
      ? `REKAPITULASI PRESENSI MURID 3 BULAN SEKALI (${quarterName ? quarterName.toUpperCase() : 'TRIWULAN'}) - ${SCHOOL_CONFIG.namaSekolah.toUpperCase()}`
      : `REKAPITULASI PRESENSI MURID - ${SCHOOL_CONFIG.namaSekolah.toUpperCase()}`;

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [reportTitle],
        [`Periode: ${monthLabel} ${selectedYear} | Rombel: ${classLabel}`],
        [`Pendidik Pengampu: ${teacher.namaGuru} (NBM/NIP: ${teacher.nbm || teacher.nip || '-'})`],
        [`Website: ${SCHOOL_CONFIG.website} | Alamat: ${SCHOOL_CONFIG.alamat}`],
        [],
      ],
      { origin: 'A1' }
    );

    // Re-add json after headers
    XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A6' });

    const filePrefix = isThreeMonths ? 'Rekap_3_Bulan_Presensi' : 'Rekap_Presensi';
    saveExcelFileWithNotification(
      wb,
      `${filePrefix}_${classLabel.replace(/\s+/g, '_')}_${safeMonthFileLabel}_${selectedYear}.xlsx`,
      `${isThreeMonths ? 'Rekap 3 Bulan Presensi' : 'Rekap Presensi'} - ${classLabel} (${monthLabel} ${selectedYear})`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Official Letterhead & Document Header (A4 Ready) */}
      <div className="hidden print:block mb-4 text-black font-serif">
        <OfficialLetterhead namaSekolah={teacher.namaSekolah} />
        <div className="text-center my-3">
          <h2 className="text-sm font-bold uppercase tracking-wider underline">
            {isThreeMonths
              ? `REKAPITULASI PRESENSI / KEHADIRAN PESERTA DIDIK (REKAP 3 BULAN SEKALI / ${quarterName ? quarterName.toUpperCase() : 'TRIWULAN'})`
              : 'REKAPITULASI PRESENSI / KEHADIRAN PESERTA DIDIK BULANAN'}
          </h2>
          <p className="text-[11px] font-sans mt-0.5 font-medium text-slate-700">
            Tahun Pelajaran {teacher.tahunAjaran || SCHOOL_CONFIG.tahunAjaran} &bull; Semester {teacher.semester || SCHOOL_CONFIG.semester}
          </p>
        </div>

        {/* Info Identitas Dokumen Resmi */}
        <div className="border border-black p-2.5 mb-3 text-[11px] font-sans">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="space-y-0.5">
              <p><span className="inline-block w-28 text-slate-700">Satuan Pendidikan:</span> <strong>{teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah}</strong></p>
              <p><span className="inline-block w-28 text-slate-700">Kelas / Rombel:</span> <strong>{classLabel}</strong></p>
              <p><span className="inline-block w-28 text-slate-700">Bulan / Periode:</span> <strong>{monthLabel} {selectedYear}</strong></p>
            </div>
            <div className="space-y-0.5">
              <p><span className="inline-block w-28 text-slate-700">Mata Pelajaran:</span> <strong>{currentClass?.mataPelajaran || teacher.mataPelajaranUtama || 'Seluruh Mata Pelajaran'}</strong></p>
              <p><span className="inline-block w-28 text-slate-700">Pendidik Pengampu:</span> <strong>{teacher.namaGuru}</strong></p>
              <p><span className="inline-block w-28 text-slate-700">NBM / NIP:</span> {teacher.nbm || teacher.nip || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full">
              {classLabel}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Periode {monthLabel} {selectedYear}
            </span>
            {isThreeMonths && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Pilihan Rekap 3 Bulan Sekali ({quarterName})
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            {isThreeMonths ? 'Rekapitulasi Presensi 3 Bulan Sekali (Triwulan)' : 'Rekapitulasi Absensi Bulanan'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {SCHOOL_CONFIG.namaSekolah} &bull; Website: {SCHOOL_CONFIG.website} &bull; Pendidik: {teacher.namaGuru}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Ekspor Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            Cetak Rekap
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 no-print">
        {/* Preset Cepat Periode Rekapitulasi */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter & Periode Rekapitulasi
            </div>
            {isThreeMonths && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 self-start sm:self-auto">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Pilihan Rekap 3 Bulan Sekali Aktif ({quarterName})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 mr-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Pilihan Rekap 3 Bulan:
            </span>
            <button
              type="button"
              onClick={() => handlePeriodSelect('q1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentPresetMode === 'q1'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
              }`}
            >
              <span>Triwulan 1</span>
              <span className="text-[10px] opacity-80">(Jan - Mar)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('q2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentPresetMode === 'q2'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
              }`}
            >
              <span>Triwulan 2</span>
              <span className="text-[10px] opacity-80">(Apr - Jun)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('q3')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentPresetMode === 'q3'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
              }`}
            >
              <span>Triwulan 3</span>
              <span className="text-[10px] opacity-80">(Jul - Sep)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('q4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentPresetMode === 'q4'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
              }`}
            >
              <span>Triwulan 4</span>
              <span className="text-[10px] opacity-80">(Okt - Des)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('last_3_months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentPresetMode === 'last_3_months'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80'
              }`}
            >
              <span>3 Bulan Terakhir</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

            <span className="text-[11px] font-bold text-slate-400 mr-0.5">Lainnya:</span>
            <button
              type="button"
              onClick={() => handlePeriodSelect('this_month')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                currentPresetMode === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('sem_gasal')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                currentPresetMode === 'sem_gasal'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Gasal (Jul-Des)
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('sem_genap')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                currentPresetMode === 'sem_genap'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Genap (Jan-Jun)
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect('full_year')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                currentPresetMode === 'full_year'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              1 Tahun
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {/* Pilihan Rekap 3 Bulan Sekali (Triwulan) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase mb-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Pilihan Rekap 3 Bulan Sekali
            </label>
            <select
              value={currentPresetMode}
              onChange={(e) => handlePeriodSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              <option value="custom">Pilih Bebas / Kustom (Bulan Mulai & Akhir)</option>
              <option value="q1">🔥 Rekap 3 Bulan: Triwulan I (Januari - Maret)</option>
              <option value="q2">🔥 Rekap 3 Bulan: Triwulan II (April - Juni)</option>
              <option value="q3">🔥 Rekap 3 Bulan: Triwulan III (Juli - September)</option>
              <option value="q4">🔥 Rekap 3 Bulan: Triwulan IV (Oktober - Desember)</option>
              <option value="last_3_months">🔥 Rekap 3 Bulan: 3 Bulan Terakhir (Berjalan)</option>
              <option value="this_month">Rekap 1 Bulan: Bulan Ini</option>
              <option value="sem_gasal">Semester Gasal (Juli - Desember)</option>
              <option value="sem_genap">Semester Genap (Januari - Juni)</option>
              <option value="full_year">1 Tahun Penuh (Januari - Desember)</option>
            </select>
          </div>

          {/* Bulan Mulai */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Bulan Mulai
            </label>
            <select
              value={startMonth}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartMonth(val);
                if (val > endMonth) setEndMonth(val);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {NAMA_BULAN.map((bln, idx) => (
                <option key={bln} value={idx}>
                  {bln}
                </option>
              ))}
            </select>
          </div>

          {/* Bulan Akhir */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Bulan Akhir
            </label>
            <select
              value={endMonth}
              onChange={(e) => {
                const val = Number(e.target.value);
                setEndMonth(val);
                if (val < startMonth) setStartMonth(val);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {NAMA_BULAN.map((bln, idx) => (
                <option key={bln} value={idx}>
                  {bln}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Rombel / Kelas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Kelas / Rombel
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kelas ({classes.length} Rombel)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.namaKelas} - {c.mataPelajaran}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Status Presensi
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="H">Pernah Hadir</option>
              <option value="I">Pernah Izin</option>
              <option value="S">Pernah Sakit</option>
              <option value="A">Pernah Alpa</option>
              <option value="D">Pernah Dispensasi</option>
              <option value="kritis">Kehadiran Rendah (&lt;75%)</option>
            </select>
          </div>
        </div>

        {/* Baris Pencarian & Pengurutan Murid */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Cari & Sortir Murid
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik nama atau NISN murid..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOrder('no')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    sortOrder === 'no' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title="Urutkan Nomor Urut"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('name-asc')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sortOrder === 'name-asc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title="Urutkan Abjad A-Z"
                >
                  <ArrowUpAZ className="w-3.5 h-3.5" />
                  <span>A-Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('name-desc')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sortOrder === 'name-desc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title="Urutkan Abjad Z-A"
                >
                  <ArrowDownZA className="w-3.5 h-3.5" />
                  <span>Z-A</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 no-print">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sesi</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{summaryStats.totalSesi}</p>
          <span className="text-[10px] text-slate-400">pertemuan</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Rata-Rata</span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{summaryStats.avgPersen}%</p>
          <span className="text-[10px] text-slate-400">kehadiran</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Hadir (H)</span>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono mt-0.5">{summaryStats.sumH}</p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400">kali hadir</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Sakit (S)</span>
          <p className="text-xl font-black text-blue-800 dark:text-blue-200 font-mono mt-0.5">{summaryStats.sumS}</p>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400">kali sakit</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Izin (I)</span>
          <p className="text-xl font-black text-amber-800 dark:text-amber-200 font-mono mt-0.5">{summaryStats.sumI}</p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400">kali izin</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Alpa (A)</span>
          <p className="text-xl font-black text-rose-800 dark:text-rose-200 font-mono mt-0.5">{summaryStats.sumA}</p>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400">tanpa keterangan</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Dispen (D)</span>
          <p className="text-xl font-black text-purple-800 dark:text-purple-200 font-mono mt-0.5">{summaryStats.sumD}</p>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400">dispensasi resmi</span>
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="p-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-100" />
            <h3 className="font-bold text-white text-sm">
              Daftar Rekap Kehadiran Murid ({studentRecap.length} Murid)
            </h3>
          </div>
          <span className="text-xs text-emerald-100 font-mono">
            Sumber Data: Cloud PostgreSQL Supabase
          </span>
        </div>

        {studentRecap.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold">Tidak ada data rekap absensi pada filter yang dipilih.</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba ganti pilihan bulan, tahun, atau kelas pada bilah filter di atas.
            </p>
          </div>
        ) : (
          <SmoothHorizontalScroller label="Tabel Rekap">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                  <th
                    onClick={() => setSortOrder('no')}
                    className="py-3 px-3 text-center w-12 text-white cursor-pointer hover:bg-white/10 select-none transition"
                    title="Klik untuk sortir nomor urut"
                  >
                    No
                  </th>
                  <th className="py-3 px-3 w-28 text-white">NISN</th>
                  <th
                    onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                    className="py-3 px-3 min-w-[200px] text-white cursor-pointer hover:bg-white/10 select-none transition"
                    title="Klik untuk sortir alfabetis A-Z / Z-A"
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
                        <ArrowUpDown className="w-3 h-3 text-white/70" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-12 text-white">L/P</th>
                  <th className="py-3 px-3 min-w-[120px] text-white">Kelas</th>
                  <th className="py-3 px-3 text-center bg-white/10 text-white w-16">
                    Hadir
                  </th>
                  <th className="py-3 px-3 text-center bg-white/10 text-white w-16">
                    Sakit
                  </th>
                  <th className="py-3 px-3 text-center bg-white/10 text-white w-16">
                    Izin
                  </th>
                  <th className="py-3 px-3 text-center bg-white/10 text-white w-16">
                    Alpa
                  </th>
                  <th className="py-3 px-3 text-center bg-white/10 text-white w-16">
                    Dispen
                  </th>
                  <th className="py-3 px-3 text-center w-24 text-white">Persentase</th>
                  <th className="py-3 px-3 text-center w-32 text-white">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRecap.map((r, idx) => {
                  const isWarning = r.persentase < 75;
                  return (
                    <tr
                      key={r.student.id}
                      className={`transition ${
                        idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-emerald-50/20'
                      } hover:bg-emerald-50/50`}
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        {r.noUrut}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {r.student.nisn || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {r.student.nama}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">
                        {r.student.gender}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {r.className}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20">
                        {r.hadir}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/20">
                        {r.sakit}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50/20">
                        {r.izin}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50/20">
                        {r.alpa}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50/20">
                        {r.dispen}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                            r.persentase >= 85
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : r.persentase >= 75
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {r.persentase}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-[11px]">
                        {r.persentase >= 85 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sangat Baik
                          </span>
                        ) : r.persentase >= 75 ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            Cukup Baik
                          </span>
                        ) : (
                          <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Perlu Perhatian
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SmoothHorizontalScroller>
        )}

        {/* Print-Only Formal Signature Block */}
        <div className="hidden print:block mt-8 font-sans text-xs text-black">
          <div className="flex justify-end mb-4">
            <p>Bawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="font-semibold">Mengetahui,</p>
              <p className="font-semibold">Kepala {teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah}</p>
              <div className="h-20 flex items-end justify-center">
                <p className="font-bold underline">
                  {teacher.namaKepalaSekolah ? teacher.namaKepalaSekolah : '( .................................................... )'}
                </p>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                {teacher.nipKepalaSekolah
                  ? `NIP. ${teacher.nipKepalaSekolah}`
                  : teacher.nbmKepalaSekolah
                  ? `NBM. ${teacher.nbmKepalaSekolah}`
                  : 'NBM / NIP. ........................................'}
              </p>
            </div>
            <div>
              <p className="font-semibold">Pendidik Pengampu Mata Pelajaran,</p>
              <div className="h-20 flex items-end justify-center">
                <p className="font-bold underline">{teacher.namaGuru}</p>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                NBM / NIP: {teacher.nbm || teacher.nip || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
