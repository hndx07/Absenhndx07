import React from 'react';
import {
  Plus,
  Share2,
  FileSpreadsheet,
  FileText,
  Cloud,
  RefreshCw,
  CheckCheck,
  Download,
} from 'lucide-react';
import { ClassRoom, TeacherProfile, AttendanceSession } from '../../types';
import { ActionMenu } from '../common/ActionMenu';

interface AttendanceHeaderProps {
  currentClass: ClassRoom;
  teacher: TeacherProfile;
  currentSession?: AttendanceSession;
  isSavingToCloud: boolean;
  hasUnsavedChanges: boolean;
  saveSuccessMsg: string | null;
  lastSavedTime: string | null;
  onSaveToCloud: () => void;
  onOpenCreateSession: () => void;
  onOpenShare: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({
  currentClass,
  teacher,
  currentSession,
  isSavingToCloud,
  hasUnsavedChanges,
  saveSuccessMsg,
  lastSavedTime,
  onSaveToCloud,
  onOpenCreateSession,
  onOpenShare,
  onExportExcel,
  onExportPdf,
}) => {
  const exportMenuItems = [
    {
      id: 'export-excel',
      label: 'Unduh Excel (.xlsx)',
      description: 'Rekap kehadiran format spreadsheet',
      icon: FileSpreadsheet,
      onClick: onExportExcel,
    },
    {
      id: 'export-pdf',
      label: 'Cetak Dokumen / PDF',
      description: 'Format cetak resmi sekolah',
      icon: FileText,
      onClick: onExportPdf,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">{currentClass.mataPelajaran}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Buku Presensi & Kehadiran Murid
          </h2>
          <p className="text-xs text-slate-500">
            SMK Muhammadiyah Bawang &bull; Tahun Ajaran {teacher.tahunAjaran} ({teacher.semester})
          </p>
        </div>

        {/* Toolbar Aksi Terpadu: 1 Primer + 1 Aksi Sesi + 1 Bagikan + 1 Ekspor Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aksi Primer: Simpan Presensi */}
          <button
            type="button"
            onClick={onSaveToCloud}
            disabled={isSavingToCloud || !currentSession}
            className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            } disabled:opacity-50`}
            title="Simpan data presensi murid ke cloud Supabase secara real-time"
          >
            {isSavingToCloud ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Simpan Presensi</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                )}
              </>
            )}
          </button>

          {/* Aksi Sekunder: Buat Pertemuan */}
          <button
            type="button"
            onClick={onOpenCreateSession}
            className="min-h-[42px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Pertemuan Baru</span>
          </button>

          {/* Bagikan Link Publik */}
          <button
            type="button"
            onClick={onOpenShare}
            className="min-h-[42px] px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Bagikan Tautan Publik untuk Wali Murid"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>

          {/* Dropdown Ekspor Terpadu (Excel + PDF) */}
          <ActionMenu
            label="Ekspor"
            icon={Download}
            items={exportMenuItems}
            align="right"
            variant="outline"
            title="Opsi Ekspor Berkas Presensi"
          />
        </div>
      </div>

      {/* Real-time Save Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          {lastSavedTime && (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
              {lastSavedTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
