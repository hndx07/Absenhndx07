import React from 'react';
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { ClassRoom, GradeColumn, Student, TeacherProfile } from '../../types';
import { downloadGradesTemplateExcel } from '../../utils/exportUtils';
import { GradePreviewRow } from './types';

interface GradesImportModalProps {
  isOpen: boolean;
  currentClass: ClassRoom;
  classStudents: Student[];
  gradeColumns: GradeColumn[];
  teacher: TeacherProfile;
  importFileName: string;
  isDragging: boolean;
  parsedGradeRows: GradePreviewRow[];
  rawGradeData: any[][] | null;
  overwriteMode: 'skip' | 'update';
  isUploadingToCloud: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onFileDrop: (file: File) => void;
  setIsDragging: (val: boolean) => void;
  onOverwriteModeChange: (mode: 'skip' | 'update') => void;
  onCommitImport: () => void;
}

export const GradesImportModal: React.FC<GradesImportModalProps> = ({
  isOpen,
  currentClass,
  classStudents,
  gradeColumns,
  teacher,
  importFileName,
  isDragging,
  parsedGradeRows,
  rawGradeData,
  overwriteMode,
  isUploadingToCloud,
  fileInputRef,
  onClose,
  onFileDrop,
  setIsDragging,
  onOverwriteModeChange,
  onCommitImport,
}) => {
  if (!isOpen) return null;

  const validCount = parsedGradeRows.filter((r) => (r.status === 'valid' || overwriteMode === 'update') && r.studentId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Import & Sinkronisasi Nilai Murid dari Excel
              </h3>
              <p className="text-[11px] text-emerald-100">
                Kelas: {currentClass.namaKelas} &bull; Mapel: {currentClass.mataPelajaran} &bull; KKM: {currentClass.kkm}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* Instruksi & Opsi Duplikat */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 block">Aturan Pembaruan Data Nilai:</span>
              <div className="flex items-center gap-4 mt-1.5 text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="overwriteMode"
                    value="update"
                    checked={overwriteMode === 'update'}
                    onChange={() => onOverwriteModeChange('update')}
                    className="text-indigo-600 cursor-pointer"
                  />
                  <span>Perbarui jika murid sudah ada nilai (Disarankan)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="overwriteMode"
                    value="skip"
                    checked={overwriteMode === 'skip'}
                    onChange={() => onOverwriteModeChange('skip')}
                    className="text-slate-600 cursor-pointer"
                  />
                  <span>Lewati jika sudah ada nilai</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadGradesTemplateExcel(currentClass, classStudents, gradeColumns, teacher)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Unduh Template Nilai Excel
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                onFileDrop(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onFileDrop(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {importFileName ? importFileName : 'Klik atau seret file Excel Nilai (.xlsx, .xls, .csv) ke sini'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Mendukung kolom TP 1..10, STS, SAS, dan Catatan Murid
            </p>
          </div>

          {/* Parsed Summary Cards */}
          {parsedGradeRows.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Baris</span>
                  <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">
                    {parsedGradeRows.length}
                  </span>
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Siap Diimpor</span>
                  <span className="text-xl font-black font-mono text-emerald-800 block mt-0.5">
                    {parsedGradeRows.filter((r) => r.status === 'valid').length} murid
                  </span>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Duplikat Dilewati</span>
                  <span className="text-xl font-black font-mono text-amber-800 block mt-0.5">
                    {parsedGradeRows.filter((r) => r.status === 'duplicate').length} baris
                  </span>
                </div>

                <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Tidak Ditemukan</span>
                  <span className="text-xl font-black font-mono text-rose-800 block mt-0.5">
                    {parsedGradeRows.filter((r) => r.status === 'not_found' || r.status === 'invalid').length} baris
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">
                    Pratinjau Nilai Murid
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {parsedGradeRows.filter((r) => r.status === 'valid').length} baris valid
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5 w-24">Status</th>
                        <th className="p-2.5 w-28">NISN</th>
                        <th className="p-2.5 min-w-[150px]">Nama Murid</th>
                        <th className="p-2.5 text-center w-14">STS</th>
                        <th className="p-2.5 text-center w-14">SAS</th>
                        <th className="p-2.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedGradeRows.map((r) => (
                        <tr
                          key={r.rowNum}
                          className={
                            r.status === 'valid'
                              ? 'hover:bg-emerald-50/40'
                              : r.status === 'duplicate'
                              ? 'bg-amber-50/50 hover:bg-amber-50 text-amber-900'
                              : 'bg-rose-50/50 hover:bg-rose-50 text-rose-900'
                          }
                        >
                          <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{r.rowNum}</td>
                          <td className="p-2.5">
                            {r.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            )}
                            {r.status === 'duplicate' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" /> Dilewati
                              </span>
                            )}
                            {(r.status === 'not_found' || r.status === 'invalid') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <X className="w-3 h-3" /> Ditolak
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono">{r.nisn || '-'}</td>
                          <td className="p-2.5 font-bold">{r.nama}</td>
                          <td className="p-2.5 text-center font-mono">{r.scores.sumatifTengah ?? '-'}</td>
                          <td className="p-2.5 text-center font-mono">{r.scores.sumatifAkhir ?? '-'}</td>
                          <td className="p-2.5 text-[11px] text-slate-500">
                            {r.reason || 'Siap diimpor'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            {validCount > 0 ? (
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {validCount} nilai murid siap diunggah & disimpan ke database cloud
              </span>
            ) : parsedGradeRows.length > 0 ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Semua murid sudah memiliki data nilai.{' '}
                <button
                  type="button"
                  onClick={() => onOverwriteModeChange('update')}
                  className="underline font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Klik di sini untuk mengaktifkan mode update
                </button>
              </span>
            ) : (
              <span className="text-slate-500">
                Pilih atau seret berkas Excel untuk memverifikasi nilai murid.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isUploadingToCloud}
              onClick={() => {
                if (isUploadingToCloud) return;
                if (!rawGradeData || parsedGradeRows.length === 0) {
                  fileInputRef.current?.click();
                  return;
                }
                onCommitImport();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
              title={
                parsedGradeRows.length === 0
                  ? 'Klik untuk memilih berkas Excel nilai murid'
                  : `Upload ${validCount > 0 ? validCount : parsedGradeRows.length} nilai murid ke cloud Supabase`
              }
            >
              {isUploadingToCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengunggah ke Cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>
                    {parsedGradeRows.length === 0
                      ? 'Pilih File Excel & Upload ke Cloud'
                      : `Upload Nilai ke Cloud (${validCount > 0 ? validCount : parsedGradeRows.length} Murid)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
