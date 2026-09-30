import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, GraduationCap, Check, AlertTriangle } from 'lucide-react';
import { ClassRoom } from '../types';
import { SCHOOL_CONFIG, JURUSAN_OPTIONS } from '../config/schoolConfig';
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
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingClass({
      id: `cls_${Date.now()}`,
      namaKelas: '',
      mataPelajaran: '',
      kkm: 75,
      jurusan: 'Teknik Jaringan Komputer dan Telekomunikasi',
      keterangan: 'Tahun Ajaran 2025/2026',
      createdAt: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const handleStartEdit = (cls: ClassRoom) => {
    setEditingClass({ ...cls });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass?.namaKelas || !editingClass?.mataPelajaran) {
      alert('Nama kelas dan mata pelajaran wajib diisi!');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveClass(editingClass as ClassRoom);
      setIsFormOpen(false);
      setEditingClass(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (cls: ClassRoom) => {
    const deps = await getClassDependencyCounts(cls.id);
    if (deps.studentsCount > 0 || deps.attendanceCount > 0 || deps.gradesCount > 0) {
      setDeleteWarning({
        classRoom: cls,
        studentsCount: deps.studentsCount,
        attendanceCount: deps.attendanceCount,
        gradesCount: deps.gradesCount,
      });
      return;
    }
    if (confirm(`Hapus kelas "${cls.namaKelas}"?`)) {
      onDeleteClass(cls.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header with Muhammadiyah Visual Identity */}
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <GraduationCap className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-white">Manajemen Kelas & Rombel</h3>
              <p className="text-xs text-emerald-100">
                Daftar kelas pengampu {SCHOOL_CONFIG.namaSekolah}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {deleteWarning && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Peringatan: Relasi Data Masih Aktif!
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Kelas <strong>"{deleteWarning.classRoom.namaKelas}"</strong> saat ini masih digunakan oleh:
                  </p>
                  <ul className="text-xs font-semibold text-amber-900 list-disc list-inside space-y-0.5 mt-1">
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
                  <p className="text-[11px] text-amber-700 pt-1">
                    Kelas tidak disarankan dihapus langsung sebelum data terkait dipindahkan atau ditangani.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cls = deleteWarning.classRoom;
                    setDeleteWarning(null);
                    onDeleteClass(cls.id);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Tetap Hapus
                </button>
              </div>
            </div>
          )}

          {!isFormOpen ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-500 font-medium">
                  Klik kelas untuk memilih sebagai kelas aktif yang sedang dikelola:
                </p>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 bg-[#009B62] hover:bg-[#008276] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kelas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.map((cls) => {
                  const isActive = cls.id === activeClassId;
                  return (
                    <div
                      key={cls.id}
                      onClick={() => onSelectClass(cls.id)}
                      className={`p-4 rounded-2xl border transition-all text-left flex items-start justify-between cursor-pointer group ${
                        isActive
                          ? 'border-[#009B62] bg-emerald-50/70 shadow-sm ring-2 ring-[#009B62]/20'
                          : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base group-hover:text-[#009B62] transition-colors">
                            {cls.namaKelas}
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md bg-[#009B62] text-white text-[10px] font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-1 truncate">
                          {cls.mataPelajaran} &bull; <span className="font-bold text-[#009B62]">KKM: {cls.kkm}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {cls.jurusan || 'Umum'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cls)}
                          className="p-1.5 text-slate-400 hover:text-[#009B62] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(cls)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="border-b pb-3 mb-2 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">
                  {editingClass?.id?.startsWith('cls_') && !classes.some((c) => c.id === editingClass.id)
                    ? 'Tambah Kelas Baru'
                    : 'Edit Informasi Kelas'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Rombel / Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XII TKJ 1"
                    value={editingClass?.namaKelas || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, namaKelas: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#009B62]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Administrasi Sistem Jaringan"
                    value={editingClass?.mataPelajaran || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, mataPelajaran: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#009B62]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nilai KKM (KKTP)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={editingClass?.kkm || 75}
                    onChange={(e) => setEditingClass({ ...editingClass, kkm: Number(e.target.value) || 75 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#009B62] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jurusan / Program Keahlian *
                  </label>
                  <select
                    value={editingClass?.jurusan || 'Teknik Jaringan Komputer dan Telekomunikasi'}
                    onChange={(e) => setEditingClass({ ...editingClass, jurusan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#009B62] bg-white font-medium"
                  >
                    {JURUSAN_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                    {editingClass?.jurusan && !JURUSAN_OPTIONS.includes(editingClass.jurusan as any) && (
                      <option value={editingClass.jurusan}>{editingClass.jurusan}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kurikulum Merdeka - Fase F"
                  value={editingClass?.keterangan || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#009B62]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#009B62] hover:bg-[#008276] text-white text-xs font-bold rounded-xl transition shadow-md shadow-[#009B62]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
