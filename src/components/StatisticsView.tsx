import React from 'react';
import { BarChart3, Users, Award, Calendar, Wallet, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { ClassRoom, Student, AttendanceSession, StudentGrade, SavingTransaction, TeacherProfile } from '../types';
import { calculateGradeMetrics } from '../utils/gradeCalculations';

interface StatisticsViewProps {
  activeClass?: ClassRoom | null;
  currentClass?: ClassRoom | null;
  students: Student[];
  sessions: AttendanceSession[];
  grades: StudentGrade[];
  savings?: SavingTransaction[];
  teacher: TeacherProfile;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  activeClass: propActiveClass,
  currentClass,
  students,
  sessions,
  grades,
  savings = [],
  teacher,
}) => {
  const activeClass = propActiveClass || currentClass || null;
  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === 'L').length;
  const femaleCount = students.filter((s) => s.gender === 'P').length;

  // Attendance stats
  let totalH = 0;
  let totalRecords = 0;
  sessions.forEach((s) => {
    Object.values(s.records || {}).forEach((r) => {
      totalRecords++;
      if (r.status === 'H') totalH++;
    });
  });
  const avgAttendance = totalRecords > 0 ? Math.round((totalH / totalRecords) * 100) : 100;

  // Grade stats
  const kkm = activeClass?.kkm || 75;
  let passedCount = 0;
  let remedialCount = 0;
  const predicateCounts = { A: 0, B: 0, C: 0, D: 0 };
  let sumScores = 0;
  let gradedStudentsCount = 0;

  students.forEach((s) => {
    const g = grades.find((gr) => gr.studentId === s.id);
    const m = calculateGradeMetrics(g, s.nama, kkm);
    if (m.hasAnyScore) {
      gradedStudentsCount++;
      sumScores += m.finalScore;
      predicateCounts[m.predicate]++;
      if (m.isPassed) passedCount++;
      else remedialCount++;
    }
  });

  const avgClassScore = gradedStudentsCount > 0 ? (sumScores / gradedStudentsCount).toFixed(1) : '-';

  // Savings stats
  let totalSavingsIn = 0;
  let totalSavingsOut = 0;
  savings.forEach((tx) => {
    if (tx.tipe === 'masuk') totalSavingsIn += tx.jumlah;
    else totalSavingsOut += tx.jumlah;
  });
  const netSavings = totalSavingsIn - totalSavingsOut;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <BarChart3 className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Statistik & Analisis Pembelajaran</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Kelas: {activeClass?.namaKelas || '-'} • Mapel: {activeClass?.mataPelajaran || '-'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-emerald-100 block">KKM Standar:</span>
            <span className="text-lg font-black">{kkm}</span>
          </div>
        </div>

        {/* High-level Metric Badges */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Siswa</span>
              <Users className="w-4 h-4 text-[#009B62]" />
            </div>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {maleCount} Laki-laki • {femaleCount} Perempuan
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Rata-rata Presensi</span>
              <Calendar className="w-4 h-4 text-[#008276]" />
            </div>
            <p className="text-2xl font-black text-slate-800 mt-1">{avgAttendance}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{sessions.length} sesi pertemuan</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Rata-rata Nilai</span>
              <Award className="w-4 h-4 text-[#292E82]" />
            </div>
            <p className="text-2xl font-black text-slate-800 mt-1">{avgClassScore}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{gradedStudentsCount} siswa dinilai</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Kas & Tabungan</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-slate-800 mt-1">
              Rp {netSavings.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{savings.length} transaksi</p>
          </div>
        </div>
      </div>

      {/* Grade Predicate Distribution & Pass Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Predicate Breakdown Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-4 text-white">
            <h3 className="text-sm font-bold">Distribusi Predikat Kurikulum Merdeka</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-3">
              {[
                { label: 'Predikat A (Sangat Baik >= 90)', count: predicateCounts.A, color: 'bg-emerald-500' },
                { label: 'Predikat B (Baik 80 - 89)', count: predicateCounts.B, color: 'bg-blue-500' },
                { label: `Predikat C (Cukup ${kkm} - 79)`, count: predicateCounts.C, color: 'bg-amber-500' },
                { label: 'Predikat D (Perlu Bimbingan < KKM)', count: predicateCounts.D, color: 'bg-rose-500' },
              ].map((item, idx) => {
                const pct = totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-500 font-mono">
                        {item.count} siswa ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tuntas vs Remedial Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-4 text-white">
            <h3 className="text-sm font-bold">Ketercapaian Tujuan Pembelajaran (KKTP)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <span className="text-2xl font-black text-emerald-800 mt-2 block">
                  {passedCount} Siswa
                </span>
                <span className="text-xs font-bold text-emerald-600">Tuntas Belajar</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
                <span className="text-2xl font-black text-rose-800 mt-2 block">
                  {remedialCount} Siswa
                </span>
                <span className="text-xs font-bold text-rose-600">Perlu Bimbingan / Remedial</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-center">
              Evaluasi dilakukan secara otomatis berdasarkan KKM {kkm} dan capaian TP/Formatif siswa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
