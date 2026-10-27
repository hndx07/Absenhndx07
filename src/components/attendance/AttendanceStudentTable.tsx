import React from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  MessageSquare,
  Cloud,
  RefreshCw,
  Save,
} from 'lucide-react';
import { AttendanceSession, AttendanceStatus, Student } from '../../types';
import { SmoothHorizontalScroller } from '../SmoothHorizontalScroller';

interface AttendanceStudentTableProps {
  currentSession: AttendanceSession;
  filteredStudents: Student[];
  filterQuery: string;
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  isSavingToCloud: boolean;
  lastSavedTime: string | null;
  onFilterChange: (val: string) => void;
  onSortChange: (val: 'no' | 'name-asc' | 'name-desc') => void;
  onUpdateRecord: (studentId: string, status: AttendanceStatus, catatan?: string) => void;
  onOpenPersonalWa: (student: Student) => void;
  onSaveToCloud: () => void;
}

export const AttendanceStudentTable: React.FC<AttendanceStudentTableProps> = ({
  currentSession,
  filteredStudents,
  filterQuery,
  sortOrder,
  isSavingToCloud,
  lastSavedTime,
  onFilterChange,
  onSortChange,
  onUpdateRecord,
  onOpenPersonalWa,
  onSaveToCloud,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-3 p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-2">
        <h3 className="font-bold text-slate-800 text-sm">
          Daftar Kehadiran Murid
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari murid..."
              value={filterQuery}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => onSortChange('no')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                sortOrder === 'no' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
              }`}
              title="Urutkan No Urut"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => onSortChange('name-asc')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] ${
                sortOrder === 'name-asc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
              }`}
              title="Urutkan Abjad A-Z"
            >
              <ArrowUpAZ className="w-3 h-3" />
              <span>A-Z</span>
            </button>
            <button
              type="button"
              onClick={() => onSortChange('name-desc')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] ${
                sortOrder === 'name-desc' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
              }`}
              title="Urutkan Abjad Z-A"
            >
              <ArrowDownZA className="w-3 h-3" />
              <span>Z-A</span>
            </button>
          </div>
        </div>
      </div>

      <SmoothHorizontalScroller label="Tabel Presensi">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
              <th
                onClick={() => onSortChange('no')}
                className="py-3 px-3 text-center w-12 text-white cursor-pointer hover:bg-white/10 select-none transition"
                title="Klik untuk sortir nomor urut"
              >
                No
              </th>
              <th
                onClick={() => onSortChange(sortOrder === 'name-asc' ? 'name-desc' : 'name-asc')}
                className="py-3 px-3 min-w-[180px] text-white cursor-pointer hover:bg-white/10 select-none transition"
                title="Klik untuk sortir alfabetis A-Z / Z-A"
              >
                <div className="flex items-center gap-1.5">
                  <span>Nama Murid</span>
                  {sortOrder === 'name-asc' ? (
                    <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                      <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                    </span>
                  ) : sortOrder === 'name-desc' ? (
                    <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                      <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-white/70" />
                  )}
                </div>
              </th>
              <th className="py-3 px-3 text-center w-14 text-white">L/P</th>
              <th className="py-3 px-3 text-center min-w-[200px] text-white">Status Kehadiran</th>
              <th className="py-3 px-3 text-white">Keterangan / Alasan</th>
              <th className="py-3 px-3 text-center w-20 text-white">WA Ortu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredStudents.map((std, idx) => {
              const record = currentSession.records?.[std.id];
              const status = record?.status;
              const catatan = record?.catatan || '';

              return (
                <tr
                  key={std.id}
                  className={`transition ${
                    idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-emerald-50/20'
                  } hover:bg-emerald-50/50`}
                >
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                    {std.no}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    {std.nama}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-semibold text-slate-500">{std.gender}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {(['H', 'S', 'I', 'A', 'D'] as AttendanceStatus[]).map((st) => {
                        const isSelected = status === st;
                        let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                        if (isSelected) {
                          if (st === 'H') style = 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20';
                          else if (st === 'S') style = 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20';
                          else if (st === 'I') style = 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20';
                          else if (st === 'A') style = 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20';
                          else if (st === 'D') style = 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20';
                        }

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => onUpdateRecord(std.id, st)}
                            className={`w-8 h-8 rounded-xl font-bold font-mono transition text-xs flex items-center justify-center cursor-pointer ${style}`}
                            title={
                              st === 'H'
                                ? 'Hadir'
                                : st === 'S'
                                ? 'Sakit'
                                : st === 'I'
                                ? 'Izin'
                                : st === 'A'
                                ? 'Alpa'
                                : 'Dispensasi'
                            }
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      placeholder="Catatan izin/keterangan..."
                      value={catatan}
                      onChange={(e) => onUpdateRecord(std.id, status || 'H', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#009B62] bg-white"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenPersonalWa(std)}
                      className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs"
                      title={
                        std.noHpOrangTua
                          ? `Pratinjau / Kirim pesan WA santun ke orang tua ${std.nama} (${std.noHpOrangTua})`
                          : `Pratinjau pesan WA santun untuk orang tua ${std.nama}`
                      }
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>WA</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SmoothHorizontalScroller>

      {/* Table Footer with Prominent Save Button */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lastSavedTime
              ? `Terakhir disimpan ke Cloud Supabase: ${lastSavedTime}`
              : 'Perubahan presensi dapat langsung disimpan ke database Cloud secara real-time.'}
          </span>
        </div>
        <button
          type="button"
          onClick={onSaveToCloud}
          disabled={isSavingToCloud}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
        >
          {isSavingToCloud ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan ke Cloud Supabase...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Presensi ke Cloud</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
