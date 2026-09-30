import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, GraduationCap } from 'lucide-react';
import { ClassRoom } from '../types';

interface SearchableClassSelectProps {
  classes: ClassRoom[];
  selectedClassId: string;
  onChange: (classId: string) => void;
  placeholder?: string;
  required?: boolean;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export const SearchableClassSelect: React.FC<SearchableClassSelectProps> = ({
  classes,
  selectedClassId,
  onChange,
  placeholder = 'Pilih kelas...',
  required = false,
  includeAllOption = false,
  allOptionLabel = 'Semua Kelas',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isAllSelected = selectedClassId === 'all';
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = classes.filter(
    (c) =>
      c.namaKelas.toLowerCase().includes(query.toLowerCase()) ||
      (c.mataPelajaran || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.jurusan || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-left text-xs font-semibold text-slate-800 flex items-center justify-between shadow-2xs hover:border-[#009B62] focus:outline-none focus:ring-2 focus:ring-[#009B62]/30 cursor-pointer"
      >
        <span className="truncate">
          {isAllSelected
            ? allOptionLabel
            : selectedClass
            ? `${selectedClass.namaKelas} - ${selectedClass.mataPelajaran}`
            : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kelas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            {includeAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                  isAllSelected ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{allOptionLabel}</span>
                {isAllSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            )}

            {filtered.map((c) => {
              const isSelected = c.id === selectedClassId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-900">{c.namaKelas}</p>
                    <p className="text-[10px] text-slate-500">{c.mataPelajaran}</p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
