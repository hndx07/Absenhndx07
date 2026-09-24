import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, BookOpen, GraduationCap, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { ClassRoom } from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { getClassDependencyCounts } from '../services/data';

interface ClassManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onSaveClass: (cls: ClassRoom) => void;
  onDeleteClass: (id: string) => void;
}

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  isOpen,
  onClose,
  classes,
  activeClassId,
  onSelectClass,
  onSaveClass,
  onDeleteClass,
}) => {
  const [editingClass, setEditingClass] = useState<Partial<ClassRoom> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<{
    classRoom: ClassRoom;
    studentsCount: number;
    attendanceCount: number;
    gradesCount: number;
  } | null>(null);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingClass({
      id: `cls_${Date.now()}`,
      namaKelas: '',
      mataPelajaran: '',
      kkm: 75,
      jurusan: 'Akuntansi dan Keuangan Lembaga',
      keterangan: 'Tahun Ajaran 2025/2026',
      createdAt: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const handleStartEdit = (cls: ClassRoom) => {
    setEditingClass({ ...cls });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass?.namaKelas || !editingClass?.mataPelajaran) {
      alert('Nama kelas dan mata pelajaran wajib diisi!');
      return;
    }
    onSaveClass(editingClass as ClassRoom);
    setIsFormOpen(false);
    setEditingClass(null);
  };

  const handleDeleteClick = async (cls: ClassRoom) => {
    setIsCheckingDeps(true);
    try {
      const deps = await getClassDependencyCounts(cls.id);
      if (deps.studentsCount > 0 || deps.attendanceCount > 0 || deps.gradesCount > 0) {
        setDeleteWarning({
          classRoom: cls,
          studentsCount: deps.studentsCount,
          attendanceCount: deps.attendanceCount,
          gradesCount: deps.gradesCount,
        });
      } else {
        if (window.confirm(`Yakin ingin menghapus kelas "${cls.namaKelas}"? Kelas ini belum memiliki data siswa atau absensi.`)) {
          onDeleteClass(cls.id);
        }
      }
    } catch {
      if (window.confirm(`Yakin ingin menghapus kelas "${cls.namaKelas}"? Periksa kembali data siswa & absensi terkait.`)) {
        onDeleteClass(cls.id);
      }
    } finally {
      setIsCheckingDeps(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <GraduationCap className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Manajemen Kelas & Rombel</h3>
              <p className="text-xs text-indigo-200">
                Daftar kelas pengampu {SCHOOL_CONFIG.namaSekolah}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Dependency Warning Dialog if class still has data */}
          {deleteWarning && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Peringatan: Relasi Data Masih Aktif!
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Kelas <strong>"{deleteWarning.classRoom.namaKelas}"</strong> saat ini masih digunakan oleh:
                  </p>
                  <ul className="text-xs font-semibold text-amber-900 dark:text-amber-200 list-disc list-inside space-y-0.5 mt-1">
                    {deleteWarning.studentsCount > 0 && (
                      <li>{deleteWarning.studentsCount} data siswa</li>
                    )}
                    {deleteWarning.attendanceCount > 0 && (
                      <li>{deleteWarning.attendanceCount} sesi pertemuan absensi</li>
                    )}
                    {deleteWarning.gradesCount > 0 && (
                      <li>{deleteWarning.gradesCount} catatan penilaian siswa</li>
                    )}
                  </ul>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                    Kelas tidak disarankan dihapus langsung sebelum data terkait dipindahkan atau ditangani agar integritas data historis tidak hilang.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-amber-200 dark:border-amber-800/60">
                <button
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition"
                >
                  Batal / Tangani Data Dulu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cls = deleteWarning.classRoom;
                    setDeleteWarning(null);
                    onDeleteClass(cls.id);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Tetap Hapus Beserta Data Terkait
                </button>
              </div>
            </div>
          )}

          {!isFormOpen ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total {classes.length} Rombongan Belajar
                </p>
                <button
                  onClick={handleStartAdd}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kelas Baru
                </button>
              </div>

              <div className="grid gap-3">
                {classes.map((cls) => {
                  const isActive = cls.id === activeClassId;
                  return (
                    <div
                      key={cls.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 bg-white dark:bg-slate-800/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{cls.namaKelas}</h4>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          {cls.mataPelajaran} &bull; <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">KKM: {cls.kkm}</span>
                        </p>
                        {cls.jurusan && (
                          <p className="text-[11px] text-slate-400">
                            Jurusan: {cls.jurusan} {cls.keterangan ? `• ${cls.keterangan}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={() => onSelectClass(cls.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-700 rounded-lg text-xs font-semibold transition"
                          >
                            Pilih Kelas
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(cls)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {classes.length > 1 && (
                          <button
                            disabled={isCheckingDeps}
                            onClick={() => handleDeleteClick(cls)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="border-b dark:border-slate-800 pb-3 mb-2 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  {editingClass?.id ? 'Edit Rombel Kelas' : 'Tambah Rombel Kelas Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Nama Kelas / Rombel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X AKL 1, XI TKJ 2"
                    value={editingClass?.namaKelas || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, namaKelas: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Akuntansi Dasar, Konsentrasi Keahlian"
                    value={editingClass?.mataPelajaran || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, mataPelajaran: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Kriteria Ketuntasan Minimal (KKM)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    value={editingClass?.kkm ?? 75}
                    onChange={(e) => setEditingClass({ ...editingClass, kkm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Kompetensi Keahlian / Jurusan
                  </label>
                  <select
                    value={editingClass?.jurusan || 'Akuntansi dan Keuangan Lembaga'}
                    onChange={(e) => setEditingClass({ ...editingClass, jurusan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Akuntansi dan Keuangan Lembaga">Akuntansi dan Keuangan Lembaga</option>
                    <option value="Akl/perbankan syari'ah">Akl/perbankan syari'ah</option>
                    <option value="TJKT (Teknik Jaringan Komputer & Telekomunikasi)">TJKT (Teknik Jaringan Komputer & Telekomunikasi)</option>
                    <option value="TKJ">TKJ (Teknik Komputer & Jaringan)</option>
                    <option value="TKR">TKR (Teknik Kendaraan Ringan)</option>
                    <option value="TSM">TSM (Teknik Sepeda Motor / TBSM)</option>
                    <option value="TO">TO (Teknik Otomotif)</option>
                    <option value="DKV">DKV (Desain Komunikasi Visual)</option>
                    <option value="PPLG">PPLG (Pengembangan Perangkat Lunak dan Gim)</option>
                    <option value="MPLB">MPLB (Manajemen Perkantoran & Layanan Bisnis)</option>
                    <option value="Umum">Umum / Lintas Jurusan</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kurikulum Merdeka - Fase E (Tahun Ajaran 2025/2026)"
                    value={editingClass?.keterangan || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, keterangan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Kelas
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
