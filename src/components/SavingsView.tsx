import React, { useState } from 'react';
import { Wallet, Plus, Trash2, ArrowUpRight, ArrowDownLeft, Search, Filter, Calendar, User } from 'lucide-react';
import { ClassRoom, Student, SavingTransaction, TeacherProfile } from '../types';

interface SavingsViewProps {
  activeClass?: ClassRoom | null;
  currentClass?: ClassRoom | null;
  students: Student[];
  savings: SavingTransaction[];
  onSaveSaving?: (tx: SavingTransaction) => Promise<void> | void;
  onSaveTransaction?: (tx: SavingTransaction) => Promise<void> | void;
  onDeleteSaving?: (txId: string) => Promise<void> | void;
  onDeleteTransaction?: (txId: string) => Promise<void> | void;
  onOpenShareModal?: () => Promise<void> | void;
  teacher: TeacherProfile;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  activeClass,
  currentClass,
  students,
  savings,
  onSaveSaving,
  onSaveTransaction,
  onDeleteSaving,
  onDeleteTransaction,
  teacher,
}) => {
  const effectiveClass = activeClass || currentClass || null;
  const handleSave = onSaveSaving || onSaveTransaction || (() => {});
  const handleDelete = onDeleteSaving || onDeleteTransaction || (() => {});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'class' | 'student'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tipe, setTipe] = useState<'masuk' | 'keluar'>('masuk');
  const [jumlah, setJumlah] = useState<number>(10000);
  const [targetType, setTargetType] = useState<'class' | 'student'>('class');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [keterangan, setKeterangan] = useState('');

  const classSavings = (savings || []).filter(
    (s) => !effectiveClass || s.classId === effectiveClass.id
  );

  let totalMasuk = 0;
  let totalKeluar = 0;
  classSavings.forEach((t) => {
    if (t.tipe === 'masuk') totalMasuk += t.jumlah;
    else totalKeluar += t.jumlah;
  });
  const saldoAkhir = totalMasuk - totalKeluar;

  const filteredTransactions = classSavings.filter((tx) => {
    if (filterType === 'class' && !tx.isClassCash) return false;
    if (filterType === 'student' && tx.isClassCash) return false;

    if (searchQuery) {
      const student = students.find((s) => s.id === tx.studentId);
      const studentName = student ? student.nama.toLowerCase() : '';
      const desc = (tx.keterangan || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return studentName.includes(q) || desc.includes(q);
    }
    return true;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) {
      alert('Jumlah transaksi harus lebih besar dari 0');
      return;
    }

    const newTx: SavingTransaction = {
      id: `sav_${Date.now()}`,
      classId: effectiveClass?.id || 'cls_default',
      isClassCash: targetType === 'class',
      studentId: targetType === 'student' ? selectedStudentId : undefined,
      tanggal,
      tipe,
      jumlah: Number(jumlah),
      keterangan: keterangan || (targetType === 'class' ? 'Kas Kelas' : 'Tabungan Siswa'),
      pencatat: teacher.namaGuru,
      created_at: new Date().toISOString(),
    };

    await handleSave(newTx);
    setIsModalOpen(false);
    setKeterangan('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Wallet className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Buku Tabungan & Kas Kelas</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Pengelolaan mutasi kas rombel dan simpanan siswa terpadu
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4 text-[#009B62]" />
            <span>Tambah Transaksi Kas</span>
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold text-slate-500 uppercase">Pemasukan (Masuk)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">
              Rp {totalMasuk.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-bold text-slate-500 uppercase">Pengeluaran (Keluar)</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl font-black text-rose-700 mt-1">
              Rp {totalKeluar.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-[#292E82]">
              <span className="text-xs font-bold text-slate-500 uppercase">Saldo Kas Bersih</span>
              <Wallet className="w-4 h-4 text-[#292E82]" />
            </div>
            <p className="text-2xl font-black text-[#292E82] mt-1">
              Rp {saldoAkhir.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa atau keterangan..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Jenis</option>
              <option value="class">Kas Kelas Saja</option>
              <option value="student">Tabungan Siswa Saja</option>
            </select>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {filteredTransactions.length} transaksi ditampilkan
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider">
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Kategori & Siswa</th>
                <th className="p-3.5">Keterangan</th>
                <th className="p-3.5 text-right">Debit (Masuk)</th>
                <th className="p-3.5 text-right">Kredit (Keluar)</th>
                <th className="p-3.5 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada transaksi kas atau tabungan tercatat.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const student = students.find((s) => s.id === tx.studentId);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {tx.tanggal}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {tx.isClassCash ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold">
                            Kas Kelas
                          </span>
                        ) : (
                          <span>{student ? student.nama : 'Tabungan Siswa'}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">{tx.keterangan || '-'}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        {tx.tipe === 'masuk' ? `Rp ${tx.jumlah.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                        {tx.tipe === 'keluar' ? `Rp ${tx.jumlah.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Hapus transaksi ini?')) handleDelete(tx.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">Tambah Transaksi Kas / Tabungan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:opacity-80">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipe Transaksi
                  </label>
                  <select
                    value={tipe}
                    onChange={(e) => setTipe(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="masuk">Pemasukan (Masuk)</option>
                    <option value="keluar">Pengeluaran (Keluar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Target Kas
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="class">Kas Kelas Rombel</option>
                    <option value="student">Tabungan Individu Siswa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jumlah Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={500}
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              {targetType === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Siswa
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.no}. {s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Keterangan / Keperluan
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Misal: Iuran infak Jumat, beli spidol, dll."
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
