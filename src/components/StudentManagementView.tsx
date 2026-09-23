import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Edit,
  Phone,
  Search,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Student, ClassRoom } from '../types';

interface StudentManagementViewProps {
  currentClass: ClassRoom;
  students: Student[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBatchAddStudents: (newStudents: Student[]) => void;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  currentClass,
  students,
  onSaveStudent,
  onDeleteStudent,
  onBatchAddStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [importRawText, setImportRawText] = useState('');

  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const filtered = classStudents.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    const nextNo = classStudents.length > 0 ? Math.max(...classStudents.map((s) => s.no)) + 1 : 1;
    setEditingStudent({
      id: `std_${Date.now()}`,
      classId: currentClass.id,
      no: nextNo,
      nisn: '',
      nama: '',
      gender: 'L',
      catatanUmum: '',
      noHpOrangTua: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent({ ...s });
    setIsModalOpen(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.nama) {
      alert('Nama siswa wajib diisi!');
      return;
    }
    onSaveStudent(editingStudent as Student);
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleProcessImport = () => {
    if (!importRawText.trim()) return;

    const lines = importRawText.split('\n');
    const parsedStudents: Student[] = [];
    let curNo = classStudents.length > 0 ? Math.max(...classStudents.map((s) => s.no)) + 1 : 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Handle tab-separated (from Excel / Sheets) or comma-separated
      const cols = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',');

      // If user pasted "No \t NISN \t Nama \t Gender \t HP"
      if (cols.length >= 2) {
        let nisn = '';
        let nama = '';
        let gender: 'L' | 'P' = 'L';
        let hp = '';

        // Check if first column is just a number
        if (!isNaN(Number(cols[0].trim())) && cols.length >= 3) {
          nisn = cols[1].trim();
          nama = cols[2].trim();
          if (cols[3]) {
            const g = cols[3].trim().toUpperCase();
            if (g === 'P' || g === 'PEREMPUAN') gender = 'P';
          }
          if (cols[4]) hp = cols[4].trim();
        } else {
          // Format NISN / Nama
          nisn = cols[0].trim();
          nama = cols[1].trim();
          if (cols[2]) {
            const g = cols[2].trim().toUpperCase();
            if (g === 'P' || g === 'PEREMPUAN') gender = 'P';
          }
          if (cols[3]) hp = cols[3].trim();
        }

        // Clean headers like "NISN", "NAMA SISWA"
        if (nama.toLowerCase().includes('nama') || nisn.toLowerCase().includes('nisn')) {
          continue;
        }

        if (nama) {
          parsedStudents.push({
            id: `std_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            classId: currentClass.id,
            no: curNo++,
            nisn: nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
            nama,
            gender,
            catatanUmum: 'Impor dari Spreadsheet',
            noHpOrangTua: hp,
          });
        }
      } else if (cols.length === 1 && cols[0].trim()) {
        // Just names pasted line by line
        parsedStudents.push({
          id: `std_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          classId: currentClass.id,
          no: curNo++,
          nisn: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
          nama: cols[0].trim(),
          gender: 'L',
          catatanUmum: '',
          noHpOrangTua: '',
        });
      }
    }

    if (parsedStudents.length === 0) {
      alert('Tidak ada data siswa yang valid terbaca. Pastikan format kolom sesuai.');
      return;
    }

    onBatchAddStudents(parsedStudents);
    setImportRawText('');
    setIsImportOpen(false);
    alert(`Berhasil mengimpor ${parsedStudents.length} peserta didik ke kelas ${currentClass.namaKelas}!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-medium text-slate-500">{currentClass.mataPelajaran}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Data Peserta Didik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {classStudents.length} siswa terdaftar ({classStudents.filter((s) => s.gender === 'L').length} Laki-laki, {classStudents.filter((s) => s.gender === 'P').length} Perempuan)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold transition flex items-center gap-2 border border-emerald-200 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Impor dari Excel / Sheets
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm"
          />
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Menampilkan {filtered.length} dari {classStudents.length} siswa
        </p>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4 w-32">NISN</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nama Peserta Didik</th>
                <th className="py-3.5 px-3 text-center w-16">L/P</th>
                <th className="py-3.5 px-4 min-w-[150px]">Kontak Orang Tua / WA</th>
                <th className="py-3.5 px-4">Catatan Perkembangan</th>
                <th className="py-3.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada data siswa di kelas ini atau tidak cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                      {student.no}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                      {student.nisn || '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {student.nama}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          student.gender === 'L'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {student.noHpOrangTua ? (
                        <a
                          href={`https://wa.me/${student.noHpOrangTua.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition border border-emerald-200 font-mono"
                        >
                          <Phone className="w-3 h-3" />
                          {student.noHpOrangTua}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {student.catatanUmum || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                          title="Edit Siswa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus data peserta didik ${student.nama}?`)) {
                              onDeleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Add/Edit Student */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingStudent.nama ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStudent} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    No. Urut
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingStudent.no || 1}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, no: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    NISN (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    placeholder="0089123456"
                    value={editingStudent.nisn || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nisn: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  value={editingStudent.nama || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, nama: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingStudent.gender || 'L'}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, gender: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    No. WhatsApp Orang Tua
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={editingStudent.noHpOrangTua || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, noHpOrangTua: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Catatan Siswa
                </label>
                <input
                  type="text"
                  placeholder="Catatan bakat, kendala, atau peran di kelas..."
                  value={editingStudent.catatanUmum || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, catatanUmum: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Spreadsheet */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Impor Siswa dari Excel / Google Sheets
                </h3>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Format Data yang Didukung:
              </div>
              <p>
                Buka Excel atau Google Sheets Anda, blok kolom lalu tekan <strong>Ctrl+C</strong> dan paste di bawah:
              </p>
              <div className="p-2 bg-white/80 rounded-lg font-mono text-[11px] text-slate-700">
                Kolom 1: NISN (atau No Urut) &bull; Kolom 2: Nama Siswa &bull; Kolom 3: Gender (L/P) &bull; Kolom 4: No HP WA
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Paste Teks Spreadsheet di Sini:
              </label>
              <textarea
                rows={8}
                placeholder={`0089123401\tAhmad Fauzi\tL\t081234567890\n0089123402\tAnnisa Rahma\tP\t081234567891\n0089123403\tBagus Tri\tL\t081234567892`}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Proses & Tambahkan Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
