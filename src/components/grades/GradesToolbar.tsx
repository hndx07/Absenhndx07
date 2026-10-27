import React from 'react';
import { Search, ArrowUpAZ, ArrowDownZA } from 'lucide-react';

interface GradesToolbarProps {
  searchTerm: string;
  sortOrder: 'no' | 'name-asc' | 'name-desc';
  filteredCount: number;
  totalCount: number;
  scoresCount: number;
  onSearchChange: (val: string) => void;
  onSortChange: (val: 'no' | 'name-asc' | 'name-desc') => void;
}

export const GradesToolbar: React.FC<GradesToolbarProps> = ({
  searchTerm,
  sortOrder,
  filteredCount,
  totalCount,
  scoresCount,
  onSearchChange,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau NISN murid..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-xs"
          />
        </div>

        {/* Quick Sort Buttons */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => onSortChange('no')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              sortOrder === 'no'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Urutkan berdasarkan nomor urut murid"
          >
            <span>No Urut</span>
          </button>
          <button
            type="button"
            onClick={() => onSortChange('name-asc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              sortOrder === 'name-asc'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Urutkan berdasarkan abjad A ke Z"
          >
            <ArrowUpAZ className="w-3.5 h-3.5" />
            <span>Abjad A-Z</span>
          </button>
          <button
            type="button"
            onClick={() => onSortChange('name-desc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              sortOrder === 'name-desc'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Urutkan berdasarkan abjad Z ke A"
          >
            <ArrowDownZA className="w-3.5 h-3.5" />
            <span>Abjad Z-A</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Menampilkan {filteredCount} dari {totalCount} murid ({scoresCount} memiliki nilai) {sortOrder === 'name-asc' ? '(A-Z)' : sortOrder === 'name-desc' ? '(Z-A)' : ''}
      </p>
    </div>
  );
};
