import React from 'react';
import { Clock, Edit2, Trash2 } from 'lucide-react';
import { TeachingAgenda, TeacherProfile } from '../../types';

interface AgendaCardsProps {
  filteredAgendas: TeachingAgenda[];
  classesMap: Record<string, string>;
  classSubjectMap: Record<string, string>;
  teacher: TeacherProfile;
  onOpenEdit: (ag: TeachingAgenda) => void;
  onDeleteAgenda: (id: string) => Promise<void> | void;
}

export const AgendaCards: React.FC<AgendaCardsProps> = ({
  filteredAgendas,
  classesMap,
  classSubjectMap,
  teacher,
  onOpenEdit,
  onDeleteAgenda,
}) => {
  return (
    <div className="space-y-4">
      {filteredAgendas.map((ag) => {
        const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
        const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';

        return (
          <div
            key={ag.id}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold font-mono">
                  {ag.hari}, {ag.tanggal}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-900/60">
                  {clsName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Jam: {ag.jamKe} ({ag.rentangJam})
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
                  Total: {(ag.hadirCount ?? 0) + (ag.tidakHadirCount ?? 0)}
                </span>
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold">
                  Hadir: {ag.hadirCount ?? 0}
                </span>
                <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold">
                  Tidak Hadir: {ag.tidakHadirCount ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenEdit(ag)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition ml-2"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                      await onDeleteAgenda(ag.id);
                    }
                  }}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Mapel: {mapel}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {ag.materiAjar}
              </h4>
              {ag.kegiatan && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-slate-200">Kegiatan Pembelajaran: </strong>
                  {ag.kegiatan}
                </p>
              )}
              {ag.catatan && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                  <strong className="not-italic text-slate-700 dark:text-slate-300">Catatan / Evaluasi: </strong>
                  {ag.catatan}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
