import React from 'react';
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Building2,
  BookOpen,
  Cloud,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  Printer,
  Upload,
  Share2,
  Download,
} from 'lucide-react';
import { ClassRoom, TeacherProfile } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';
import { ActionMenu, ActionMenuItem } from '../common/ActionMenu';

interface AgendaHeaderProps {
  teacher: TeacherProfile;
  classes: ClassRoom[];
  filterClassId: string;
  selectedClassObj: ClassRoom | null;
  stats: {
    total: number;
    totalHadir: number;
    totalAbsen: number;
    avgKehadiran: number;
  };
  syncStatusMsg: string | null;
  lastSyncTime: string | null;
  isSavingAll: boolean;
  hasFilteredAgendas: boolean;
  onOpenPrintPreview: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  onOpenUploadExcel: () => void;
  onOpenShare: () => void;
  onSyncAll: () => void;
  onOpenAdd: () => void;
}

export const AgendaHeader: React.FC<AgendaHeaderProps> = ({
  teacher,
  classes,
  filterClassId,
  selectedClassObj,
  stats,
  syncStatusMsg,
  lastSyncTime,
  isSavingAll,
  hasFilteredAgendas,
  onOpenPrintPreview,
  onExportPDF,
  onExportExcel,
  onExportWord,
  onOpenUploadExcel,
  onOpenShare,
  onSyncAll,
  onOpenAdd,
}) => {
  // Menu Ekspor Terpadu (Excel, PDF, Word, Cetak A4)
  const exportMenuItems: ActionMenuItem[] = [
    {
      id: 'export-excel',
      label: 'Unduh Excel (.xlsx)',
      description: 'Seluruh jurnal mengajar format tabel spreadsheet',
      icon: FileSpreadsheet,
      onClick: onExportExcel,
    },
    {
      id: 'export-pdf',
      label: 'Unduh PDF (.pdf)',
      description: 'Berkas PDF jurnal mengajar siap cetak',
      icon: Download,
      onClick: onExportPDF,
    },
    {
      id: 'export-word',
      label: 'Dokumen Word (.doc)',
      description: 'Format dokumen Microsoft Word lengkap dengan kop',
      icon: FileText,
      onClick: onExportWord,
    },
    {
      id: 'print-preview',
      label: 'Dokumen Siap Cetak (A4)',
      description: 'Pratinjau lembar A4 resmi & tanda tangan',
      icon: Printer,
      onClick: onOpenPrintPreview,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full border border-indigo-100 dark:border-indigo-900/60">
              {filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas || 'Kelas Terpilih'}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {filterClassId === 'all' ? teacher.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              T.A. {teacher.tahunAjaran} ({teacher.semester})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Buku Jurnal / Agenda Mengajar Pendidik
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan tatap muka, materi TP Kurikulum Merdeka, dan dinamika kelas pendidik {SCHOOL_CONFIG.namaSekolah}
          </p>
        </div>

        {/* Toolbar Aksi Terpadu: 1 Primer Simpan + 1 Catat Baru + 1 Impor + 1 Bagikan + 1 Ekspor Menu */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aksi Primer: Simpan Agenda ke Cloud */}
          <button
            type="button"
            onClick={onSyncAll}
            disabled={isSavingAll || !hasFilteredAgendas}
            className="min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            title="Simpan seluruh agenda mengajar ke database cloud Supabase secara real-time"
          >
            {isSavingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Simpan Agenda</span>
              </>
            )}
          </button>

          {/* Catat Agenda Baru (CTA Utama) */}
          <button
            type="button"
            onClick={onOpenAdd}
            className="min-h-[42px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Agenda</span>
          </button>

          {/* Impor Excel */}
          <button
            type="button"
            onClick={onOpenUploadExcel}
            className="min-h-[42px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Unggah dan impor berkas Excel agenda mengajar"
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Unggah Excel</span>
          </button>

          {/* Bagikan Link Publik */}
          <button
            type="button"
            onClick={onOpenShare}
            className="min-h-[42px] px-3.5 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Bagikan Tautan Preview Publik Agenda Mengajar"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan</span>
          </button>

          {/* Menu Dropdown Ekspor Terpadu (Excel, PDF, Word, Cetak) */}
          <ActionMenu
            label="Ekspor"
            icon={Download}
            items={exportMenuItems}
            align="right"
            variant="outline"
            title="Opsi Ekspor Berkas & Dokumen Cetak"
          />
        </div>
      </div>

      {/* Real-time Save Notification Banner */}
      {syncStatusMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          {lastSyncTime && (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
              {lastSyncTime}
            </span>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Agenda
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.total} <span className="text-xs font-normal text-slate-500">pertemuan</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kelas Terpantau
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {filterClassId === 'all' ? classes.length : 1} <span className="text-xs font-normal text-slate-500">kelas</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rata-rata Hadir
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats.avgKehadiran}%
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tahun Ajaran
          </p>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-2 truncate">
            {teacher.tahunAjaran} ({teacher.semester})
          </p>
        </div>
      </div>
    </div>
  );
};
