import React from 'react';
import { Calendar, ChevronDown, Edit2, Trash2, Plus } from 'lucide-react';
import { AttendanceSession } from '../../types';

interface AttendanceSessionSelectorProps {
  classSessions: AttendanceSession[];
  currentSession?: AttendanceSession;
  isMeetingsPanelOpen: boolean;
  onToggleMeetingsPanel: () => void;
  onCloseMeetingsPanel: () => void;
  onSelectSession: (id: string) => void;
  onStartEditSession: (session: AttendanceSession) => void;
  onDeleteSession: (session: AttendanceSession) => void;
  onOpenCreateSession: () => void;
}

export const AttendanceSessionSelector: React.FC<AttendanceSessionSelectorProps> = ({
  classSessions,
  currentSession,
  isMeetingsPanelOpen,
  onToggleMeetingsPanel,
  onCloseMeetingsPanel,
  onSelectSession,
  onStartEditSession,
  onDeleteSession,
  onOpenCreateSession,
}) => {
  if (classSessions.length === 0) {
    return (
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>Belum ada sesi pertemuan. Klik tombol <strong>"Buat Pertemuan Baru"</strong> untuk memulai pencatatan presensi yang tersinkronisasi langsung ke Agenda Mengajar.</span>
        <button
          onClick={onOpenCreateSession}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat Pertemuan Baru
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onToggleMeetingsPanel}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-between gap-3 shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>
              Pertemuan {currentSession ? `Ke-${currentSession.pertemuanKe} (${currentSession.tanggal})` : 'Pilih Pertemuan'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {classSessions.length} Pertemuan
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isMeetingsPanelOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Klik tombol di atas untuk membuka daftar seluruh pertemuan
        </span>
      </div>

      {/* Hidden / Expanded Dropdown Panel */}
      {isMeetingsPanelOpen && (
        <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pilih Sesi Pertemuan:
            </p>
            <button
              onClick={onCloseMeetingsPanel}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Tutup Panel ▲
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {classSessions.map((session) => {
              const isSelected = currentSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onCloseMeetingsPanel();
                  }}
                  className={`p-2.5 rounded-2xl text-xs font-semibold transition text-left border flex items-center justify-between gap-2 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/30'
                      : 'bg-white hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-950 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold leading-tight block truncate">
                      Pertemuan {session.pertemuanKe}
                    </span>
                    <span className={`text-[10px] block font-mono truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {session.tanggal}
                    </span>
                    {session.topikMateri && (
                      <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {session.topikMateri}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEditSession(session);
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isSelected
                          ? 'hover:bg-white/20 text-indigo-100 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'
                      }`}
                      title={`Edit Pertemuan Ke-${session.pertemuanKe}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session);
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isSelected
                          ? 'hover:bg-rose-500/40 text-rose-200 hover:text-white'
                          : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                      }`}
                      title={`Hapus Pertemuan Ke-${session.pertemuanKe}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
