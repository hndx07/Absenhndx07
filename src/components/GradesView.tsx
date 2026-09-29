import React, { useState } from 'react';
import { Award, FileSpreadsheet, FileText, Save, Check, Search, Download, HelpCircle, Edit3 } from 'lucide-react';
import { ClassRoom, Student, StudentGrade, TeacherProfile, GradeColumn } from '../types';
import { calculateGradeMetrics } from '../utils/gradeCalculations';
import { exportGradesToExcel, exportGradesToPDF } from '../utils/exportUtils';
import { DEFAULT_GRADE_COLUMNS } from '../utils/storage';

interface GradesViewProps {
  activeClass: ClassRoom | null;
  students: Student[];
  grades: StudentGrade[];
  onSaveGrade: (grade: StudentGrade) => Promise<void> | void;
  onSaveGradesBulk: (grades: StudentGrade[]) => Promise<void> | void;
  teacher: TeacherProfile;
}

export const GradesView: React.FC<GradesViewProps> = ({
  activeClass,
  students,
  grades,
  onSaveGrade,
  onSaveGradesBulk,
  teacher,
}) => {
  const [columns, setColumns] = useState<GradeColumn[]>(DEFAULT_GRADE_COLUMNS);
  const [activeColumnsCount, setActiveColumnsCount] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const kkm = activeClass?.kkm || 75;

  const classStudents = students.filter(
    (s) => !activeClass || s.classId === activeClass.id
  ).sort((a, b) => a.no - b.no);

  const filteredStudents = classStudents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.nama.toLowerCase().includes(q) || (s.nisn || '').includes(q);
  });

  const getStudentGrade = (studentId: string): StudentGrade => {
    const found = grades.find((g) => g.studentId === studentId);
    if (found) return found;
    return {
      id: `grd_${studentId}`,
      studentId,
      classId: activeClass?.id || 'cls_default',
      formatif1: null,
      formatif2: null,
      formatif3: null,
      formatif4: null,
      formatif5: null,
      sumatifTengah: null,
      sumatifAkhir: null,
    };
  };

  const handleScoreChange = (
    studentId: string,
    field: keyof StudentGrade,
    valStr: string
  ) => {
    const existing = getStudentGrade(studentId);
    const num = valStr === '' ? null : Number(valStr);
    const updated: StudentGrade = {
      ...existing,
      [field]: num,
      updated_at: new Date().toISOString(),
    };
    onSaveGrade(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Award className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Buku Nilai Kurikulum Merdeka</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Penilaian Formatif (TP), Sumatif Tengah Semester (STS) & Sumatif Akhir Semester (SAS)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                exportGradesToExcel(
                  activeClass || { id: 'all', namaKelas: 'Semua', mataPelajaran: '', kkm: 75 },
                  classStudents,
                  grades,
                  columns,
                  teacher
                )
              }
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={() =>
                exportGradesToPDF(
                  activeClass || { id: 'all', namaKelas: 'Semua', mataPelajaran: '', kkm: 75 },
                  classStudents,
                  grades,
                  columns,
                  teacher
                )
              }
              className="px-3.5 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#009B62]" />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa atau NISN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className="hidden sm:inline">Kolom Formatif:</span>
              <select
                value={activeColumnsCount}
                onChange={(e) => setActiveColumnsCount(Number(e.target.value))}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
              >
                <option value={2}>2 TP</option>
                <option value={3}>3 TP</option>
                <option value={4}>4 TP</option>
                <option value={5}>5 TP</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200">
              KKM: {kkm}
            </div>
            {isSaved && (
              <span className="text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" /> Tersimpan Otomatis
              </span>
            )}
          </div>
        </div>

        {/* Main Grades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider">
                <th className="p-3.5 w-12 text-center sticky left-0 bg-[#009B62] z-10">No</th>
                <th className="p-3.5 min-w-[170px] sticky left-12 bg-[#009B62] z-10">Nama Siswa</th>
                {Array.from({ length: activeColumnsCount }).map((_, i) => (
                  <th key={i} className="p-3.5 w-20 text-center">
                    TP {i + 1}
                  </th>
                ))}
                <th className="p-3.5 w-20 text-center bg-blue-700/80">STS</th>
                <th className="p-3.5 w-20 text-center bg-indigo-700/80">SAS</th>
                <th className="p-3.5 w-20 text-center bg-purple-700/80">Akhir</th>
                <th className="p-3.5 w-16 text-center">Predikat</th>
                <th className="p-3.5 min-w-[200px]">Capaian Kompetensi TP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnsCount + 6} className="p-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const grd = getStudentGrade(s.id);
                  const metrics = calculateGradeMetrics(grd, s.nama, kkm);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono sticky left-0 bg-white">
                        {s.no}
                      </td>
                      <td className="p-3 font-bold text-slate-800 truncate max-w-[180px] sticky left-12 bg-white">
                        <div>{s.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.nisn || '-'}</div>
                      </td>

                      {/* Formatif Inputs */}
                      {Array.from({ length: activeColumnsCount }).map((_, i) => {
                        const fieldKey = `formatif${i + 1}` as keyof StudentGrade;
                        const val = grd[fieldKey];
                        return (
                          <td key={i} className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val !== null && val !== undefined ? String(val) : ''}
                              onChange={(e) => handleScoreChange(s.id, fieldKey, e.target.value)}
                              className="w-14 text-center py-1 px-1.5 rounded-lg border border-slate-200 font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#009B62]/40"
                              placeholder="-"
                            />
                          </td>
                        );
                      })}

                      {/* STS Input */}
                      <td className="p-2 text-center bg-blue-50/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={grd.sumatifTengah !== null && grd.sumatifTengah !== undefined ? String(grd.sumatifTengah) : ''}
                          onChange={(e) => handleScoreChange(s.id, 'sumatifTengah', e.target.value)}
                          className="w-14 text-center py-1 px-1.5 rounded-lg border border-blue-200 font-bold font-mono text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          placeholder="-"
                        />
                      </td>

                      {/* SAS Input */}
                      <td className="p-2 text-center bg-indigo-50/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={grd.sumatifAkhir !== null && grd.sumatifAkhir !== undefined ? String(grd.sumatifAkhir) : ''}
                          onChange={(e) => handleScoreChange(s.id, 'sumatifAkhir', e.target.value)}
                          className="w-14 text-center py-1 px-1.5 rounded-lg border border-indigo-200 font-bold font-mono text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          placeholder="-"
                        />
                      </td>

                      {/* Final Score */}
                      <td className="p-3 text-center bg-purple-50/30">
                        <span
                          className={`font-mono font-black text-sm ${
                            metrics.isPassed ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {metrics.hasAnyScore ? metrics.finalScore.toFixed(1) : '-'}
                        </span>
                      </td>

                      {/* Predicate */}
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                            metrics.predicate === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : metrics.predicate === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : metrics.predicate === 'C'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {metrics.hasAnyScore ? metrics.predicate : '-'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="p-3 text-slate-600 text-[11px] leading-relaxed">
                        {metrics.hasAnyScore ? metrics.merdekaDeskripsiSingkat : '-'}
                      </td>
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
