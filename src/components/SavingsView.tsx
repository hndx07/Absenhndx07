import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Share2,
  Trash2,
  Search,
  Check,
  X,
  Copy,
  ExternalLink,
  DollarSign,
  Receipt,
} from 'lucide-react';
import QRCode from 'qrcode';
import { SavingTransaction, Student, ClassRoom, TeacherProfile, PublicShareRecord } from '../types';
import { createOrUpdatePublicShare } from '../services/data';

interface SavingsViewProps {
  currentClass: ClassRoom;
  students: Student[];
  savings: SavingTransaction[];
  teacher: TeacherProfile;
  onSaveTransaction: (tx: SavingTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  currentClass,
  students,
  savings,
  teacher,
  onSaveTransaction,
  onDeleteTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'class_cash' | 'student_savings'>('class_cash');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Partial<SavingTransaction> | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Share state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const classTxList = savings
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Class Cash balance calculation
  const cashTransactions = classTxList.filter((tx) => tx.isClassCash);
  const totalCashIn = cashTransactions
    .filter((t) => t.tipe === 'masuk')
    .reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalCashOut = cashTransactions
    .filter((t) => t.tipe === 'keluar')
    .reduce((acc, curr) => acc + curr.jumlah, 0);
  const classCashBalance = totalCashIn - totalCashOut;

  // Student Savings balance map
  const studentBalances: Record<string, number> = {};
  classStudents.forEach((std) => {
    const studentTxs = classTxList.filter((tx) => !tx.isClassCash && tx.studentId === std.id);
    const inTotal = studentTxs.filter((t) => t.tipe === 'masuk').reduce((a, b) => a + b.jumlah, 0);
    const outTotal = studentTxs.filter((t) => t.tipe === 'keluar').reduce((a, b) => a + b.jumlah, 0);
    studentBalances[std.id] = inTotal - outTotal;
  });

  const totalAllStudentsSavings = Object.values(studentBalances).reduce((a, b) => a + b, 0);

  const handleOpenAdd = (isCash: boolean, studentId?: string) => {
    setEditingTx({
      id: `sav_${Date.now()}`,
      classId: currentClass.id,
      isClassCash: isCash,
      studentId: studentId || (classStudents[0]?.id || ''),
      tanggal: new Date().toISOString().split('T')[0],
      tipe: 'masuk',
      jumlah: 10000,
      keterangan: isCash ? 'Iuran kas kelas' : 'Setoran tabungan siswa',
      pencatat: teacher.namaGuru,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx?.jumlah || editingTx.jumlah <= 0) {
      alert('Jumlah nominal harus lebih besar dari 0!');
      return;
    }
    onSaveTransaction(editingTx as SavingTransaction);
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Share Public Link for parents
  const handleOpenShare = async () => {
    const shareId = `sav_share_${currentClass.id}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}?tabungan_share=${shareId}`;
    setShareLink(fullLink);

    const shareRecord: PublicShareRecord = {
      id: shareId,
      type: 'tabungan',
      classId: currentClass.id,
      title: `Laporan Keuangan & Tabungan Kelas ${currentClass.namaKelas} - SMK Muhammadiyah Bawang`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        className: currentClass.namaKelas,
        classCashBalance,
        totalCashIn,
        totalCashOut,
        cashTransactions,
        students: classStudents.map((s) => ({
          ...s,
          saldo: studentBalances[s.id] || 0,
        })),
        teacher: teacher.namaGuru,
        school: teacher.namaSekolah,
      },
    };

    try {
      await createOrUpdatePublicShare(shareRecord);
    } catch (err) {
      console.warn('Could not sync share to cloud', err);
    }

    try {
      const qrData = await QRCode.toDataURL(fullLink, { width: 240, margin: 2 });
      setShareQrUrl(qrData);
    } catch (e) {
      console.error(e);
    }
    setShareModalOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-medium text-slate-500">Transparansi Keuangan Kelas</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Tabungan Siswa & Kas Kelas
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan pembukuan uang kas kelas serta tabungan mandiri peserta didik
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenShare}
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Link Publik untuk Orang Tua
          </button>

          <button
            onClick={() => handleOpenAdd(activeTab === 'class_cash')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Catat Transaksi Baru
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Saldo Kas Kelas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatRupiah(classCashBalance)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <ArrowDownLeft className="w-3 h-3" /> Masuk: {formatRupiah(totalCashIn)}
            </span>
            <span className="text-rose-600 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Keluar: {formatRupiah(totalCashOut)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Tabungan Seluruh Siswa
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatRupiah(totalAllStudentsSavings)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Terbagi dalam {classStudents.length} peserta didik
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Mutasi Transaksi
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2 font-mono">
            {classTxList.length} Transaksi
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Tercatat di sistem presensi & keuangan kelas
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('class_cash')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition ${
            activeTab === 'class_cash'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Buku Kas Kelas ({cashTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('student_savings')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition ${
            activeTab === 'student_savings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Buku Tabungan Siswa ({classStudents.length} Siswa)
        </button>
      </div>

      {/* Tab 1: Class Cash Table */}
      {activeTab === 'class_cash' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-600 tracking-wider">
                  <th className="py-3 px-4 w-32">Tanggal</th>
                  <th className="py-3 px-3 text-center w-24">Tipe</th>
                  <th className="py-3 px-4 min-w-[200px]">Keterangan</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Nominal</th>
                  <th className="py-3 px-4 min-w-[140px]">Pencatat</th>
                  <th className="py-3 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cashTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada transaksi kas kelas.
                    </td>
                  </tr>
                ) : (
                  cashTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {tx.tanggal}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            tx.tipe === 'masuk'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {tx.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {tx.keterangan}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          tx.tipe === 'masuk' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.tipe === 'masuk' ? '+' : '-'} {formatRupiah(tx.jumlah)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {tx.pencatat || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Hapus transaksi kas ini?')) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Students Savings */}
      {activeTab === 'student_savings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-600 tracking-wider">
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Peserta Didik</th>
                    <th className="py-3 px-3 text-center w-16">L/P</th>
                    <th className="py-3 px-4 text-right min-w-[140px]">Saldo Tabungan</th>
                    <th className="py-3 px-4 text-center min-w-[150px]">Aksi Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {classStudents.map((std) => {
                    const saldo = studentBalances[std.id] || 0;
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                          {std.no}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {std.nama}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-semibold text-slate-500">{std.gender}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-700">
                          {formatRupiah(saldo)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                handleOpenAdd(false, std.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-emerald-200"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Setor / Tarik
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Transaction */}
      {isModalOpen && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTx.isClassCash ? 'Tambah Transaksi Kas Kelas' : 'Transaksi Tabungan Siswa'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!editingTx.isClassCash && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pilih Siswa *
                  </label>
                  <select
                    required
                    value={editingTx.studentId || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, studentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    {classStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.no}. {s.nama} ({s.gender})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Jenis Mutasi
                  </label>
                  <select
                    value={editingTx.tipe || 'masuk'}
                    onChange={(e) => setEditingTx({ ...editingTx, tipe: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="masuk">Pemasukan / Setoran (+)</option>
                    <option value="keluar">Pengeluaran / Penarikan (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={editingTx.tanggal || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nominal (Rupiah) *
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  placeholder="Contoh: 10000"
                  value={editingTx.jumlah || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, jumlah: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Iuran kas minggu ke-3 / Setoran tabungan pribadi"
                  value={editingTx.keterangan || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Petugas / Pencatat
                </label>
                <input
                  type="text"
                  value={editingTx.pencatat || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, pencatat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Share Public Savings */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Tautan Publik Tabungan & Kas
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Wali murid dapat memeriksa saldo tabungan putra/putrinya dan pembukuan kas kelas secara langsung.
              </p>
            </div>

            {shareQrUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
                <img src={shareQrUrl} alt="QR Code Share" className="w-48 h-48 mx-auto" />
                <p className="text-[10px] text-slate-400 mt-1">Scan QR Code dengan kamera smartphone</p>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 text-left">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="w-full bg-transparent text-xs font-mono text-slate-700 px-2 focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Tersalin' : 'Salin'}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={shareLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Buka Halaman Publik <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
