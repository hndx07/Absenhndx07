import React from 'react';

interface PublicShareAgendaViewProps {
  data: any;
  isDocumentViewMode: boolean;
}

export const PublicShareAgendaView: React.FC<PublicShareAgendaViewProps> = ({
  data,
  isDocumentViewMode,
}) => {
  // If in Document A4 mode
  if (isDocumentViewMode) {
    return (
      <div className="mb-4">
        <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 w-32 text-left">Hari, Tanggal</th>
              <th className="border border-black p-1.5 w-16">Jam Ke</th>
              <th className="border border-black p-1.5 text-left">Materi Pokok / Kegiatan Pembelajaran</th>
              <th className="border border-black p-1.5 w-16">Hadir</th>
              <th className="border border-black p-1.5 w-16">Absen</th>
              <th className="border border-black p-1.5 w-16">Paraf</th>
            </tr>
          </thead>
          <tbody>
            {(data?.agendas || []).map((ag: any, idx: number) => (
              <tr key={ag.id || idx}>
                <td className="border border-black p-1.5 font-mono">{idx + 1}</td>
                <td className="border border-black p-1.5 text-left">
                  {ag.hari}, {ag.tanggal}
                </td>
                <td className="border border-black p-1.5 font-mono">{ag.jamKe}</td>
                <td className="border border-black p-1.5 text-left">
                  <p className="font-semibold">{ag.materiAjar}</p>
                  {ag.kegiatan && <p className="text-[9px] text-slate-600">{ag.kegiatan}</p>}
                </td>
                <td className="border border-black p-1.5 font-mono">{ag.hadirCount ?? 0}</td>
                <td className="border border-black p-1.5 font-mono">{ag.tidakHadirCount ?? 0}</td>
                <td className="border border-black p-1.5 font-mono text-[9px]">&#10003;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Interactive Web Mode
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
          Rekam Jejak Agenda Mengajar Pendidik
        </h3>
        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {(data?.agendas || []).length} Agenda Tercatat
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-3 w-28">Tanggal</th>
              <th className="py-3 px-3 text-center w-24">Jam</th>
              <th className="py-3 px-4 min-w-[250px]">Materi Pokok & Kegiatan</th>
              <th className="py-3 px-3 text-center w-20">Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.agendas || []).map((ag: any, idx: number) => (
              <tr key={ag.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                  {idx + 1}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {ag.tanggal}
                  </span>
                  <span className="text-[10px] text-slate-400">{ag.hari}</span>
                </td>
                <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Ke-{ag.jamKe}
                </td>
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-900 dark:text-white">{ag.materiAjar}</p>
                  {ag.kegiatan && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {ag.kegiatan}
                    </p>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {ag.hadirCount ?? 0} Hadir
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
