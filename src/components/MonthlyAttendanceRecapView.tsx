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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceSession, ClassRoom, Student, TeacherProfile, AttendanceStatus } from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

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
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11, or -1 for All
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClass.id || 'all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter sessions by month and year
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
      if (!s.tanggal) return false;
      const d = new Date(s.tanggal);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== -1 && d.getMonth() !== selectedMonth) return false;
      return true;
    });
  }, [sessions, selectedClassId, selectedYear, selectedMonth]);

  // Students to display
  const targetStudents = useMemo(() => {
    let list = students;
    if (selectedClassId !== 'all') {
      list = list.filter((std) => std.classId === selectedClassId);
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter(
        (std) => std.nama.toLowerCase().includes(q) || std.nisn.includes(q)
      );
    }
    return [...list].sort((a, b) => a.no - b.no);
  }, [students, selectedClassId, studentSearch]);

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

  const monthLabel = selectedMonth === -1 ? 'Seluruh Bulan' : NAMA_BULAN[selectedMonth];
  const activeClassObj = classes.find((c) => c.id === selectedClassId);
  const classLabel = selectedClassId === 'all' ? 'Seluruh Rombel' : (activeClassObj?.namaKelas || currentClass.namaKelas);

  // Export to Excel
  const handleExportExcel = () => {
    const dataRows = studentRecap.map((r) => ({
      No: r.noUrut,
      NISN: r.student.nisn,
      'Nama Siswa': r.student.nama,
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

    // Add info header metadata
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [`REKAPITULASI PRESENSI SISWA - ${SCHOOL_CONFIG.namaSekolah.toUpperCase()}`],
        [`Periode: ${monthLabel} ${selectedYear} | Rombel: ${classLabel}`],
        [`Guru Pengampu: ${teacher.namaGuru} (NBM/NIP: ${teacher.nbm || teacher.nip || '-'})`],
        [`Website: ${SCHOOL_CONFIG.website} | Alamat: ${SCHOOL_CONFIG.alamat}`],
        [],
      ],
      { origin: 'A1' }
    );

    // Re-add json after headers
    XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A6' });

    XLSX.writeFile(
      wb,
      `Rekap_Presensi_${classLabel.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full">
              {classLabel}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Periode {monthLabel} {selectedYear}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Rekapitulasi Absensi Bulanan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {SCHOOL_CONFIG.namaSekolah} &bull; Website: {SCHOOL_CONFIG.website} &bull; Guru: {teacher.namaGuru}
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          Filter Rekapitulasi Presensi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Bulan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={-1}>Seluruh Bulan</option>
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

          {/* Cari Siswa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nama / NISN..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Daftar Rekap Kehadiran Peserta Didik ({studentRecap.length} Siswa)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3 w-28">NISN</th>
                  <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                  <th className="py-3 px-3 text-center w-12">L/P</th>
                  <th className="py-3 px-3 min-w-[120px]">Kelas</th>
                  <th className="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 w-16">
                    Hadir
                  </th>
                  <th className="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 w-16">
                    Sakit
                  </th>
                  <th className="py-3 px-3 text-center bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 w-16">
                    Izin
                  </th>
                  <th className="py-3 px-3 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 w-16">
                    Alpa
                  </th>
                  <th className="py-3 px-3 text-center bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 w-16">
                    Dispen
                  </th>
                  <th className="py-3 px-3 text-center w-24">Persentase</th>
                  <th className="py-3 px-3 text-center w-32">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentRecap.map((r) => {
                  const isWarning = r.persentase < 75;
                  return (
                    <tr
                      key={r.student.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        {r.noUrut}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {r.student.nisn || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">
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
          </div>
        )}
      </div>
    </div>
  );
};
