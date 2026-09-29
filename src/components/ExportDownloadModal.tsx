import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, Database, CheckCircle2 } from 'lucide-react';
import {
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  TeachingAgenda,
  SavingTransaction,
  TeacherProfile,
} from '../types';
import {
  downloadDataBackupJSON,
  exportStudentsToExcel,
  exportMonthlyRecapToExcel,
  exportMonthlyRecapToPDF,
  exportGradesToExcel,
  exportGradesToPDF,
  exportAgendasToExcel,
  exportSavingsToExcel,
} from '../utils/exportUtils';
import { DEFAULT_GRADE_COLUMNS } from '../utils/storage';

interface ExportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: ClassRoom | null;
  classes: ClassRoom[];
  students: Student[];
  sessions: AttendanceSession[];
  grades: StudentGrade[];
  agendas: TeachingAgenda[];
  savings: SavingTransaction[];
  teacher: TeacherProfile;
}

export const ExportDownloadModal: React.FC<ExportDownloadModalProps> = ({
  isOpen,
  onClose,
  activeClass,
  classes,
  students,
  sessions,
  grades,
  agendas,
  savings,
  teacher,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const monthLabel = MONTH_NAMES[selectedMonth - 1] || 'Bulan';

  const getRecapData = () => {
    const targetClass = activeClass || classes[0] || null;
    const targetStudents = targetClass
      ? students.filter((s) => s.classId === targetClass.id)
      : students;

    const filteredSessions = sessions.filter((sess) => {
      if (targetClass && sess.classId !== targetClass.id) return false;
      const d = new Date(sess.tanggal);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });

    return targetStudents.map((std, idx) => {
      let h = 0, s = 0, i = 0, a = 0, d = 0;
      filteredSessions.forEach((sess) => {
        const record = sess.records?.[std.id];
        const status = record?.status || 'H';
        if (status === 'H') h++;
        else if (status === 'S') s++;
        else if (status === 'I') i++;
        else if (status === 'A') a++;
        else if (status === 'D') d++;
      });
      const totalSessions = filteredSessions.length;
      const persentase = totalSessions > 0 ? Math.round((h / totalSessions) * 100) : 100;
      return {
        noUrut: idx + 1,
        student: std,
        h,
        s,
        i,
        a,
        d,
        totalSessions,
        persentase,
      };
    });
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      teacher,
      classes,
      students,
      sessions,
      grades,
      agendas,
      savings,
    };
    downloadDataBackupJSON(backupData, `backup_sim_muhiba_${Date.now()}.json`);
    showFeedback('Backup JSON berhasil diunduh!');
  };

  const handleExportStudents = () => {
    exportStudentsToExcel(activeClass, students, teacher, classes);
    showFeedback('Data Siswa Excel berhasil diunduh!');
  };

  const handleExportAttendanceExcel = () => {
    const targetClass = activeClass || classes[0] || null;
    const recapData = getRecapData();
    exportMonthlyRecapToExcel(
      recapData,
      targetClass,
      teacher,
      monthLabel,
      selectedYear
    );
    showFeedback('Rekap Presensi Excel berhasil diunduh!');
  };

  const handleExportAttendancePDF = () => {
    const targetClass = activeClass || classes[0] || null;
    const recapData = getRecapData();
    exportMonthlyRecapToPDF(
      recapData,
      targetClass,
      teacher,
      monthLabel,
      selectedYear
    );
    showFeedback('Rekap Presensi PDF berhasil dicetak!');
  };

  const handleExportGradesExcel = () => {
    const targetClass = activeClass || classes[0];
    if (!targetClass) {
      showFeedback('Pilih kelas terlebih dahulu.');
      return;
    }
    const targetStudents = students.filter((s) => s.classId === targetClass.id);
    exportGradesToExcel(
      targetClass,
      targetStudents,
      grades,
      DEFAULT_GRADE_COLUMNS,
      DEFAULT_GRADE_COLUMNS.length,
      teacher
    );
    showFeedback('Laporan Nilai Excel berhasil diunduh!');
  };

  const handleExportGradesPDF = () => {
    const targetClass = activeClass || classes[0];
    if (!targetClass) {
      showFeedback('Pilih kelas terlebih dahulu.');
      return;
    }
    const targetStudents = students.filter((s) => s.classId === targetClass.id);
    exportGradesToPDF(
      targetClass,
      targetStudents,
      grades,
      teacher
    );
    showFeedback('Laporan Nilai PDF berhasil dicetak!');
  };

  const handleExportAgendasExcel = () => {
    const classesMap = classes.reduce<Record<string, string>>((acc, c) => {
      acc[c.id] = c.namaKelas;
      return acc;
    }, {});
    exportAgendasToExcel(agendas, activeClass, teacher, classesMap);
    showFeedback('Jurnal Guru Excel berhasil diunduh!');
  };

  const handleExportSavingsExcel = () => {
    const targetClass = activeClass || classes[0];
    if (!targetClass) {
      showFeedback('Pilih kelas terlebih dahulu.');
      return;
    }
    exportSavingsToExcel(savings, students, targetClass);
    showFeedback('Laporan Tabungan Excel berhasil diunduh!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Muhammadiyah Visual Identity */}
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Download className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-white">Unduh Dokumen & Ekspor Data</h3>
              <p className="text-xs text-emerald-100">
                Ekspor laporan resmi berformat Microsoft Excel, PDF & JSON Backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Class notice */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Kelas Terpilih: </span>
              <span className="font-bold text-slate-800">
                {activeClass ? `${activeClass.namaKelas} - ${activeClass.mataPelajaran}` : 'Semua Kelas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 bg-white"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>Bulan {m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {/* Cards for Exports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Rekap Absensi */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition space-y-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#009B62]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Rekap Bulanan Presensi</h4>
                  <p className="text-[11px] text-slate-500">Matriks tanggal 1-31 & persentase</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAttendancePDF}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Cetak</span>
                </button>
              </div>
            </div>

            {/* Buku Nilai Kurikulum Merdeka */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition space-y-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#292E82]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Laporan Nilai Merdeka</h4>
                  <p className="text-[11px] text-slate-500">Formatif, Sumatif & Deskripsi CP</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportGradesExcel}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportGradesPDF}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Cetak</span>
                </button>
              </div>
            </div>

            {/* Jurnal Guru & Agenda */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition space-y-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Jurnal & Agenda Mengajar</h4>
                  <p className="text-[11px] text-slate-500">Hari, jam ke, materi pokok & kehadiran</p>
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleExportAgendasExcel}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Agenda (Excel)</span>
                </button>
              </div>
            </div>

            {/* Tabungan & Kas Siswa */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition space-y-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Buku Kas & Tabungan</h4>
                  <p className="text-[11px] text-slate-500">Mutasi debit, kredit & saldo akhir</p>
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleExportSavingsExcel}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Kas & Tabungan (Excel)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Data Backup JSON & Students Excel */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExportStudents}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Daftar Siswa Saja (Excel)</span>
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-[#009B62] to-[#292E82] hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
            >
              <Database className="w-4 h-4 text-white" />
              <span>Unduh Full Backup JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
