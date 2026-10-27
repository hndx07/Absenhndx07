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
  Download,
  Wrench,
} from 'lucide-react';
import { ClassRoom, GradeColumn, Student, StudentGrade, TeacherProfile } from '../../types';
import { exportGradesToExcel } from '../../utils/exportUtils';
import { ActionMenu, ActionMenuItem } from '../common/ActionMenu';

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
  // Menu Ekspor Terpadu (Excel + Dokumen Cetak)
  const exportMenuItems: ActionMenuItem[] = [
    {
      id: 'export-excel',
      label: 'Ekspor Excel (.xlsx)',
      description: 'Unduh seluruh nilai format spreadsheet',
      icon: FileSpreadsheet,
      onClick: () =>
        exportGradesToExcel(
          currentClass,
          classStudents,
          Object.values(localGrades),
          gradeColumns,
          teacher
        ),
    },
    {
      id: 'print-preview',
      label: 'Dokumen Siap Cetak',
      description: 'Pratinjau leger nilai resmi A4 & tanda tangan',
      icon: Printer,
      onClick: onOpenPrintPreview,
    },
  ];

  // Menu Alat Penilaian (Atur Kolom, Deskripsi Otomatis, Impor)
  const toolMenuItems: ActionMenuItem[] = [
    {
      id: 'col-editor',
      label: 'Atur Kolom Formatif',
      description: 'Sesuaikan label TP / materi formatif (F1-F10)',
      icon: Sliders,
      onClick: onOpenColumnEditor,
    },
    {
      id: 'merdeka-desc',
      label: 'Deskripsi Merdeka Otomatis',
      description: 'Terapkan capaian kompetensi otomatis ke seluruh murid',
      icon: Sparkles,
      onClick: onApplyMerdekaDescriptionsAll,
    },
    {
      id: 'import-excel',
      label: 'Unggah / Impor Excel',
      description: 'Upload file nilai spreadsheet eksternal',
      icon: Upload,
      onClick: onOpenImport,
    },
  ];

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
            <div className="flex items-center gap-1.5 ml-1">
              {syncStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Tersimpan di Cloud</span>
                </span>
              )}
              {syncStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>Menyimpan...</span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Gagal simpan</span>
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

        {/* Toolbar Aksi Terpadu: 1 Primer + 1 Bagikan + 1 Ekspor Menu + 1 Alat Menu */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aksi Primer: Simpan Nilai ke Cloud (Satu-satunya tombol simpan di header) */}
          <button
            type="button"
            onClick={onSaveAllNow}
            disabled={syncStatus === 'saving'}
            className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
              syncStatus === 'saving'
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : pendingSavesCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            } disabled:opacity-50`}
            title="Simpan seluruh nilai murid ke database cloud Supabase secara real-time"
          >
            {syncStatus === 'saving' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Simpan Nilai</span>
                {pendingSavesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold">
                    {pendingSavesCount}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Bagikan Link Publik */}
          <button
            type="button"
            onClick={onOpenShare}
            className="min-h-[42px] px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Bagikan Tautan Publik Nilai untuk Wali Murid"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan</span>
          </button>

          {/* Menu Dropdown Ekspor (Excel + Dokumen Cetak) */}
          <ActionMenu
            label="Ekspor"
            icon={Download}
            items={exportMenuItems}
            align="right"
            variant="outline"
            title="Opsi Ekspor & Dokumen Cetak"
          />

          {/* Menu Dropdown Alat (Formatif, Deskripsi Merdeka, Impor) */}
          <ActionMenu
            label="Alat"
            icon={Wrench}
            items={toolMenuItems}
            align="right"
            variant="secondary"
            title="Alat Penilaian & Konfigurasi"
          />
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
