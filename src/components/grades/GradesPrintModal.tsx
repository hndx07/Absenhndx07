import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  Cloud,
  X,
  Download,
} from 'lucide-react';
import { ClassRoom, GradeColumn, Student, StudentGrade, TeacherProfile } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';
import { exportGradesToExcel } from '../../utils/exportUtils';
import { OfficialLetterhead } from '../OfficialLetterhead';

interface GradesPrintModalProps {
  isOpen: boolean;
  currentClass: ClassRoom;
  teacher: TeacherProfile;
  classStudents: Student[];
  localGrades: Record<string, StudentGrade>;
  gradeColumns: GradeColumn[];
  activeColumnsCount: number;
  onClose: () => void;
  onSaveAllNow: () => void;
}

export const GradesPrintModal: React.FC<GradesPrintModalProps> = ({
  isOpen,
  currentClass,
  teacher,
  classStudents,
  localGrades,
  gradeColumns,
  activeColumnsCount,
  onClose,
  onSaveAllNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print-modal-active">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:max-h-none print:p-0 print:m-0 print:bg-white">
        {/* Header Modal - no-print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 no-print">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Dokumen Siap Cetak & Leger Nilai - {currentClass.namaKelas}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentClass.mataPelajaran} &bull; KKM: {currentClass.kkm} &bull; T.A. {teacher.tahunAjaran} ({teacher.semester})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Download Data Nilai ke File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download File Excel</span>
            </button>
            <button
              type="button"
              onClick={onSaveAllNow}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Upload & Simpan Data Nilai Siswa ke Cloud Supabase"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Upload ke Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-white text-black p-6 sm:p-10 font-serif leading-relaxed max-w-[210mm] mx-auto shadow-sm rounded-xl print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:bg-white text-xs">
            {/* Kop Surat Resmi */}
            <OfficialLetterhead namaSekolah={teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah} />

            {/* Judul Dokumen */}
            <div className="text-center my-4">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-black">
                LEGER CAPAIAN HASIL ASESMEN PESERTA DIDIK
              </h2>
              <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-black mt-0.5">
                KURIKULUM MERDEKA &bull; TAHUN PELAJARAN {teacher.tahunAjaran || SCHOOL_CONFIG.tahunAjaran} ({teacher.semester || SCHOOL_CONFIG.semester})
              </p>
            </div>

            {/* Toolbar Download File Excel Siap Cetak (no-print) */}
            <div className="mb-3.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-slate-900 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-emerald-950">Dokumen Siap Cetak Leger Nilai & Asesmen</p>
                  <p className="text-[11px] text-emerald-800">
                    Unduh lembar nilai ini dalam format berkas Microsoft Excel (.xlsx) resmi atau simpan ke cloud.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Download File Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={onSaveAllNow}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Upload & Simpan Nilai ke Cloud"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Upload Nilai ke Cloud</span>
                </button>
              </div>
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
                        <td className="py-0.5 font-bold text-black">{teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-black">Kelas / Rombel</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 font-bold text-black">{currentClass.namaKelas}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-black">Mata Pelajaran</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 font-bold text-black">{currentClass.mataPelajaran}</td>
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
                        <td className="py-0.5 font-bold text-black">{teacher.namaGuru}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-black">Tahun Pelajaran</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 text-black">{teacher.tahunAjaran} ({teacher.semester})</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-black">KKM / KKTP</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 font-bold text-black">{currentClass.kkm}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Tabel Leger Nilai */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-100">
                    <th className="border border-black p-1.5 w-7">No</th>
                    <th className="border border-black p-1.5 w-24">NISN</th>
                    <th className="border border-black p-1.5 text-left">Nama Peserta Didik</th>
                    {gradeColumns.slice(0, activeColumnsCount).map((c, i) => (
                      <th key={c.key} className="border border-black p-1.5 w-12" title={c.label}>
                        F{i + 1}
                      </th>
                    ))}
                    <th className="border border-black p-1.5 w-12 font-bold">Rata F</th>
                    <th className="border border-black p-1.5 w-12 font-bold">STS</th>
                    <th className="border border-black p-1.5 w-12 font-bold">SAS</th>
                    <th className="border border-black p-1.5 w-14 font-black">NA</th>
                    <th className="border border-black p-1.5 w-12 font-bold">Pred</th>
                    <th className="border border-black p-1.5 w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((std, idx) => {
                    const g = localGrades[std.id];
                    const fVals = [
                      g?.formatif1, g?.formatif2, g?.formatif3, g?.formatif4, g?.formatif5,
                      g?.formatif6, g?.formatif7, g?.formatif8, g?.formatif9, g?.formatif10
                    ].slice(0, activeColumnsCount).filter((v): v is number => typeof v === 'number' && !isNaN(v));
                    const avgF = fVals.length > 0 ? Math.round(fVals.reduce((a, b) => a + b, 0) / fVals.length) : null;
                    const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
                    const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

                    let totalWeighted = 0;
                    let totalW = 0;
                    if (avgF !== null) { totalWeighted += avgF * 0.5; totalW += 0.5; }
                    if (sts !== null) { totalWeighted += sts * 0.25; totalW += 0.25; }
                    if (sas !== null) { totalWeighted += sas * 0.25; totalW += 0.25; }
                    const finalScore = totalW > 0 ? Math.round(totalWeighted / totalW) : null;
                    const hasScore = finalScore !== null;
                    const isTuntas = hasScore ? finalScore >= currentClass.kkm : false;
                    const predikat = hasScore ? (finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= currentClass.kkm ? 'C' : 'D') : '-';

                    return (
                      <tr key={std.id} className="hover:bg-slate-50">
                        <td className="border border-black p-1 font-mono">{idx + 1}</td>
                        <td className="border border-black p-1 font-mono">{std.nisn || '-'}</td>
                        <td className="border border-black p-1 text-left font-medium">{std.nama}</td>
                        {gradeColumns.slice(0, activeColumnsCount).map((col) => {
                          const val = g?.[col.key as keyof StudentGrade];
                          return (
                            <td key={col.key} className="border border-black p-1 font-mono">
                              {typeof val === 'number' && !isNaN(val) ? val : '-'}
                            </td>
                          );
                        })}
                        <td className="border border-black p-1 font-mono font-semibold">{avgF !== null ? avgF : '-'}</td>
                        <td className="border border-black p-1 font-mono font-semibold">{sts !== null ? sts : '-'}</td>
                        <td className="border border-black p-1 font-mono font-semibold">{sas !== null ? sas : '-'}</td>
                        <td className="border border-black p-1 font-mono font-bold">{finalScore !== null ? finalScore : '-'}</td>
                        <td className="border border-black p-1 font-semibold">{predikat}</td>
                        <td className="border border-black p-1 font-medium">{hasScore ? (isTuntas ? 'TUNTAS' : 'REMEDIAL') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Resmi Dokumen */}
            <div className="mt-8 font-sans text-xs">
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
                    {teacher.nbmKepalaSekolah
                      ? `NBM. ${teacher.nbmKepalaSekolah}`
                      : 'NBM. ........................................'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Pendidik Pengampu Mata Pelajaran,</p>
                  <p className="text-slate-600">{currentClass.mataPelajaran}</p>
                  <div className="h-20 flex items-end justify-center">
                    <p className="font-bold underline">{teacher.namaGuru}</p>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                    NBM: {teacher.nbm || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - no-print */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Format resmi sesuai standar kurikulum {SCHOOL_CONFIG.namaSekolah}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Unduh File Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download File Excel</span>
            </button>
            <button
              type="button"
              onClick={onSaveAllNow}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Upload & Simpan Data Nilai Siswa ke Cloud Supabase"
            >
              <Cloud className="w-4 h-4" />
              <span>Upload ke Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
