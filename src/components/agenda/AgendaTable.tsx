import React from 'react';
import { Edit2, Trash2, Cloud, RefreshCw, Save } from 'lucide-react';
import { TeachingAgenda, TeacherProfile } from '../../types';

interface AgendaTableProps {
  filteredAgendas: TeachingAgenda[];
  classesMap: Record<string, string>;
  classSubjectMap: Record<string, string>;
  teacher: TeacherProfile;
  lastSyncTime: string | null;
  isSavingAll: boolean;
  onOpenEdit: (ag: TeachingAgenda) => void;
  onDeleteAgenda: (id: string) => Promise<void> | void;
  onSyncAll: () => void;
}

export const AgendaTable: React.FC<AgendaTableProps> = ({
  filteredAgendas,
  classesMap,
  classSubjectMap,
  teacher,
  lastSyncTime,
  isSavingAll,
  onOpenEdit,
  onDeleteAgenda,
  onSyncAll,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-3 w-28">Tanggal</th>
              <th className="py-3 px-3 min-w-[130px]">Pendidik</th>
              <th className="py-3 px-3 min-w-[140px]">Mapel</th>
              <th className="py-3 px-3 min-w-[110px]">Kelas</th>
              <th className="py-3 px-3 text-center w-28">Pertemuan / Jam</th>
              <th className="py-3 px-4 min-w-[260px]">Materi & Kegiatan</th>
              <th className="py-3 px-3 text-center w-24">Kehadiran</th>
              <th className="py-3 px-3 text-center w-20">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAgendas.map((ag, idx) => {
              const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
              const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';
              const guru = ag.guruName || teacher.namaGuru;

              return (
                <tr
                  key={ag.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
                >
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {ag.tanggal}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {ag.hari}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {guru}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-slate-700 dark:text-slate-300">
                      {mapel}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] inline-block border border-indigo-100 dark:border-indigo-900/60">
                      {clsName}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                      Ke-{ag.jamKe}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {ag.rentangJam}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900 dark:text-white leading-snug">
                      {ag.materiAjar}
                    </p>
                    {ag.kegiatan && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {ag.kegiatan}
                      </p>
                    )}
                    {ag.catatan && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                        Catatan: {ag.catatan}
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        Total: {(ag.hadirCount ?? 0) + (ag.tidakHadirCount ?? 0)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          H: {ag.hadirCount ?? 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px]">
                          TH: {ag.tidakHadirCount ?? 0}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEdit(ag)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                        title="Edit Catatan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                            await onDeleteAgenda(ag.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Prominent Save Button */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lastSyncTime
              ? `Terakhir disimpan ke Cloud Supabase: ${lastSyncTime}`
              : 'Seluruh agenda mengajar tersimpan aman dan terenkripsi di PostgreSQL Supabase.'}
          </span>
        </div>
        <button
          type="button"
          onClick={onSyncAll}
          disabled={isSavingAll || filteredAgendas.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
        >
          {isSavingAll ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan ke Cloud Supabase...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Semua Agenda ke Cloud</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
