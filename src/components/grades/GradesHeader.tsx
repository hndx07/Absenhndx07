import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Cloud,
  Sliders,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Printer,
  Share2,
} from 'lucide-react';
import { ClassRoom, GradeColumn, Student, StudentGrade, TeacherProfile } from '../../types';
import { exportGradesToExcel } from '../../utils/exportUtils';

interface GradesHeaderProps {
  currentClass: ClassRoom;
  teacher: TeacherProfile;
  classStudents: Student[];
  localGrades: Record<string, StudentGrade>;
  gradeColumns: GradeColumn[];
  syncStatus: 'saved' | 'saving' | 'error';
  pendingSavesCount: number;
  activeColumnsCount: number;
  averageClassScore: number;
  passedCount: number;
  studentsWithScoresCount: number;
  passedPercentage: number;
  onSaveAllNow: () => void;
  onOpenColumnEditor: () => void;
  onApplyMerdekaDescriptionsAll: () => void;
  onOpenImport: () => void;
  onOpenPrintPreview: () => void;
  onOpenShare: () => void;
  onChangeActiveColumnsCount: (count: number) => void;
}

export const GradesHeader: React.FC<GradesHeaderProps> = ({
  currentClass,
  teacher,
  classStudents,
  localGrades,
  gradeColumns,
  syncStatus,
  pendingSavesCount,
  activeColumnsCount,
  averageClassScore,
  passedCount,
  studentsWithScoresCount,
  passedPercentage,
  onSaveAllNow,
  onOpenColumnEditor,
  onApplyMerdekaDescriptionsAll,
  onOpenImport,
  onOpenPrintPreview,
  onOpenShare,
  onChangeActiveColumnsCount,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">KKM: {currentClass.kkm}</span>
            <span className="text-xs text-slate-400">&bull;</span>

            {/* Realtime Save Status Indicator */}
            <div className="flex items-center gap-1.5 ml-2">
              {syncStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tersimpan di Cloud
                </span>
              )}
              {syncStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  Menyimpan ke Cloud...
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Gagal menyimpan
                </span>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Buku Penilaian Murid (Kurikulum Merdeka)
          </h2>
          <p className="text-xs text-slate-500">
            Pengisian nilai instan tanpa jeda &bull; Otomatis tersinkronisasi aman ke database Supabase
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Simpan Nilai ke Cloud */}
          <button
            type="button"
            onClick={onSaveAllNow}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
              syncStatus === 'saving'
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : pendingSavesCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
            title="Upload & Simpan seluruh nilai murid ke database cloud Supabase secara real-time"
          >
            {syncStatus === 'saving' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Cloud...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Upload Nilai ke Cloud</span>
                {pendingSavesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold">
                    {pendingSavesCount}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={onOpenColumnEditor}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            Atur Kolom Formatif
          </button>

          {/* Auto Apply Deskripsi Kurikulum Merdeka ke Seluruh Murid */}
          <button
            type="button"
            onClick={onApplyMerdekaDescriptionsAll}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Isi deskripsi capaian kompetensi otomatis sesuai capaian nilai Kurikulum Merdeka ke seluruh murid"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Deskripsi Merdeka Otomatis</span>
          </button>

          {/* Import Excel Button for Grades */}
          <button
            onClick={onOpenImport}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Upload berkas Excel nilai murid dan sinkronkan ke database cloud Supabase"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            Upload / Impor Excel
          </button>

          {/* Export Excel & Upload Group */}
          <div className="flex items-center rounded-2xl bg-emerald-600 shadow-sm shadow-emerald-600/20 overflow-hidden">
            <button
              type="button"
              onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
              className="px-3.5 py-2.5 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Download file Excel nilai murid (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>
            <div className="w-[1px] h-5 bg-emerald-500/50"></div>
            <button
              type="button"
              onClick={onSaveAllNow}
              className="px-3 py-2.5 hover:bg-emerald-700 text-emerald-100 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Upload & Simpan data nilai ke Cloud"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Upload ke Cloud</span>
            </button>
          </div>

          {/* Dokumen Siap Cetak Button */}
          <button
            onClick={onOpenPrintPreview}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Pratinjau Dokumen Siap Cetak Leger Nilai & Unduh File Excel"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Dokumen Siap Cetak
          </button>

          <button
            onClick={onOpenShare}
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Link Publik
          </button>
        </div>
      </div>

      {/* Quick Config & Metrics Bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Tampilkan Kolom Formatif:</span>
          {[3, 5, 8, 10].map((num) => (
            <button
              key={num}
              onClick={() => onChangeActiveColumnsCount(num)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeColumnsCount === num
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {num} Formatif
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rata-rata Kelas:</span>
            <span className="font-mono font-black text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded-lg" title="Rata-rata dihitung hanya dari nilai yang sudah diinput">
              {averageClassScore || '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Ketuntasan KKM:</span>
            <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg" title="Ketuntasan dihitung hanya dari murid yang sudah memiliki nilai">
              {passedCount} / {studentsWithScoresCount} Murid Terinput ({passedPercentage}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
