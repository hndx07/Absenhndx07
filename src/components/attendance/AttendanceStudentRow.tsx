import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { AttendanceStatus, Student } from '../../types';

export interface AttendanceStudentRowProps {
  student: Student;
  status: AttendanceStatus | undefined;
  catatan: string;
  index: number;
  onUpdateRecord: (studentId: string, status: AttendanceStatus, catatan?: string) => void;
  onOpenPersonalWa: (student: Student) => void;
}

const STATUS_OPTIONS: AttendanceStatus[] = ['H', 'S', 'I', 'A', 'D'];

export const AttendanceStudentRow: React.FC<AttendanceStudentRowProps> = React.memo(
  ({
    student,
    status,
    catatan = '',
    index,
    onUpdateRecord,
    onOpenPersonalWa,
  }) => {
    // Local state for instant typing with zero lag and no table re-renders
    const [localCatatan, setLocalCatatan] = useState(catatan);
    const isTypingRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync from prop only when user is not actively typing
    useEffect(() => {
      if (!isTypingRef.current) {
        setLocalCatatan(catatan || '');
      }
    }, [catatan]);

    // Clean up timer on unmount
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const commitCatatan = (val: string) => {
      if (val !== catatan) {
        onUpdateRecord(student.id, status || 'H', val);
      }
    };

    const handleCatatanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalCatatan(val);
      isTypingRef.current = true;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 500ms debounce: commits to parent and cloud only after user pauses typing
      debounceTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        commitCatatan(val);
      }, 500);
    };

    const handleBlur = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      isTypingRef.current = false;
      commitCatatan(localCatatan);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    const handleStatusClick = (st: AttendanceStatus) => {
      // Cancel pending debounce and commit immediately with the latest note
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      isTypingRef.current = false;
      onUpdateRecord(student.id, st, localCatatan);
    };

    return (
      <tr
        className={`transition ${
          index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'
        } hover:bg-emerald-50/50`}
      >
        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
          {student.no}
        </td>
        <td className="py-2.5 px-3 font-bold text-slate-800">
          {student.nama}
        </td>
        <td className="py-2.5 px-3 text-center">
          <span className="font-semibold text-slate-500">{student.gender}</span>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center justify-center gap-1.5">
            {STATUS_OPTIONS.map((st) => {
              const isSelected = status === st;
              let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
              if (isSelected) {
                if (st === 'H') style = 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20';
                else if (st === 'S') style = 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20';
                else if (st === 'I') style = 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/20';
                else if (st === 'A') style = 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/20';
                else if (st === 'D') style = 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/20';
              }

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusClick(st)}
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
            value={localCatatan}
            onChange={handleCatatanChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#009B62] bg-white transition shadow-2xs"
          />
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            type="button"
            onClick={() => onOpenPersonalWa(student)}
            className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs"
            title={
              student.noHpOrangTua
                ? `Pratinjau / Kirim pesan WA santun ke orang tua ${student.nama} (${student.noHpOrangTua})`
                : `Pratinjau pesan WA santun untuk orang tua ${student.nama}`
            }
          >
            <MessageSquare className="w-3 h-3 text-emerald-600" />
            <span>WA</span>
          </button>
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparator to ensure only modified rows re-render
    return (
      prevProps.student.id === nextProps.student.id &&
      prevProps.student.nama === nextProps.student.nama &&
      prevProps.student.no === nextProps.student.no &&
      prevProps.student.gender === nextProps.student.gender &&
      prevProps.status === nextProps.status &&
      prevProps.catatan === nextProps.catatan &&
      prevProps.index === nextProps.index &&
      prevProps.onUpdateRecord === nextProps.onUpdateRecord &&
      prevProps.onOpenPersonalWa === nextProps.onOpenPersonalWa
    );
  }
);
