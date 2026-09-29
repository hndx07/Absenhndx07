import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Search, Upload, FileSpreadsheet, Check, UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ClassRoom, Student, TeacherProfile } from '../types';

interface StudentManagementViewProps {
  activeClass?: ClassRoom | null;
  currentClass?: ClassRoom | null;
  classes?: ClassRoom[];
  students: Student[];
  onSaveStudent: (student: Student) => Promise<void> | void;
  onSaveStudentsBulk: (students: Student[]) => Promise<void> | void;
  onDeleteStudent: (studentId: string) => Promise<void> | void;
  teacher: TeacherProfile;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  activeClass,
  currentClass,
  classes,
  students,
  onSaveStudent,
  onSaveStudentsBulk,
  onDeleteStudent,
  teacher,
}) => {
  const effectiveClass = activeClass || currentClass || null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const classStudents = students.filter(
    (s) => !effectiveClass || s.classId === effectiveClass.id
  ).sort((a, b) => a.no - b.no);

  const filteredStudents = classStudents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.nama.toLowerCase().includes(q) ||
      (s.nisn || '').includes(q) ||
      (s.noHpOrangTua || '').includes(q)
    );
  });

  const handleStartAdd = () => {
    const nextNo = classStudents.length > 0 ? Math.max(...classStudents.map((s) => s.no)) + 1 : 1;
    setEditingStudent({
      id: `std_${Date.now()}`,
      classId: effectiveClass?.id || 'cls_default',
      no: nextNo,
      nisn: '',
      nama: '',
      gender: 'L',
      noHpOrangTua: '',
      catatanUmum: '',
      created_at: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleStartEdit = (s: Student) => {
    setEditingStudent({ ...s });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.nama) {
      alert('Nama siswa wajib diisi!');
      return;
    }
    await onSaveStudent(editingStudent as Student);
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const newStudents: Student[] = rows.map((r, idx) => {
          const nama = r['Nama Lengkap Siswa'] || r['Nama'] || r['nama'] || `Siswa ${idx + 1}`;
          const nisn = String(r['NISN'] || r['nisn'] || '').trim();
          const rawGender = String(r['Jenis Kelamin'] || r['Gender'] || r['gender'] || 'L').toUpperCase();
          const gender: 'L' | 'P' = rawGender.startsWith('P') ? 'P' : 'L';
          const hp = String(r['No HP'] || r['No HP / WA Ortu'] || r['noHpOrangTua'] || '').trim();
          const no = Number(r['No'] || idx + 1);

          return {
            id: `std_imp_${Date.now()}_${idx}`,
            classId: effectiveClass?.id || 'cls_default',
            no,
            nisn: nisn || undefined,
            nama,
            gender,
            noHpOrangTua: hp || undefined,
            catatanUmum: r['Catatan'] || undefined,
            created_at: new Date().toISOString(),
          };
        });

        await onSaveStudentsBulk(newStudents);
        alert(`Berhasil mengimpor ${newStudents.length} siswa dari Excel!`);
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel. Pastikan format kolom memiliki Nama, NISN, Jenis Kelamin.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Users className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Data Induk Peserta Didik</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Kelola rombel siswa aktif {effectiveClass ? `di kelas ${effectiveClass.namaKelas}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-2xs">
              <Upload className="w-4 h-4 text-emerald-100" />
              <span>Impor Excel</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            </label>

            <button
              onClick={handleStartAdd}
              className="px-4 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#009B62]" />
              <span>Tambah Siswa</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa, NISN, atau no HP..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
            />
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total {filteredStudents.length} siswa terdaftar
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider">
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5 w-32">NISN</th>
                <th className="p-3.5">Nama Lengkap</th>
                <th className="p-3.5 w-16 text-center">L/P</th>
                <th className="p-3.5">Kontak Ortu (WA)</th>
                <th className="p-3.5">Catatan Khusus</th>
                <th className="p-3.5 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada siswa di kelas ini. Klik "Tambah Siswa" atau "Impor Excel".
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-center font-bold font-mono text-slate-500">{s.no}</td>
                    <td className="p-3.5 font-mono text-slate-600">{s.nisn || '-'}</td>
                    <td className="p-3.5 font-bold text-slate-800 text-sm">{s.nama}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          s.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{s.noHpOrangTua || '-'}</td>
                    <td className="p-3.5 text-slate-500">{s.catatanUmum || '-'}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#009B62] hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus data siswa "${s.nama}"?`)) onDeleteStudent(s.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingStudent.nama ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:opacity-80">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    No Urut *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingStudent.no || 1}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, no: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NISN (10 Digit)
                  </label>
                  <input
                    type="text"
                    value={editingStudent.nisn || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    placeholder="0071234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.nama || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap siswa..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingStudent.gender || 'L'}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, gender: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    No HP / WA Ortu
                  </label>
                  <input
                    type="text"
                    value={editingStudent.noHpOrangTua || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, noHpOrangTua: e.target.value })
                    }
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Siswa
                </label>
                <input
                  type="text"
                  value={editingStudent.catatanUmum || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, catatanUmum: e.target.value })
                  }
                  placeholder="Catatan minat, keaktifan atau kedisiplinan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#009B62] to-[#008276] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
