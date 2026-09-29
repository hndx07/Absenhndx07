import React, { useState, useEffect } from 'react';
import { CheckCircle2, UserCheck, Calendar, Clock, Plus, Trash2, Save, Share2, Search, Check, AlertCircle } from 'lucide-react';
import { ClassRoom, Student, AttendanceSession, AttendanceStatus, AttendanceRecord, TeacherProfile } from '../types';

interface AttendanceViewProps {
  activeClass: ClassRoom | null;
  students: Student[];
  sessions: AttendanceSession[];
  onSaveSession: (session: AttendanceSession) => Promise<void> | void;
  onDeleteSession: (sessionId: string) => Promise<void> | void;
  teacher: TeacherProfile;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  activeClass,
  students,
  sessions,
  onSaveSession,
  onDeleteSession,
  teacher,
}) => {
  const classStudents = students.filter(
    (s) => !activeClass || s.classId === activeClass.id
  ).sort((a, b) => a.no - b.no);

  const classSessions = sessions.filter(
    (s) => !activeClass || s.classId === activeClass.id
  ).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const [currentSessionId, setCurrentSessionId] = useState<string>(
    classSessions[0]?.id || ''
  );
  const [tanggal, setTanggal] = useState<string>(
    classSessions[0]?.tanggal || new Date().toISOString().split('T')[0]
  );
  const [pertemuanKe, setPertemuanKe] = useState<number>(
    classSessions[0]?.pertemuanKe || (classSessions.length + 1)
  );
  const [topikMateri, setTopikMateri] = useState<string>(
    classSessions[0]?.topikMateri || ''
  );
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>(
    classSessions[0]?.records || {}
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (classSessions.length > 0 && !currentSessionId) {
      const latest = classSessions[0];
      setCurrentSessionId(latest.id);
      setTanggal(latest.tanggal);
      setPertemuanKe(latest.pertemuanKe);
      setTopikMateri(latest.topikMateri || '');
      setRecords(latest.records || {});
    }
  }, [activeClass?.id, classSessions]);

  const handleSelectSession = (sessId: string) => {
    const s = classSessions.find((item) => item.id === sessId);
    if (s) {
      setCurrentSessionId(s.id);
      setTanggal(s.tanggal);
      setPertemuanKe(s.pertemuanKe);
      setTopikMateri(s.topikMateri || '');
      setRecords(s.records || {});
    }
  };

  const handleCreateNewSession = () => {
    const newId = `sess_${Date.now()}`;
    const nextPtm = classSessions.length + 1;
    const defaultRecs: Record<string, AttendanceRecord> = {};
    classStudents.forEach((st) => {
      defaultRecs[st.id] = { status: 'H', catatan: '' };
    });

    setCurrentSessionId(newId);
    setTanggal(new Date().toISOString().split('T')[0]);
    setPertemuanKe(nextPtm);
    setTopikMateri('');
    setRecords(defaultRecs);

    const newSess: AttendanceSession = {
      id: newId,
      classId: activeClass?.id || 'cls_default',
      tanggal: new Date().toISOString().split('T')[0],
      pertemuanKe: nextPtm,
      topikMateri: '',
      records: defaultRecs,
      created_at: new Date().toISOString(),
    };
    onSaveSession(newSess);
  };

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = {
      ...records,
      [studentId]: {
        ...records[studentId],
        status,
      },
    };
    setRecords(updated);
    saveCurrent(updated);
  };

  const handleSetCatatan = (studentId: string, catatan: string) => {
    const updated = {
      ...records,
      [studentId]: {
        ...records[studentId],
        status: records[studentId]?.status || 'H',
        catatan,
      },
    };
    setRecords(updated);
    saveCurrent(updated);
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {};
    classStudents.forEach((st) => {
      updated[st.id] = {
        status: 'H',
        catatan: records[st.id]?.catatan || '',
      };
    });
    setRecords(updated);
    saveCurrent(updated);
  };

  const saveCurrent = (recs = records) => {
    const sess: AttendanceSession = {
      id: currentSessionId || `sess_${Date.now()}`,
      classId: activeClass?.id || 'cls_default',
      tanggal,
      pertemuanKe,
      topikMateri,
      records: recs,
      updated_at: new Date().toISOString(),
    };
    onSaveSession(sess);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Metrics
  let hadir = 0,
    sakit = 0,
    izin = 0,
    alpa = 0,
    dispen = 0;
  classStudents.forEach((st) => {
    const stStat = records[st.id]?.status || 'H';
    if (stStat === 'H') hadir++;
    else if (stStat === 'S') sakit++;
    else if (stStat === 'I') izin++;
    else if (stStat === 'A') alpa++;
    else if (stStat === 'D') dispen++;
  });
  const totalStudents = classStudents.length;
  const attendancePct = totalStudents > 0 ? Math.round((hadir / totalStudents) * 100) : 100;

  const filteredStudents = classStudents.filter((st) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return st.nama.toLowerCase().includes(q) || (st.nisn || '').includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <UserCheck className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-black">Presensi Harian Siswa</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Pencatatan kehadiran peserta didik secara real-time & multi-pertemuan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              <span>Hadir Semua</span>
            </button>
            <button
              onClick={handleCreateNewSession}
              className="px-4 py-2.5 bg-white text-[#009B62] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#009B62]" />
              <span>Buat Sesi Pertemuan Baru</span>
            </button>
          </div>
        </div>

        {/* Active Session Parameters Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Pilih Sesi Pertemuan
            </label>
            <select
              value={currentSessionId}
              onChange={(e) => handleSelectSession(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              {classSessions.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  Pertemuan #{cs.pertemuanKe} ({cs.tanggal})
                </option>
              ))}
              {classSessions.length === 0 && <option value="">Belum ada sesi</option>}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Pertemuan Ke-
            </label>
            <input
              type="number"
              min={1}
              value={pertemuanKe}
              onChange={(e) => {
                setPertemuanKe(Number(e.target.value));
                saveCurrent();
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Tanggal Presensi
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                saveCurrent();
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Topik / Materi Pembelajaran
            </label>
            <input
              type="text"
              value={topikMateri}
              onChange={(e) => {
                setTopikMateri(e.target.value);
                saveCurrent();
              }}
              placeholder="Misal: Routing Dinamis OSPF"
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
            />
          </div>
        </div>

        {/* Attendance Counter Metrics */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-6 gap-3 bg-white border-b border-slate-100">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[11px] font-bold text-emerald-700 block">HADIR (H)</span>
            <span className="text-xl font-black text-emerald-800">{hadir}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
            <span className="text-[11px] font-bold text-blue-700 block">SAKIT (S)</span>
            <span className="text-xl font-black text-blue-800">{sakit}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[11px] font-bold text-amber-700 block">IZIN (I)</span>
            <span className="text-xl font-black text-amber-800">{izin}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-[11px] font-bold text-rose-700 block">ALPA (A)</span>
            <span className="text-xl font-black text-rose-800">{alpa}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-center">
            <span className="text-[11px] font-bold text-purple-700 block">DISPEN (D)</span>
            <span className="text-xl font-black text-purple-800">{dispen}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-600 block">% HADIR</span>
            <span className="text-xl font-black text-slate-800">{attendancePct}%</span>
          </div>
        </div>

        {/* Search & Auto-saved Indicator */}
        <div className="p-4 flex items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" /> Tersimpan Otomatis
              </span>
            )}
            {currentSessionId && classSessions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus sesi pertemuan ke-${pertemuanKe}?`)) {
                    onDeleteSession(currentSessionId);
                  }
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="Hapus Sesi Ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table of Attendance */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider">
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5 min-w-[180px]">Nama Peserta Didik</th>
                <th className="p-3.5 w-72 text-center">Status Kehadiran</th>
                <th className="p-3.5">Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Tidak ada siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const currentRec = records[st.id] || { status: 'H', catatan: '' };
                  const stStatus = currentRec.status || 'H';

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 text-center font-bold font-mono text-slate-400">
                        {st.no}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        <div>{st.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {st.nisn || `NISN: -`} • {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                          {(['H', 'S', 'I', 'A', 'D'] as AttendanceStatus[]).map((status) => {
                            const isSelected = stStatus === status;
                            const colors: Record<AttendanceStatus, string> = {
                              H: isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-800 hover:bg-emerald-50',
                              S: isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-blue-800 hover:bg-blue-50',
                              I: isSelected
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-amber-800 hover:bg-amber-50',
                              A: isSelected
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-rose-800 hover:bg-rose-50',
                              D: isSelected
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-purple-800 hover:bg-purple-50',
                            };

                            const labels: Record<AttendanceStatus, string> = {
                              H: 'Hadir',
                              S: 'Sakit',
                              I: 'Izin',
                              A: 'Alpa',
                              D: 'Dispen',
                            };

                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleSetStatus(st.id, status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${colors[status]}`}
                                title={labels[status]}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Catatan */}
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={currentRec.catatan || ''}
                          onChange={(e) => handleSetCatatan(st.id, e.target.value)}
                          placeholder="Catatan tambahan..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#009B62]"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
