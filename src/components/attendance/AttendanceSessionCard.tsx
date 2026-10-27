import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  BookMarked,
  Save,
  RefreshCw,
  MessageSquare,
  Edit2,
  Trash2,
} from 'lucide-react';
import { AttendanceSession, TeachingAgenda } from '../../types';

interface AttendanceSessionCardProps {
  currentSession: AttendanceSession;
  syncedAgenda: TeachingAgenda | null;
  totalStudents: number;
  attendanceRate: number;
  countH: number;
  countS: number;
  countI: number;
  countA: number;
  countD: number;
  isSavingToCloud: boolean;
  onNavigateToAgenda?: () => void;
  onSetAllPresent: () => void;
  onSaveToCloud: () => void;
  onOpenWaReport: () => void;
  onStartEditSession: () => void;
  onDeleteSession: () => void;
}

export const AttendanceSessionCard: React.FC<AttendanceSessionCardProps> = ({
  currentSession,
  syncedAgenda,
  totalStudents,
  attendanceRate,
  countH,
  countS,
  countI,
  countA,
  countD,
  isSavingToCloud,
  onNavigateToAgenda,
  onSetAllPresent,
  onSaveToCloud,
  onOpenWaReport,
  onStartEditSession,
  onDeleteSession,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2 bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white p-5 rounded-3xl shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 border border-white/30 rounded-full text-[11px] font-bold text-emerald-100">
                Pertemuan Ke-{currentSession.pertemuanKe}
              </span>
              {/* Badge Status Sinkronisasi Langsung ke Agenda Mengajar */}
              <div
                onClick={onNavigateToAgenda}
                className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/40 hover:bg-emerald-500/60 border border-emerald-300/40 rounded-full text-[10px] font-bold text-white transition cursor-pointer backdrop-blur-xs"
                title="Penginputan absen otomatis tersinkronisasi langsung ke Agenda Mengajar Pendidik"
              >
                <BookMarked className="w-3 h-3 text-emerald-200" />
                <span>Sinkron Agenda Mengajar</span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-300 text-emerald-950 text-[9px] font-black">
                  {syncedAgenda ? 'Tersinkron' : 'Otomatis'}
                </span>
              </div>
            </div>

            <span className="text-xs text-emerald-100 font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {currentSession.hari ? `${currentSession.hari}, ` : ''}{currentSession.tanggal}
            </span>
          </div>
          <h3 className="font-bold text-base mt-2 leading-snug text-white">
            {currentSession.topikMateri || 'Tanpa topik materi'}
          </h3>
          {(currentSession.jamKe || currentSession.rentangJam || currentSession.kegiatan) && (
            <div className="mt-2 space-y-1 text-xs text-emerald-100/90">
              {(currentSession.jamKe || currentSession.rentangJam) && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-200">
                  <Clock className="w-3 h-3" />
                  <span>Jam Ke: {currentSession.jamKe || '1 - 4'} ({currentSession.rentangJam || '07:15 - 09:15 WIB'})</span>
                </div>
              )}
              {currentSession.kegiatan && (
                <p className="text-[11px] text-emerald-100 line-clamp-2 italic">
                  Kegiatan: {currentSession.kegiatan}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onSetAllPresent}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Set Semua Hadir
            </button>

            <button
              type="button"
              onClick={onSaveToCloud}
              disabled={isSavingToCloud}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Simpan data sesi ini ke database cloud Supabase secara real-time dan sinkron ke agenda"
            >
              {isSavingToCloud ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Simpan ke Cloud</span>
            </button>

            {onNavigateToAgenda && (
              <button
                type="button"
                onClick={onNavigateToAgenda}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-300/40"
                title="Buka Buku Jurnal & Agenda Mengajar yang otomatis tersinkron"
              >
                <BookMarked className="w-3.5 h-3.5 text-indigo-200" />
                <span>Buka Agenda Mengajar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenWaReport}
              className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-emerald-300/40"
              title="Generate teks laporan absensi siap kirim ke WhatsApp / copy-paste"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
              <span>Salin Laporan WA</span>
            </button>
          </div>

          {/* Tombol Edit dan Hapus untuk Absen yang Sudah Dibuat */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStartEditSession}
              className="px-3.5 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white border border-amber-300/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Edit tanggal, nomor pertemuan, atau topik materi absen ini"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Edit Sesi</span>
            </button>

            <button
              type="button"
              onClick={onDeleteSession}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Hapus sesi pertemuan presensi ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Sesi</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-center">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          Persentase Hadir
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-black text-indigo-600 font-mono">
            {attendanceRate}%
          </span>
          <span className="text-xs text-slate-500 font-medium">
            ({countH + countD}/{totalStudents} Murid)
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-5 gap-1.5 text-center">
        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
          <span className="block text-emerald-800 font-bold text-base font-mono">{countH}</span>
          <span className="text-[10px] font-bold text-emerald-600">Hadir</span>
        </div>
        <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
          <span className="block text-blue-800 font-bold text-base font-mono">{countS}</span>
          <span className="text-[10px] font-bold text-blue-600">Sakit</span>
        </div>
        <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
          <span className="block text-amber-800 font-bold text-base font-mono">{countI}</span>
          <span className="text-[10px] font-bold text-amber-600">Izin</span>
        </div>
        <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
          <span className="block text-rose-800 font-bold text-base font-mono">{countA}</span>
          <span className="text-[10px] font-bold text-rose-600">Alfa</span>
        </div>
        <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
          <span className="block text-purple-800 font-bold text-base font-mono">{countD}</span>
          <span className="text-[10px] font-bold text-purple-600">Dispen</span>
        </div>
      </div>
    </div>
  );
};
