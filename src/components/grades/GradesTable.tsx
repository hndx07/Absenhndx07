import React from 'react';
import {
  Award,
  Sparkles,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  Cloud,
  RefreshCw,
  Save,
} from 'lucide-react';
import { ClassRoom, GradeColumn, Student, StudentGrade } from '../../types';
import { SmoothHorizontalScroller } from '../SmoothHorizontalScroller';
import { ColumnSummary, GradeFinalScoreResult } from './types';

interface GradesTableProps {
  filteredStudents: Student[];
  gradeColumns: GradeColumn[];
  activeColumnsCount: number;
  localGrades: Record<string, StudentGrade>;
  rawInputs: Record<string, string>;
  currentClass: ClassRoom;
  columnSummary: ColumnSummary;
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  syncStatus: 'saved' | 'saving' | 'error';
  pendingSavesCount: number;
  averageClassScore: number;
  passedCount: number;
  studentsWithScoresCount: number;
  onSortChange: (order: 'no' | 'name-asc' | 'name-desc') => void;
  onScoreChange: (studentId: string, field: keyof StudentGrade, valueStr: string) => void;
  onScoreBlur: (studentId: string, field: keyof StudentGrade) => void;
  onNoteChange: (studentId: string, note: string) => void;
  onApplySingleMerdeka: (studentId: string, autoDesc: string) => void;
  calculateFinalScore: (grade?: StudentGrade, studentName?: string) => GradeFinalScoreResult;
  onSaveAllNow: () => void;
}

export const GradesTable: React.FC<GradesTableProps> = ({
  filteredStudents,
  gradeColumns,
  activeColumnsCount,
  localGrades,
  rawInputs,
  currentClass,
  columnSummary,
  sortOrder,
  syncStatus,
  pendingSavesCount,
  averageClassScore,
  passedCount,
  studentsWithScoresCount,
  onSortChange,
  onScoreChange,
  onScoreBlur,
  onNoteChange,
  onApplySingleMerdeka,
  calculateFinalScore,
  onSaveAllNow,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      <SmoothHorizontalScroller label="Matriks Penilaian">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider shadow-xs">
              <th
                onClick={() => onSortChange('no')}
                className="py-3 px-3 text-center w-10 sticky left-0 bg-[#009B62] text-white z-10 border-r border-[#008276]/40 cursor-pointer hover:opacity-90 select-none"
                title="Klik untuk sortir nomor urut"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>No</span>
                  {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-white" />}
                </div>
              </th>
              <th
                onClick={() => onSortChange(sortOrder === 'name-asc' ? 'name-desc' : 'name-asc')}
                className="py-3 px-3 min-w-[180px] sticky left-10 bg-[#008276] text-white z-10 border-r border-[#008276]/40 cursor-pointer hover:opacity-90 select-none"
                title="Klik untuk sortir nama murid secara alfabetis (A-Z / Z-A)"
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

              {/* Formatif Columns */}
              {gradeColumns.slice(0, activeColumnsCount).map((col, idx) => (
                <th key={col.id} className="py-2 px-1 text-center w-16 border-r border-white/20 font-medium text-[11px] text-white">
                  <div className="font-bold text-white">Formatif {idx + 1}</div>
                  <div className="text-[9px] text-emerald-100 truncate max-w-[60px]" title={col.label}>
                    {col.label}
                  </div>
                </th>
              ))}

              <th className="py-3 px-2 text-center w-16 bg-white/10 text-white border-r border-white/20">STS</th>
              <th className="py-3 px-2 text-center w-16 bg-white/10 text-white border-r border-white/20">SAS</th>
              <th className="py-3 px-2 text-center w-16 bg-white/15 text-white border-r border-white/20 font-bold" title="Hanya nilai yang sudah diinput saja yang dihitung kedalam total sum">Total Sum</th>
              <th className="py-3 px-2 text-center w-16 bg-white/20 text-white border-r border-white/20 font-bold">Nilai Akhir</th>
              <th className="py-3 px-2 text-center w-20 bg-white/20 text-white border-r border-white/20 font-bold">Predikat</th>
              <th className="py-3 px-3 min-w-[260px] text-white">Catatan Capaian Kompetensi (Kurikulum Merdeka)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7 + activeColumnsCount} className="py-12 text-center text-slate-400">
                  <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Belum ada murid di kelas ini atau tidak cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, sIdx) => {
                const grade = localGrades[student.id];
                const { finalScore, predicate, predicateLabel, merdekaDeskripsi, isPassed, sumInputted, countInputted, hasAnyScore } = calculateFinalScore(grade, student.nama);
                const rowBg = sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80';

                return (
                  <tr key={student.id} className={`${rowBg} hover:bg-indigo-50/60 transition group`}>
                    <td className={`py-2.5 px-3 text-center font-mono font-bold text-slate-500 sticky left-0 ${rowBg} group-hover:bg-indigo-50/60 border-r`}>
                      {student.no}
                    </td>
                    <td className={`py-2.5 px-3 font-semibold text-slate-900 sticky left-10 ${rowBg} group-hover:bg-indigo-50/60 border-r`}>
                      <div className="truncate max-w-[170px]" title={student.nama}>
                        {student.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{student.nisn || '-'}</div>
                    </td>

                    {/* TP Inputs - Zero Delay with rawInputs state */}
                    {Array.from({ length: activeColumnsCount }).map((_, colIdx) => {
                      const fieldKey = `formatif${colIdx + 1}` as keyof StudentGrade;
                      const scoreVal = grade ? (grade[fieldKey] as number | null | undefined) ?? null : null;
                      const cellKey = `${student.id}_${fieldKey}`;
                      const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                      return (
                        <td key={colIdx} className="py-1 px-1 border-r text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={displayVal}
                            onChange={(e) => onScoreChange(student.id, fieldKey, e.target.value)}
                            onBlur={() => onScoreBlur(student.id, fieldKey)}
                            className={`w-14 text-center py-1.5 rounded-lg border font-mono text-xs transition ${
                              scoreVal !== null && scoreVal < currentClass.kkm
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                                : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            }`}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}

                    {/* STS Input */}
                    {(() => {
                      const cellKey = `${student.id}_sumatifTengah`;
                      const scoreVal = grade?.sumatifTengah ?? null;
                      const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                      return (
                        <td className="py-1 px-1 border-r text-center bg-amber-50/20">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={displayVal}
                            onChange={(e) => onScoreChange(student.id, 'sumatifTengah', e.target.value)}
                            onBlur={() => onScoreBlur(student.id, 'sumatifTengah')}
                            className="w-14 text-center py-1.5 rounded-lg border border-amber-200 focus:border-amber-500 font-mono text-xs"
                            placeholder="-"
                          />
                        </td>
                      );
                    })()}

                    {/* SAS Input */}
                    {(() => {
                      const cellKey = `${student.id}_sumatifAkhir`;
                      const scoreVal = grade?.sumatifAkhir ?? null;
                      const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                      return (
                        <td className="py-1 px-1 border-r text-center bg-blue-50/20">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={displayVal}
                            onChange={(e) => onScoreChange(student.id, 'sumatifAkhir', e.target.value)}
                            onBlur={() => onScoreBlur(student.id, 'sumatifAkhir')}
                            className="w-14 text-center py-1.5 rounded-lg border border-blue-200 focus:border-blue-500 font-mono text-xs"
                            placeholder="-"
                          />
                        </td>
                      );
                    })()}

                    {/* Total Sum (Hanya nilai terinput) */}
                    <td className="py-2 px-2 text-center border-r font-mono font-bold text-xs bg-emerald-50/30 text-emerald-800">
                      {hasAnyScore ? (
                        <span title={`Total dari ${countInputted} nilai yang sudah diinput (kosong diabaikan)`}>
                          {sumInputted}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Final Score */}
                    <td className="py-2 px-2 text-center border-r font-mono font-black text-sm bg-indigo-50/30">
                      {hasAnyScore ? (
                        <span className={isPassed ? 'text-indigo-900' : 'text-rose-600'}>
                          {finalScore}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Predicate A, B, C, D */}
                    <td className="py-2 px-2 text-center border-r">
                      {hasAnyScore ? (
                        <div className="flex flex-col items-center gap-0.5" title={`Predikat ${predicate}: ${predicateLabel}`}>
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs shadow-2xs ${
                              predicate === 'A'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : predicate === 'B'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : predicate === 'C'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {predicate}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                            {predicate === 'A' ? 'Sangat Baik' : predicate === 'B' ? 'Baik' : predicate === 'C' ? 'Cukup' : 'Bimbingan'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Catatan Input & Deskripsi Otomatis Kurikulum Merdeka */}
                    <td className="py-1 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={grade?.catatan !== undefined ? grade.catatan : ''}
                          onChange={(e) => onNoteChange(student.id, e.target.value)}
                          onBlur={() => onScoreBlur(student.id, 'catatan')}
                          placeholder={hasAnyScore ? merdekaDeskripsi : 'Deskripsi pencapaian kompetensi...'}
                          title={grade?.catatan || (hasAnyScore ? merdekaDeskripsi : '')}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:border-indigo-500 truncate"
                        />
                        {hasAnyScore && (
                          <button
                            type="button"
                            onClick={() => onApplySingleMerdeka(student.id, merdekaDeskripsi)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition shrink-0 cursor-pointer"
                            title="Terapkan Deskripsi Kurikulum Merdeka Otomatis"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* TFOOT: Total Sum & Rata-rata HANYA nilai yang sudah diinput */}
          <tfoot className="border-t-2 border-slate-300 bg-slate-50/95 font-mono text-[11px]">
            {/* Row 1: Total Sum per Kolom */}
            <tr className="border-b border-slate-200">
              <td colSpan={2} className="py-2.5 px-3 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-r text-right uppercase tracking-wider text-[10px]">
                Total Sum (Hanya Terinput):
              </td>
              {columnSummary.tpSummaries.map((tp, idx) => (
                <td key={idx} className="py-2 px-1 text-center font-bold text-slate-800 border-r" title={`${tp.count} nilai terisi (kosong diabaikan)`}>
                  {tp.sum > 0 ? tp.sum : '-'}
                </td>
              ))}
              <td className="py-2 px-2 text-center font-bold text-amber-900 border-r bg-amber-50/40" title={`${columnSummary.sts.count} nilai terisi`}>
                {columnSummary.sts.sum > 0 ? columnSummary.sts.sum : '-'}
              </td>
              <td className="py-2 px-2 text-center font-bold text-blue-900 border-r bg-blue-50/40" title={`${columnSummary.sas.count} nilai terisi`}>
                {columnSummary.sas.sum > 0 ? columnSummary.sas.sum : '-'}
              </td>
              <td className="py-2 px-2 text-center font-black text-emerald-800 border-r bg-emerald-50/60" title="Akumulasi seluruh nilai terinput">
                {columnSummary.totalAllSum > 0 ? columnSummary.totalAllSum : '-'}
              </td>
              <td className="py-2 px-2 text-center font-bold text-slate-400 border-r bg-indigo-50/20">-</td>
              <td className="py-2 px-2 text-center font-bold text-slate-400 border-r">-</td>
              <td className="py-2 px-3 text-slate-400 italic text-[10px] font-sans">
                *Nilai kosong diabaikan dari perhitungan total sum
              </td>
            </tr>
            {/* Row 2: Rata-rata per Kolom */}
            <tr>
              <td colSpan={2} className="py-2.5 px-3 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-r text-right uppercase tracking-wider text-[10px]">
                Rata-rata (Hanya Terinput):
              </td>
              {columnSummary.tpSummaries.map((tp, idx) => (
                <td key={idx} className="py-2 px-1 text-center font-bold text-slate-800 border-r" title={`Rata-rata dari ${tp.count} nilai terisi`}>
                  {tp.avg}
                </td>
              ))}
              <td className="py-2 px-2 text-center font-bold text-amber-900 border-r bg-amber-50/40" title={`Rata-rata dari ${columnSummary.sts.count} nilai terisi`}>
                {columnSummary.sts.avg}
              </td>
              <td className="py-2 px-2 text-center font-bold text-blue-900 border-r bg-blue-50/40" title={`Rata-rata dari ${columnSummary.sas.count} nilai terisi`}>
                {columnSummary.sas.avg}
              </td>
              <td className="py-2 px-2 text-center font-bold text-emerald-800 border-r bg-emerald-50/60">-</td>
              <td className="py-2 px-2 text-center font-black text-indigo-900 border-r bg-indigo-50/60" title="Rata-rata nilai akhir murid">
                {averageClassScore || '-'}
              </td>
              <td className="py-2 px-2 text-center font-bold text-slate-600 border-r text-[10px]">
                KKM {currentClass.kkm}
              </td>
              <td className="py-2 px-3 text-slate-500 text-[10px] font-sans">
                {passedCount} dari {studentsWithScoresCount} murid tuntas KKM
              </td>
            </tr>
          </tfoot>
        </table>
      </SmoothHorizontalScroller>

      {/* Table Footer with Prominent Save Button */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {syncStatus === 'saved'
              ? 'Semua nilai murid tersimpan aman di database Cloud PostgreSQL Supabase.'
              : syncStatus === 'saving'
              ? 'Sedang menyimpan ke cloud...'
              : syncStatus === 'error'
              ? 'Gagal menyimpan, silakan coba lagi.'
              : 'Klik tombol simpan untuk memastikan seluruh data nilai tersimpan ke cloud.'}
          </span>
        </div>
        <button
          type="button"
          onClick={onSaveAllNow}
          disabled={syncStatus === 'saving'}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
        >
          {syncStatus === 'saving' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan ke Cloud Supabase...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Semua Nilai ke Cloud</span>
              {pendingSavesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold">
                  {pendingSavesCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
