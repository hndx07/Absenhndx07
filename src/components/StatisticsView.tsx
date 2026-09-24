import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  TeacherProfile,
} from '../types';

interface StatisticsViewProps {
  currentClass: ClassRoom;
  students: Student[];
  sessions: AttendanceSession[];
  grades: StudentGrade[];
  teacher: TeacherProfile;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  currentClass,
  students,
  sessions,
  grades,
  teacher,
}) => {
  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const classSessions = sessions.filter((s) => s.classId === currentClass.id);

  // Overall Attendance aggregation
  let totalH = 0,
    totalS = 0,
    totalI = 0,
    totalA = 0;

  const studentAttendanceStats = classStudents.map((std) => {
    let h = 0,
      s = 0,
      i = 0,
      a = 0;
    classSessions.forEach((sess) => {
      const st = sess.records?.[std.id]?.status;
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
    });

    totalH += h;
    totalS += s;
    totalI += i;
    totalA += a;

    const totalSessions = classSessions.length || 1;
    const pct = Math.round((h / totalSessions) * 100);

    return {
      student: std,
      h,
      s,
      i,
      a,
      pct,
    };
  });

  const totalAbsenceSlots = totalH + totalS + totalI + totalA || 1;
  const overallPresencePct = Math.round((totalH / totalAbsenceSlots) * 100);

  // Grade stats
  const studentGradeStats = classStudents.map((std) => {
    const g = grades.find((item) => item.studentId === std.id && item.classId === currentClass.id);
    const fVals = [
      g?.formatif1,
      g?.formatif2,
      g?.formatif3,
      g?.formatif4,
      g?.formatif5,
      g?.formatif6,
      g?.formatif7,
      g?.formatif8,
    ];
    const filledF = fVals.filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const avgF = filledF.length > 0 ? Math.round(filledF.reduce((a, b) => a + b, 0) / filledF.length) : null;
    const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
    const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

    // HANYA hitung nilai yang sudah diinput saja kedalam total sum (bukan yang kosong)
    let totalSum = 0;
    let countInputted = 0;
    filledF.forEach((v) => {
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

    return {
      student: std,
      avgF: avgF ?? 0,
      sts: sts ?? 0,
      sas: sas ?? 0,
      totalSum,
      countInputted,
      hasAnyScore,
      finalScore,
      isTuntas: hasAnyScore && finalScore >= currentClass.kkm,
    };
  });

  const studentsWithScores = studentGradeStats.filter((s) => s.hasAnyScore);
  const studentsBelumTuntas = studentsWithScores.filter((s) => !s.isTuntas);
  const studentsTuntas = studentsWithScores.filter((s) => s.isTuntas);
  const averageFinal =
    studentsWithScores.length > 0
      ? Math.round(
          studentsWithScores.reduce((acc, curr) => acc + curr.finalScore, 0) / studentsWithScores.length
        )
      : 0;

  // Best & Lowest Attendance
  const sortedByAtt = [...studentAttendanceStats].sort((a, b) => a.pct - b.pct);
  const lowestAtt = sortedByAtt.slice(0, 3);
  const highestAtt = [...studentAttendanceStats].sort((a, b) => b.pct - a.pct).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-medium text-slate-500">{currentClass.mataPelajaran}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Statistik & Analisis Kelas
          </h2>
          <p className="text-xs text-slate-500">
            Resume komprehensif kehadiran dan ketuntasan capaian asesmen siswa SMK Muhammadiyah Bawang
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl font-mono text-xs font-bold shadow-md shadow-indigo-600/20">
            KKM: {currentClass.kkm}
          </div>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tingkat Kehadiran Kelas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-indigo-600 font-mono">
              {overallPresencePct}%
            </span>
            <span className="text-xs text-slate-500">Rata-rata</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPresencePct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Rata-rata Nilai Akhir
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-emerald-600 font-mono">
              {averageFinal}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Target KKM: {currentClass.kkm}
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Siswa Tuntas KKM
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-blue-600 font-mono">
              {studentsTuntas.length}
            </span>
            <span className="text-xs text-slate-500">
              dari {classStudents.length} Siswa
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-2">
            {Math.round((studentsTuntas.length / (classStudents.length || 1)) * 100)}% Lolos Ketuntasan
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Perlu Bimbingan / Remedial
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-rose-600 font-mono">
              {studentsBelumTuntas.length}
            </span>
            <span className="text-xs text-slate-500">Siswa</span>
          </div>
          <p className="text-[11px] text-rose-600 font-semibold mt-2">
            Nilai di bawah KKM ({currentClass.kkm})
          </p>
        </div>
      </div>

      {/* Breakdown Graphics & Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Breakdown Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Komposisi Catatan Presensi Kelas
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {classSessions.length} Sesi Pertemuan
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Hadir (H)</span>
                <span className="font-mono text-slate-700">
                  {totalH} ({Math.round((totalH / totalAbsenceSlots) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(totalH / totalAbsenceSlots) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700">Sakit (S)</span>
                <span className="font-mono text-slate-700">
                  {totalS} ({Math.round((totalS / totalAbsenceSlots) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${(totalS / totalAbsenceSlots) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">Izin (I)</span>
                <span className="font-mono text-slate-700">
                  {totalI} ({Math.round((totalI / totalAbsenceSlots) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${(totalI / totalAbsenceSlots) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Alfa (A)</span>
                <span className="font-mono text-slate-700">
                  {totalA} ({Math.round((totalA / totalAbsenceSlots) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${(totalA / totalAbsenceSlots) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t text-[11px] text-slate-500 flex items-center justify-between">
            <span>Total Log Catatan: {totalAbsenceSlots} entri</span>
            <span className="text-indigo-600 font-bold">Fase {currentClass.keterangan || 'Kurikulum Merdeka'}</span>
          </div>
        </div>

        {/* Attention Students (Lowest Attendance / Needs Remedial) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Siswa Perlu Perhatian Khusus
            </h3>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
              Prioritas Wali Kelas
            </span>
          </div>

          <div className="space-y-2.5">
            {lowestAtt.map((item) => (
              <div
                key={item.student.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{item.student.nama}</h4>
                  <p className="text-[11px] text-slate-400">
                    Sakit: {item.s} &bull; Izin: {item.i} &bull; Alfa: {item.a}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg ${
                      item.pct < 75 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.pct}% Hadir
                  </span>
                </div>
              </div>
            ))}

            {studentsBelumTuntas.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                  Nilai di Bawah KKM ({studentsBelumTuntas.length} Siswa):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {studentsBelumTuntas.map((s) => (
                    <span
                      key={s.student.id}
                      className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] font-medium"
                    >
                      {s.student.nama} ({s.finalScore})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
