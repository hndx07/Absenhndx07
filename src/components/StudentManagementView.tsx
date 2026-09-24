import React, { useState, useRef } from 'react';
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
  Download,
  Upload,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, ClassRoom, TeacherProfile } from '../types';
import { exportStudentsToExcel, downloadStudentTemplateExcel } from '../utils/exportUtils';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

interface StudentManagementViewProps {
  currentClass: ClassRoom;
  students: Student[];
  teacher?: TeacherProfile;
  classes?: ClassRoom[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBatchAddStudents: (newStudents: Student[]) => void;
}

interface ParsedPreviewRow {
  rowNum: number;
  nisn: string;
  nama: string;
  gender: 'L' | 'P';
  noHpOrangTua: string;
  catatanUmum: string;
  status: 'valid' | 'duplicate' | 'invalid';
  reason?: string;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  currentClass,
  students,
  teacher,
  classes = [],
  onSaveStudent,
  onDeleteStudent,
  onBatchAddStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Import State
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [importRawText, setImportRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const filtered = classStudents.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm)
  );

  // Manual Add Student
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

  // Manual Edit Student
  const handleOpenEdit = (s: Student) => {
    setEditingStudent({ ...s });
    setIsModalOpen(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.nama?.trim()) {
      alert('Nama siswa wajib diisi!');
      return;
    }
    onSaveStudent(editingStudent as Student);
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  // Manual Delete Student with confirmation
  const handleConfirmDelete = () => {
    if (deletingStudent) {
      onDeleteStudent(deletingStudent.id);
      setDeletingStudent(null);
    }
  };

  // Helper to map and validate raw rows into structured preview with anti-duplication
  const processRawDataRows = (rawData: any[][]) => {
    if (!rawData || rawData.length === 0) return;

    // Detect header row
    let headerRowIdx = -1;
    let colMap = { nisn: -1, nama: -1, gender: -1, hp: -1, catatan: -1, no: -1 };

    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i].map((c) => String(c || '').toLowerCase().trim());
      const namaIdx = row.findIndex((c) => c.includes('nama') || c.includes('siswa') || c.includes('peserta didik'));
      if (namaIdx !== -1) {
        headerRowIdx = i;
        colMap.nama = namaIdx;
        colMap.nisn = row.findIndex((c) => c.includes('nisn') || c.includes('nis') || c.includes('induk'));
        colMap.gender = row.findIndex((c) => c.includes('l/p') || c.includes('gender') || c.includes('kelamin') || c.includes('jk'));
        colMap.hp = row.findIndex((c) => c.includes('hp') || c.includes('wa') || c.includes('telepon') || c.includes('kontak') || c.includes('ortu'));
        colMap.catatan = row.findIndex((c) => c.includes('catatan') || c.includes('keterangan'));
        colMap.no = row.findIndex((c) => c === 'no' || c === 'no.' || c.includes('urut'));
        break;
      }
    }

    const dataRows = headerRowIdx !== -1 ? rawData.slice(headerRowIdx + 1) : rawData;
    const existingNisns = new Set(students.map((s) => s.nisn?.trim()).filter(Boolean));
    const existingNamesInClass = new Set(classStudents.map((s) => s.nama.trim().toLowerCase()));

    const seenImportNisns = new Set<string>();
    const seenImportNames = new Set<string>();

    const previews: ParsedPreviewRow[] = [];

    dataRows.forEach((row, idx) => {
      if (!row || row.length === 0 || row.every((c) => !c || String(c).trim() === '')) return;

      let nisn = '';
      let nama = '';
      let genderStr = '';
      let hp = '';
      let catatan = '';

      if (headerRowIdx !== -1 && colMap.nama !== -1) {
        nama = String(row[colMap.nama] || '').trim();
        nisn = colMap.nisn !== -1 ? String(row[colMap.nisn] || '').trim() : '';
        genderStr = colMap.gender !== -1 ? String(row[colMap.gender] || '').trim() : '';
        hp = colMap.hp !== -1 ? String(row[colMap.hp] || '').trim() : '';
        catatan = colMap.catatan !== -1 ? String(row[colMap.catatan] || '').trim() : '';
      } else {
        // Fallback positional mapping
        if (row.length >= 3 && !isNaN(Number(row[0]))) {
          nisn = String(row[1] || '').trim();
          nama = String(row[2] || '').trim();
          genderStr = String(row[3] || '').trim();
          hp = String(row[4] || '').trim();
        } else if (row.length >= 2) {
          nisn = String(row[0] || '').trim();
          nama = String(row[1] || '').trim();
          genderStr = String(row[2] || '').trim();
          hp = String(row[3] || '').trim();
        } else if (row.length === 1) {
          nama = String(row[0] || '').trim();
        }
      }

      // Ignore accidental duplicate header lines
      if (nama.toLowerCase() === 'nama' || nama.toLowerCase() === 'nama siswa' || nama.toLowerCase() === 'nama lengkap') {
        return;
      }

      // Determine gender
      const gNorm = genderStr.toUpperCase();
      let gender: 'L' | 'P' = 'L';
      if (gNorm.startsWith('P') || gNorm.includes('PEREMPUAN') || gNorm.includes('WANITA')) {
        gender = 'P';
      }

      // Validation logic (Anti Duplikasi & Validasi Wajib)
      let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
      let reason = '';

      if (!nama) {
        status = 'invalid';
        reason = 'Nama siswa kosong';
      } else if (nisn && existingNisns.has(nisn)) {
        status = 'duplicate';
        reason = `NISN ${nisn} sudah terdaftar di sistem (dilewati)`;
      } else if (existingNamesInClass.has(nama.toLowerCase())) {
        status = 'duplicate';
        reason = `Nama "${nama}" sudah terdaftar di kelas ini (dilewati)`;
      } else if (nisn && seenImportNisns.has(nisn)) {
        status = 'duplicate';
        reason = `NISN ${nisn} duplikat dalam file Excel ini (dilewati)`;
      } else if (seenImportNames.has(nama.toLowerCase())) {
        status = 'duplicate';
        reason = `Nama "${nama}" ganda dalam file Excel ini (dilewati)`;
      }

      if (status === 'valid') {
        if (nisn) seenImportNisns.add(nisn);
        seenImportNames.add(nama.toLowerCase());
      }

      previews.push({
        rowNum: idx + 1,
        nisn,
        nama,
        gender,
        noHpOrangTua: hp,
        catatanUmum: catatan || 'Impor Excel',
        status,
        reason,
      });
    });

    setParsedRows(previews);
  };

  // Handle file drop / upload
  const handleFileUpload = (file: File) => {
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        processRawDataRows(jsonData);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Gagal membaca file Excel. Pastikan file valid (.xlsx, .xls, .csv).');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle paste text input
  const handleProcessPastedText = () => {
    if (!importRawText.trim()) return;
    const lines = importRawText.split('\n');
    const rawRows = lines.map((l) => (l.includes('\t') ? l.split('\t') : l.split(',')));
    processRawDataRows(rawRows);
  };

  // Commit valid parsed students to cloud
  const handleCommitImport = () => {
    const validRows = parsedRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) {
      alert('Tidak ada data valid yang dapat disimpan. Semua data duplikat atau tidak valid.');
      return;
    }

    let nextNo = classStudents.length > 0 ? Math.max(...classStudents.map((s) => s.no)) + 1 : 1;
    const newStudents: Student[] = validRows.map((r) => ({
      id: `std_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      classId: currentClass.id,
      no: nextNo++,
      nisn: r.nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      nama: r.nama,
      gender: r.gender,
      catatanUmum: r.catatanUmum,
      noHpOrangTua: r.noHpOrangTua,
    }));

    onBatchAddStudents(newStudents);
    setIsImportOpen(false);
    setParsedRows([]);
    setImportFileName('');
    setImportRawText('');
    alert(`Berhasil menambahkan ${newStudents.length} siswa ke kelas ${currentClass.namaKelas}! Data duplikat telah otomatis dilewati.`);
  };

  // Counters for preview summary
  const totalParsed = parsedRows.length;
  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">{currentClass.mataPelajaran}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Data Peserta Didik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {classStudents.length} siswa terdaftar ({classStudents.filter((s) => s.gender === 'L').length} Laki-laki, {classStudents.filter((s) => s.gender === 'P').length} Perempuan) &bull; {SCHOOL_CONFIG.namaSekolah}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel Button with choice */}
          <div className="flex items-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-1">
            <button
              onClick={() => exportStudentsToExcel(currentClass, classStudents, teacher, classes)}
              className="px-3 py-1.5 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Ekspor daftar siswa kelas ini ke format Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 hover:text-white" />
              Ekspor Kelas Ini
            </button>
            <span className="text-emerald-300 px-1">|</span>
            <button
              onClick={() => exportStudentsToExcel(null, students, teacher, classes)}
              className="px-3 py-1.5 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
              title="Ekspor seluruh siswa semua kelas ke format Excel"
            >
              Semua Siswa
            </button>
          </div>

          {/* Import Excel Button */}
          <button
            onClick={() => {
              setParsedRows([]);
              setImportFileName('');
              setImportRawText('');
              setIsImportOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-emerald-600/20"
          >
            <Upload className="w-4 h-4" />
            Impor Excel
          </button>

          {/* Add Student Button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
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
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-xs"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Menampilkan {filtered.length} dari {classStudents.length} siswa
        </p>
      </div>

      {/* Students Table with [Edit] and [Hapus] buttons */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4 w-32">NISN</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nama Lengkap Siswa</th>
                <th className="py-3.5 px-3 text-center w-16">L/P</th>
                <th className="py-3.5 px-4 min-w-[150px]">Kontak WhatsApp Ortu</th>
                <th className="py-3.5 px-4">Catatan / Keterangan</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
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
                  <tr key={student.id} className="hover:bg-slate-50/70 transition group">
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                      {student.no}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                      {student.nisn || '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {student.nama}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          student.gender === 'L'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {student.noHpOrangTua ? (
                        <a
                          href={`https://wa.me/${student.noHpOrangTua.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {student.noHpOrangTua}
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {student.catatanUmum || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition"
                          title="Edit Data Siswa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingStudent(student)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                          title="Hapus Data Siswa"
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

      {/* Modal Add/Edit Student Manual */}
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
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Siswa */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Hapus Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data siswa:
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs">
                <p><strong>Nama:</strong> {deletingStudent.nama}</p>
                <p><strong>NISN:</strong> {deletingStudent.nisn || '-'}</p>
                <p><strong>Kelas:</strong> {currentClass.namaKelas}</p>
              </div>
              <p className="text-[11px] text-rose-600 mt-2 font-medium">
                Tindakan ini akan menghapus siswa ini dari kelas. Data historis presensi lama tetap terjaga.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Ya, Hapus Siswa Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impor Excel dengan Validasi & Anti-Duplikasi */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Impor Data Siswa dari Excel / Spreadsheet
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Kelas: {currentClass.namaKelas} &bull; Anti-duplikasi otomatis aktif
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              {/* Top Options: Template Download & Mode Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Format Kolom yang Didukung:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    NISN, Nama Siswa / Nama Lengkap, Jenis Kelamin (L/P), No HP Ortu, Catatan
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadStudentTemplateExcel(currentClass)}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Unduh Template Excel
                  </button>

                  <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setImportMode('file')}
                      className={`px-3 py-1 rounded-lg transition ${
                        importMode === 'file'
                          ? 'bg-white text-indigo-700 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Unggah Berkas
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('paste')}
                      className={`px-3 py-1 rounded-lg transition ${
                        importMode === 'paste'
                          ? 'bg-white text-indigo-700 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tempel Teks
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone / Paste Area */}
              {importMode === 'file' ? (
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
                      handleFileUpload(e.dataTransfer.files[0]);
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
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {importFileName ? importFileName : 'Klik atau seret berkas Excel (.xlsx, .xls, .csv) ke sini'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Sistem otomatis mendeteksi kolom dan menolak data duplikat berdasarkan NISN atau Nama
                  </p>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Tempel Data dari Microsoft Excel atau Google Sheets:
                  </label>
                  <textarea
                    rows={4}
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    placeholder="Contoh salinan baris tabel:&#10;0081234567	Ahmad Fauzi	L	08123456789&#10;0087654321	Siti Nurhaliza	P	08567890123"
                    className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Proses Teks & Pratinjau
                    </button>
                  </div>
                </div>
              )}

              {/* Statistics & Validation Report Cards */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Baris
                      </span>
                      <span className="text-xl font-black font-mono text-slate-800 mt-0.5 block">
                        {totalParsed}
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Siap Diimpor
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-800 mt-0.5 block">
                        {validCount} siswa
                      </span>
                    </div>

                    <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Duplikat Dilewati
                      </span>
                      <span className="text-xl font-black font-mono text-amber-800 mt-0.5 block">
                        {duplicateCount} baris
                      </span>
                    </div>

                    <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 shadow-xs">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                        Tidak Valid
                      </span>
                      <span className="text-xl font-black font-mono text-rose-800 mt-0.5 block">
                        {invalidCount} baris
                      </span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700">
                        Pratinjau Data Sebelum Disimpan ke Cloud
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {validCount} baris siap disimpan
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                            <th className="p-2.5 text-center w-10">No</th>
                            <th className="p-2.5 w-28">Status</th>
                            <th className="p-2.5 w-28">NISN</th>
                            <th className="p-2.5 min-w-[160px]">Nama Siswa</th>
                            <th className="p-2.5 text-center w-12">L/P</th>
                            <th className="p-2.5">Keterangan / Alasan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.map((r) => (
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
                              <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                                {r.rowNum}
                              </td>
                              <td className="p-2.5">
                                {r.status === 'valid' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" /> Valid
                                  </span>
                                )}
                                {r.status === 'duplicate' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3" /> Duplikat
                                  </span>
                                )}
                                {r.status === 'invalid' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <X className="w-3 h-3" /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono">{r.nisn || '-'}</td>
                              <td className="p-2.5 font-bold">{r.nama}</td>
                              <td className="p-2.5 text-center">{r.gender}</td>
                              <td className="p-2.5 text-[11px] text-slate-500">
                                {r.reason ? (
                                  <span className={r.status === 'duplicate' ? 'text-amber-700 font-semibold' : 'text-rose-600 font-semibold'}>
                                    {r.reason}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-medium">Siap ditambahkan</span>
                                )}
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
            <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {validCount > 0
                  ? `${validCount} data valid siap disimpan ke database cloud`
                  : 'Pilih berkas Excel untuk memulai proses verifikasi'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={validCount === 0}
                  onClick={handleCommitImport}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                    validCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Simpan {validCount} Siswa ke Cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
