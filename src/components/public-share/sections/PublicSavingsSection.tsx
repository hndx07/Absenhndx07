import React from 'react';
import {
  Calendar,
  History,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
} from 'lucide-react';

export interface PublicSavingsSectionProps {
  data: any;
  sortedStudents: any[];
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'no' | 'name-asc' | 'name-desc'>>;
  isDocumentViewMode: boolean;
  formatIndonesianDate: (iso?: string) => string;
}

export const PublicSavingsSection: React.FC<PublicSavingsSectionProps> = ({
  data,
  sortedStudents,
  sortOrder,
  setSortOrder,
  isDocumentViewMode,
  formatIndonesianDate,
}) => {
  // If in Document A4 mode
  if (isDocumentViewMode) {
    return (
      <div className="mb-4 space-y-4">
        <div>
          <p className="font-bold text-[11px] uppercase mb-1 font-sans text-left">
            A. Daftar Rekapitulasi Saldo Tabungan Peserta Didik
          </p>
          <table className="w-full border-collapse border border-black text-center text-[11px] font-sans">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-100">
                <th className="border border-black p-2 w-8">No</th>
                <th className="border border-black p-2 text-left">Nama Peserta Didik</th>
                <th className="border border-black p-2 w-36 text-center">Tanggal Terakhir Diinput</th>
                <th className="border border-black p-2 w-40 text-right">Saldo Tabungan (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((std: any, idx: number) => (
                <tr key={std.id}>
                  <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-left font-medium">{std.nama}</td>
                  <td className="border border-black p-1.5 text-center font-mono text-[10px]">
                    {std.tanggalInput || std.lastTransactionDate
                      ? formatIndonesianDate(std.tanggalInput || std.lastTransactionDate)
                      : '-'}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(std.saldo || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* B. Rincian Laporan Tanggal Input Mutasi Tabungan */}
        {((data?.allTransactions || data?.transactions || data?.cashTransactions || []).length > 0) && (
          <div className="mt-4">
            <p className="font-bold text-[11px] uppercase mb-1 font-sans text-left">
              B. Rincian Laporan Tanggal Input Mutasi Tabungan & Kas Kelas
            </p>
            <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100">
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5 w-28 text-center">Tanggal Diinput</th>
                  <th className="border border-black p-1.5 text-left">Nama Murid / Akun</th>
                  <th className="border border-black p-1.5 w-20 text-center">Jenis</th>
                  <th className="border border-black p-1.5 w-28 text-right">Nominal (Rp)</th>
                  <th className="border border-black p-1.5 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {(data?.allTransactions || data?.transactions || data?.cashTransactions || []).map(
                  (tx: any, idx: number) => (
                    <tr key={tx.id || idx}>
                      <td className="border border-black p-1 font-mono">{idx + 1}</td>
                      <td className="border border-black p-1 text-center font-mono">
                        {formatIndonesianDate(tx.tanggal)}
                      </td>
                      <td className="border border-black p-1 text-left">
                        {tx.namaMurid || tx.namaSiswa || (tx.isClassCash ? 'Kas Kelas' : '-')}
                      </td>
                      <td className="border border-black p-1 text-center font-semibold">
                        {tx.tipe === 'masuk' ? 'Setoran' : 'Penarikan'}
                      </td>
                      <td className="border border-black p-1 text-right font-mono font-bold">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(tx.jumlah || 0)}
                      </td>
                      <td className="border border-black p-1 text-left">
                        {tx.keterangan || '-'} {tx.pencatat ? `(${tx.pencatat})` : ''}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Interactive Web Mode
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
            Total Saldo Kas Kelas Terkumpul
          </span>
          <p className="text-3xl font-black font-mono mt-1">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(data?.classCashBalance || 0)}
          </p>
        </div>
        <div className="text-xs text-indigo-200 space-y-1">
          <p>
            Pemasukan:{' '}
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(data?.totalCashIn || 0)}
          </p>
          <p>
            Pengeluaran:{' '}
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(data?.totalCashOut || 0)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
            Saldo Tabungan Mandiri Murid
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th
                  onClick={() => setSortOrder('no')}
                  className="py-3 px-3 text-center w-12 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none"
                  title="Klik untuk sortir nomor urut"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>No</span>
                    {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                </th>
                <th
                  onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                  className="py-3 px-4 min-w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none"
                  title="Klik untuk sortir nama alfabetis (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Murid</span>
                    {sortOrder === 'name-asc' ? (
                      <span className="flex items-center text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                        <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                      </span>
                    ) : sortOrder === 'name-desc' ? (
                      <span className="flex items-center text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                        <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center min-w-[160px]">
                  Tanggal Terakhir Diinput
                </th>
                <th className="py-3 px-4 text-right min-w-[150px]">Saldo Tabungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Tidak ada data peserta didik
                  </td>
                </tr>
              ) : (
                sortedStudents.map((std: any, idx: number) => (
                  <tr key={std.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {std.nama}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                      {std.tanggalInput || std.lastTransactionDate ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {formatIndonesianDate(std.tanggalInput || std.lastTransactionDate)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      <span className={(std.saldo || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(std.saldo || 0)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Mutasi Lengkap */}
      {((data?.allTransactions || data?.transactions || data?.cashTransactions || []).length > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-500" />
              Riwayat Mutasi Transaksi Terbaru
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {(data?.allTransactions || data?.transactions || data?.cashTransactions || []).length} transaksi
            </span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-2 px-3 text-center w-10">No</th>
                  <th className="py-2 px-3">Tanggal</th>
                  <th className="py-2 px-3">Akun / Nama Murid</th>
                  <th className="py-2 px-3 text-center">Jenis</th>
                  <th className="py-2 px-3 text-right">Nominal</th>
                  <th className="py-2 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-[11px]">
                {(data?.allTransactions || data?.transactions || data?.cashTransactions || []).map(
                  (tx: any, idx: number) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {formatIndonesianDate(tx.tanggal)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {tx.namaMurid || tx.namaSiswa || (tx.isClassCash ? 'Kas Kelas' : '-')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.tipe === 'masuk'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {tx.tipe === 'masuk' ? 'Setoran' : 'Penarikan'}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-bold ${
                          tx.tipe === 'masuk'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.tipe === 'keluar' ? '-' : '+'}
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(tx.jumlah || 0)}
                      </td>
                      <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                        {tx.keterangan || '-'} {tx.pencatat ? `(${tx.pencatat})` : ''}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicSavingsSection;
