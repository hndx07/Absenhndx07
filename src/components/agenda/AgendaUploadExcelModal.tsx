import React from 'react';
import {
  FileSpreadsheet,
  X,
  BookOpen,
  Download,
  FileUp,
  Upload,
  AlertCircle,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ClassRoom, TeacherProfile } from '../../types';
import { ParsedAgendaRow } from './types';

interface AgendaUploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  teacher: TeacherProfile;
  uploadTargetClassId: string;
  setUploadTargetClassId: (id: string) => void;
  importFileName: string;
  uploadError: string | null;
  isDragOver: boolean;
  setIsDragOver: (val: boolean) => void;
  isParsingExcel: boolean;
  isSavingImport: boolean;
  parsedImportRows: ParsedAgendaRow[];
  selectedImportIndices: Set<number>;
  handleExcelFileUpload: (file: File) => void;
  downloadAgendaTemplateExcel: (classes: ClassRoom[], teacher?: TeacherProfile) => void;
  selectAllValidImportRows: () => void;
  deselectAllImportRows: () => void;
  toggleImportRow: (rowNum: number) => void;
  handleExecuteImport: () => Promise<void>;
}

export const AgendaUploadExcelModal: React.FC<AgendaUploadExcelModalProps> = ({
  isOpen,
  onClose,
  classes,
  teacher,
  uploadTargetClassId,
  setUploadTargetClassId,
  importFileName,
  uploadError,
  isDragOver,
  setIsDragOver,
  isParsingExcel,
  isSavingImport,
  parsedImportRows,
  selectedImportIndices,
  handleExcelFileUpload,
  downloadAgendaTemplateExcel,
  selectAllValidImportRows,
  deselectAllImportRows,
  toggleImportRow,
  handleExecuteImport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Unggah & Impor Agenda Mengajar Excel
              </h3>
              <p className="text-xs text-emerald-100">
                Parser cerdas berkas .xlsx, .xls, .csv dengan deteksi tanggal, kelas, jam, dan kehadiran otomatis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Guidance & Template Download */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Format Kolom Excel yang Didukung
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kolom: <strong>No, Tanggal, Hari, Kelas, Mapel, Jam Ke, Rentang Jam, Materi Ajar, Kegiatan, Catatan, Hadir, Absen</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadAgendaTemplateExcel(classes, teacher)}
              className="px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          {/* Target Class Default Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
            <div className="text-xs">
              <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                Kelas Default untuk Baris Tanpa Nama Kelas:
              </span>
              <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                Jika kolom kelas di Excel kosong, baris otomatis diasosiasikan ke kelas ini.
              </span>
            </div>
            <select
              value={uploadTargetClassId}
              onChange={(e) => setUploadTargetClassId(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.namaKelas} ({c.mataPelajaran})
                </option>
              ))}
            </select>
          </div>

          {/* Drag and Drop / File Input Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleExcelFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:border-emerald-400'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                {isParsingExcel ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <FileUp className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Tarik & Letakkan Berkas Excel ke sini, atau klik tombol di bawah
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Mendukung berkas Microsoft Excel (.xlsx, .xls) dan CSV
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Berkas Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleExcelFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {importFileName && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  Berkas terpilih: {importFileName}
                </p>
              )}
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedImportRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Hasil Analisis Berkas:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                    {parsedImportRows.length} baris
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {selectedImportIndices.size} terpilih untuk diimpor
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllValidImportRows}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    Pilih Semua Valid
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <button
                    type="button"
                    onClick={deselectAllImportRows}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedImportIndices.size === parsedImportRows.filter((r) => r.isValid).length && parsedImportRows.filter((r) => r.isValid).length > 0}
                          onChange={(e) => {
                            if (e.target.checked) selectAllValidImportRows();
                            else deselectAllImportRows();
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </th>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3 w-28">Tanggal</th>
                      <th className="p-3 w-24">Kelas</th>
                      <th className="p-3 w-24">Jam Ke</th>
                      <th className="p-3">Materi Ajar</th>
                      <th className="p-3 w-24 text-center">Kehadiran</th>
                      <th className="p-3 w-28 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedImportRows.map((row) => {
                      const isSelected = selectedImportIndices.has(row.rowNum);
                      return (
                        <tr
                          key={row.rowNum}
                          onClick={() => toggleImportRow(row.rowNum)}
                          className={`transition cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          } ${!row.isValid ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleImportRow(row.rowNum)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {row.rowNum}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {row.hari}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {row.tanggal}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300">
                            {row.classNameSnapshot}
                          </td>
                          <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {row.jamKe}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                              {row.materiAjar}
                            </p>
                            {row.kegiatan && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {row.kegiatan}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap font-mono text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              H: {row.hadirCount}
                            </span>{' '}
                            <span className="text-rose-600 dark:text-rose-400">
                              A: {row.tidakHadirCount}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Siap Impor
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold"
                                title={row.errors.join(', ')}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                Periksa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isSavingImport || selectedImportIndices.size === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-[#009B62] to-[#008276] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingImport ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Agenda...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Impor {selectedImportIndices.size} Agenda Terpilih</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
