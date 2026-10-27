import React from 'react';
import { Sliders, X, Cloud } from 'lucide-react';
import { GradeColumn } from '../../types';

interface GradesColumnSettingsModalProps {
  isOpen: boolean;
  activeColumnsCount: number;
  editingColumns: GradeColumn[];
  onClose: () => void;
  onSave: () => void;
  setEditingColumns: React.Dispatch<React.SetStateAction<GradeColumn[]>>;
}

export const GradesColumnSettingsModal: React.FC<GradesColumnSettingsModalProps> = ({
  isOpen,
  activeColumnsCount,
  editingColumns,
  onClose,
  onSave,
  setEditingColumns,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Atur Label Asesmen Formatif</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {editingColumns.slice(0, activeColumnsCount).map((col, idx) => (
            <div key={col.id} className="flex items-center gap-2">
              <span className="w-20 font-mono font-bold text-xs text-slate-500">Formatif {idx + 1}</span>
              <input
                type="text"
                value={col.label}
                onChange={(e) => {
                  const updated = [...editingColumns];
                  updated[idx] = { ...updated[idx], label: e.target.value };
                  setEditingColumns(updated);
                }}
                placeholder={`Nama materi Formatif ${idx + 1}...`}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-slate-200 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition"
          >
            <Cloud className="w-4 h-4" />
            Simpan Konfigurasi ke Cloud
          </button>
        </div>
      </div>
    </div>
  );
};
