import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, School, X } from 'lucide-react';
import { ClassRoom } from '../types';

interface SearchableClassSelectProps {
  classes: ClassRoom[];
  selectedClassId: string;
  onChange: (classId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableClassSelect: React.FC<SearchableClassSelectProps> = ({
  classes,
  selectedClassId,
  onChange,
  placeholder = 'Pilih Kelas...',
  label,
  required = false,
  includeAllOption = false,
  allOptionLabel = 'Semua Kelas',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase().trim();
    return classes.filter(
      (c) =>
        c.namaKelas.toLowerCase().includes(q) ||
        (c.mataPelajaran && c.mataPelajaran.toLowerCase().includes(q)) ||
        (c.jurusan && c.jurusan.toLowerCase().includes(q))
    );
  }, [classes, searchQuery]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Button - Min 44px touch target */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] sm:min-h-[46px] px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition cursor-pointer select-none ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
            : isOpen
            ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-300 dark:border-slate-600 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <School className="w-4 h-4" />
          </div>

          <div className="truncate text-left">
            {selectedClassId === 'all' && includeAllOption ? (
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                {allOptionLabel}
              </span>
            ) : selectedClass ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                  {selectedClass.namaKelas}
                </span>
                {selectedClass.mataPelajaran && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium truncate">
                    {selectedClass.mataPelajaran}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama kelas / mapel..."
                className="w-full pl-8 pr-7 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 flex-1">
            {includeAllOption && !searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left transition hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 cursor-pointer ${
                  selectedClassId === 'all'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold">{allOptionLabel}</span>
                </div>
                {selectedClassId === 'all' && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </button>
            )}

            {filteredClasses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Tidak ada kelas yang cocok dengan "{searchQuery}"
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const isSelected = cls.id === selectedClassId;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelect(cls.id)}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left transition hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs sm:text-sm font-semibold dark:text-slate-100 truncate">
                          {cls.namaKelas}
                        </span>
                        {cls.jurusan && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                            {cls.jurusan}
                          </span>
                        )}
                      </div>
                      {cls.mataPelajaran && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                          Mapel: {cls.mataPelajaran} &bull; KKM: {cls.kkm}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
