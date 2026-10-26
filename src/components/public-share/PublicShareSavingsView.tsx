import React from 'react';
import {
  Calendar,
  History,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
} from 'lucide-react';

interface PublicShareSavingsViewProps {
  data: any;
  sortedStudents: any[];
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'no' | 'name-asc' | 'name-desc'>>;
  isDocumentViewMode: boolean;
  formatIndonesianDate: (iso?: string) => string;
}

export const PublicShareSavingsView: React.FC<PublicShareSavingsViewProps> = ({
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedStudents.map((std: any, idx: number) => (
                <tr key={std.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {std.nama}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {std.tanggalInput || std.lastTransactionDate ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200/60 dark:border-slate-700">
                        <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>{formatIndonesianDate(std.tanggalInput || std.lastTransactionDate)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
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
      </div>

      {/* Laporan Riwayat Mutasi & Tanggal Input Tabungan */}
      {((data?.allTransactions || data?.transactions || data?.cashTransactions || []).length > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                Laporan Riwayat Tanggal Input Tabungan & Kas
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-800">
              {(data?.allTransactions || data?.transactions || []).length} Mutasi Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 min-w-[160px]">Tanggal Diinput</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Murid / Akun</th>
                  <th className="py-3 px-3 text-center w-24">Jenis</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Nominal</th>
                  <th className="py-3 px-4 min-w-[200px]">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.allTransactions || data?.transactions || data?.cashTransactions || []).map(
                  (tx: any, idx: number) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {formatIndonesianDate(tx.tanggal)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {tx.namaMurid || tx.namaSiswa || (tx.isClassCash ? 'Kas Kelas' : '-')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.tipe === 'masuk'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {tx.tipe === 'masuk' ? 'Setoran' : 'Penarikan'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          tx.tipe === 'masuk'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.tipe === 'masuk' ? '+' : '-'}
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(tx.jumlah || 0)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {tx.keterangan || '-'} {tx.pencatat ? `• Pencatat: ${tx.pencatat}` : ''}
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
