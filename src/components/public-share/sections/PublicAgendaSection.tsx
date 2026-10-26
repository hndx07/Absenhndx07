import React from 'react';

export interface PublicAgendaSectionProps {
  data: any;
  isDocumentViewMode: boolean;
}

export const PublicAgendaSection: React.FC<PublicAgendaSectionProps> = ({
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

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {(data?.agendas || []).length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada data agenda pembelajaran yang dibagikan.
          </div>
        ) : (
          (data?.agendas || []).map((ag: any, idx: number) => (
            <div key={ag.id || idx} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {ag.hari}, {ag.tanggal}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    Jam Ke: {ag.jamKe}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Hadir: <b>{ag.hadirCount ?? 0}</b>
                  </span>
                  <span className="text-rose-500 font-medium">
                    Absen: <b>{ag.tidakHadirCount ?? 0}</b>
                  </span>
                </div>
              </div>

              <div className="ml-8 space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {ag.materiAjar}
                </p>
                {ag.kegiatan && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ag.kegiatan}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicAgendaSection;
