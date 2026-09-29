import React, { useState } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { ClassRoom, Student, AttendanceSession, TeacherProfile } from '../types';
import { exportMonthlyRecapToExcel, exportMonthlyRecapToPDF } from '../utils/exportUtils';

interface MonthlyAttendanceRecapViewProps {
  activeClass?: ClassRoom | null;
  currentClass?: ClassRoom | null;
  classes?: ClassRoom[];
  students: Student[];
  sessions: AttendanceSession[];
  teacher: TeacherProfile;
}

export const MonthlyAttendanceRecapView: React.FC<MonthlyAttendanceRecapViewProps> = ({
  activeClass,
  currentClass,
  students,
  sessions,
  teacher,
}) => {
  const effectiveClass = activeClass || currentClass || null;
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const classStudents = students.filter(
    (s) => !effectiveClass || s.classId === effectiveClass.id
  ).sort((a, b) => a.no - b.no);

  // Filter sessions that belong to the active class and selected month/year
  const monthSessions = sessions.filter((s) => {
    if (effectiveClass && s.classId !== effectiveClass.id) return false;
    const [y, m] = s.tanggal.split('-').map(Number);
    return y === selectedYear && m === selectedMonth;
  });

  // Map by day of month (1-31) -> session
  const sessionsByDay: Record<number, AttendanceSession> = {};
  monthSessions.forEach((s) => {
    const day = Number(s.tanggal.split('-')[2]);
    sessionsByDay[day] = s;
  });

  const getRecapData = () => {
    return classStudents.map((s, idx) => {
      let h = 0, sc = 0, ic = 0, ac = 0, dc = 0;
      daysArray.forEach((day) => {
        const sess = sessionsByDay[day];
        const rec = sess?.records?.[s.id];
        const status = rec?.status;
        if (status === 'H') h++;
        else if (status === 'S') sc++;
        else if (status === 'I') ic++;
        else if (status === 'A') ac++;
        else if (status === 'D') dc++;
      });
      const totalActive = h + sc + ic + ac + dc;
      const persentase = totalActive > 0 ? Math.round((h / totalActive) * 100) : 100;
      return {
        noUrut: idx + 1,
        student: s,
        h,
        s: sc,
        i: ic,
        a: ac,
        d: dc,
        totalSessions: totalActive,
        persentase,
      };
    });
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Calendar className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Rekapitulasi Presensi Bulanan</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Bulan {monthNames[selectedMonth - 1]} {selectedYear} • {effectiveClass?.namaKelas || 'Semua Kelas'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                exportMonthlyRecapToExcel(
                  getRecapData(),
                  effectiveClass,
                  teacher,
                  monthNames[selectedMonth - 1],
                  selectedYear
                )
              }
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={() =>
                exportMonthlyRecapToPDF(
                  getRecapData(),
                  effectiveClass,
                  teacher,
                  monthNames[selectedMonth - 1],
                  selectedYear
                )
              }
              className="px-3.5 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#009B62]" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span>Keterangan:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> H (Hadir)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> S (Sakit)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> I (Izin)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> A (Alpa)
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider">
                <th className="p-3 w-10 text-center sticky left-0 bg-[#009B62] z-10">No</th>
                <th className="p-3 min-w-[160px] sticky left-10 bg-[#009B62] z-10">Nama Siswa</th>
                {daysArray.map((day) => {
                  const hasSession = !!sessionsByDay[day];
                  return (
                    <th
                      key={day}
                      className={`p-2 w-8 text-center text-[10px] ${
                        hasSession ? 'bg-white/20 font-black' : 'opacity-70'
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}
                <th className="p-2 w-8 text-center bg-emerald-700/80">H</th>
                <th className="p-2 w-8 text-center bg-blue-700/80">S</th>
                <th className="p-2 w-8 text-center bg-amber-700/80">I</th>
                <th className="p-2 w-8 text-center bg-rose-700/80">A</th>
                <th className="p-2 w-12 text-center bg-indigo-900/80">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 7} className="p-8 text-center text-slate-400">
                    Tidak ada siswa di kelas ini.
                  </td>
                </tr>
              ) : (
                classStudents.map((s) => {
                  let h = 0,
                    sc = 0,
                    ic = 0,
                    ac = 0,
                    dc = 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 text-center font-bold text-slate-400 font-mono sticky left-0 bg-white">
                        {s.no}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 truncate max-w-[180px] sticky left-10 bg-white">
                        {s.nama}
                      </td>
                      {daysArray.map((day) => {
                        const sess = sessionsByDay[day];
                        const rec = sess?.records?.[s.id];
                        const status = rec?.status;

                        if (status === 'H') h++;
                        else if (status === 'S') sc++;
                        else if (status === 'I') ic++;
                        else if (status === 'A') ac++;
                        else if (status === 'D') dc++;

                        const cellBg =
                          status === 'H'
                            ? 'text-emerald-700 font-bold'
                            : status === 'S'
                            ? 'text-blue-700 font-bold bg-blue-50'
                            : status === 'I'
                            ? 'text-amber-700 font-bold bg-amber-50'
                            : status === 'A'
                            ? 'text-rose-700 font-bold bg-rose-50'
                            : status === 'D'
                            ? 'text-purple-700 font-bold bg-purple-50'
                            : 'text-slate-300';

                        return (
                          <td key={day} className={`p-2 text-center text-[11px] ${cellBg}`}>
                            {status || '-'}
                          </td>
                        );
                      })}
                      {(() => {
                        const totalActive = h + sc + ic + ac + dc;
                        const pct = totalActive > 0 ? Math.round((h / totalActive) * 100) : 100;
                        return (
                          <>
                            <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                              {h}
                            </td>
                            <td className="p-2 text-center font-bold text-blue-700 bg-blue-50/50">
                              {sc}
                            </td>
                            <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/50">
                              {ic}
                            </td>
                            <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/50">
                              {ac}
                            </td>
                            <td className="p-2 text-center font-black text-slate-800 bg-indigo-50/50">
                              {pct}%
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
