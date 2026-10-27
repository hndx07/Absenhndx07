import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface AttendanceFloatingSaveProps {
  hasUnsavedChanges: boolean;
  isSavingToCloud: boolean;
  onSaveToCloud: () => void;
}

export const AttendanceFloatingSave: React.FC<AttendanceFloatingSaveProps> = ({
  hasUnsavedChanges,
  isSavingToCloud,
  onSaveToCloud,
}) => {
  if (!hasUnsavedChanges) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <span className="text-xs font-semibold">Ada perubahan isian presensi yang siap disimpan ke cloud.</span>
      </div>
      <button
        type="button"
        onClick={onSaveToCloud}
        disabled={isSavingToCloud}
        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition disabled:opacity-50"
      >
        {isSavingToCloud ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Simpan Sekarang
      </button>
    </div>
  );
};
