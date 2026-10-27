import React from 'react';
import { Search, X, List, LayoutGrid } from 'lucide-react';
import { ClassRoom } from '../../types';
import { SearchableClassSelect } from '../SearchableClassSelect';

interface AgendaFiltersProps {
  classes: ClassRoom[];
  filterClassId: string;
  filterMonth: string;
  filterSemester: string;
  searchQuery: string;
  viewMode: 'table' | 'cards';
  filteredCount: number;
  totalCount: number;
  selectedClassObj: ClassRoom | null;
  onFilterClassChange: (clsId: string) => void;
  onFilterMonthChange: (month: string) => void;
  onFilterSemesterChange: (semester: string) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: 'table' | 'cards') => void;
}

export const AgendaFilters: React.FC<AgendaFiltersProps> = ({
  classes,
  filterClassId,
  filterMonth,
  filterSemester,
  searchQuery,
  viewMode,
  filteredCount,
  totalCount,
  selectedClassObj,
  onFilterClassChange,
  onFilterMonthChange,
  onFilterSemesterChange,
  onSearchChange,
  onViewModeChange,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Class Filter (Searchable Dropdown with min 44px touch target) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Filter Kelas
          </label>
          <SearchableClassSelect
            classes={classes}
            selectedClassId={filterClassId}
            onChange={onFilterClassChange}
            includeAllOption={true}
            allOptionLabel="Semua Kelas"
            placeholder="Pilih atau cari kelas..."
          />
        </div>

        {/* Month Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Bulan
          </label>
          <select
            value={filterMonth}
            onChange={(e) => onFilterMonthChange(e.target.value)}
            className="w-full min-h-[44px] sm:min-h-[46px] px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Semua Bulan</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        {/* Semester Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Semester
          </label>
          <select
            value={filterSemester}
            onChange={(e) => onFilterSemesterChange(e.target.value)}
            className="w-full min-h-[44px] sm:min-h-[46px] px-3 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Semua Semester</option>
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Pencarian
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari materi, kelas, topik..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[46px] pl-10 pr-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View mode toggle & active filter info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredCount}</strong> dari{' '}
          <span className="font-mono">{totalCount}</span> total agenda
          {filterClassId !== 'all' && (
            <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
              (Filter: {selectedClassObj?.namaKelas})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-xl transition ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Tampilan Tabel"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={`p-1.5 rounded-xl transition ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Tampilan Kartu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
