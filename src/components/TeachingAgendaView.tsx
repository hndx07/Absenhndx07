import React, { useState, useMemo } from 'react';
import {
  BookMarked,
  Plus,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  Download,
  Search,
  Filter,
  Users,
  Building2,
  BookOpen,
  LayoutGrid,
  List,
  Cloud,
  RefreshCw,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { TeachingAgenda, ClassRoom, TeacherProfile } from '../types';
import { exportAgendasToExcel, exportToWordDocument, exportAgendaToPDF } from '../utils/exportUtils';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { SearchableClassSelect } from './SearchableClassSelect';
import { UiStatePersistence } from '../utils/storageCache';

interface TeachingAgendaViewProps {
  classes: ClassRoom[];
  agendas: TeachingAgenda[];
  teacher: TeacherProfile;
  currentClass?: ClassRoom;
  onSaveAgenda: (agenda: TeachingAgenda) => Promise<void> | void;
  onDeleteAgenda: (id: string) => Promise<void> | void;
}

export const TeachingAgendaView: React.FC<TeachingAgendaViewProps> = ({
  classes,
  agendas,
  teacher,
  currentClass,
  onSaveAgenda,
  onDeleteAgenda,
}) => {
  // Safe persisted filters
  const [filterClassId, setFilterClassId] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_class', 'all')
  );
  const [filterMonth, setFilterMonth] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_month', 'all')
  );
  const [filterSemester, setFilterSemester] = useState<string>(() =>
    UiStatePersistence.get('agenda_filter_semester', 'all')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<Partial<TeachingAgenda> | null>(null);

  // Map of classId -> className & subject
  const classesMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => {
      map[c.id] = c.namaKelas;
    });
    return map;
  }, [classes]);

  const classSubjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((c) => {
      map[c.id] = c.mataPelajaran;
    });
    return map;
  }, [classes]);

  // Persist filter changes
  const handleFilterClassChange = (clsId: string) => {
    setFilterClassId(clsId);
    UiStatePersistence.set('agenda_filter_class', clsId);
  };

  const handleFilterMonthChange = (m: string) => {
    setFilterMonth(m);
    UiStatePersistence.set('agenda_filter_month', m);
  };

  const handleFilterSemesterChange = (s: string) => {
    setFilterSemester(s);
    UiStatePersistence.set('agenda_filter_semester', s);
  };

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return agendas
      .filter((ag) => {
        // Class filter
        if (filterClassId !== 'all' && ag.classId !== filterClassId) {
          return false;
        }
        // Month filter
        if (filterMonth !== 'all' && ag.tanggal) {
          const m = new Date(ag.tanggal).getMonth() + 1;
          if (String(m).padStart(2, '0') !== filterMonth) {
            return false;
          }
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const clsName = (classesMap[ag.classId] || ag.classNameSnapshot || '').toLowerCase();
          const mapel = (classSubjectMap[ag.classId] || ag.mataPelajaran || '').toLowerCase();
          const matchMateri = (ag.materiAjar || '').toLowerCase().includes(q);
          const matchKegiatan = (ag.kegiatan || '').toLowerCase().includes(q);
          const matchCatatan = (ag.catatan || '').toLowerCase().includes(q);
          const matchClass = clsName.includes(q);
          const matchMapel = mapel.includes(q);
          const matchHari = (ag.hari || '').toLowerCase().includes(q);
          if (!matchMateri && !matchKegiatan && !matchCatatan && !matchClass && !matchMapel && !matchHari) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [agendas, filterClassId, filterMonth, searchQuery, classesMap, classSubjectMap]);

  // Current selected class object if not 'all'
  const selectedClassObj = useMemo(() => {
    if (filterClassId === 'all') return null;
    return classes.find((c) => c.id === filterClassId) || null;
  }, [classes, filterClassId]);

  // Metrics
  const stats = useMemo(() => {
    const total = filteredAgendas.length;
    const totalHadir = filteredAgendas.reduce((acc, a) => acc + (a.hadirCount || 0), 0);
    const totalAbsen = filteredAgendas.reduce((acc, a) => acc + (a.tidakHadirCount || 0), 0);
    const sum = totalHadir + totalAbsen;
    const avgKehadiran = sum > 0 ? Math.round((totalHadir / sum) * 100) : 100;
    return { total, totalHadir, totalAbsen, avgKehadiran };
  }, [filteredAgendas]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = days[today.getDay()];

    // Default to the first available class or currentClass
    const initialClassId =
      (filterClassId !== 'all' ? filterClassId : '') ||
      (currentClass ? currentClass.id : '') ||
      (classes.length > 0 ? classes[0].id : '');

    const initialClass = classes.find((c) => c.id === initialClassId);

    setEditingAgenda({
      id: `ag_${Date.now()}`,
      classId: initialClassId,
      classNameSnapshot: initialClass?.namaKelas || '',
      mataPelajaran: initialClass?.mataPelajaran || teacher.mataPelajaranUtama || '',
      guruName: teacher.namaGuru,
      tanggal: today.toISOString().split('T')[0],
      hari: currentDay,
      jamKe: '1 - 4',
      rentangJam: '07.00 - 09.45 WIB',
      materiAjar: '',
      kegiatan: '',
      catatan: 'Pembelajaran berlangsung kondusif dan tertib.',
      hadirCount: 32,
      tidakHadirCount: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ag: TeachingAgenda) => {
    setEditingAgenda({ ...ag });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda?.classId) {
      alert('Pilih kelas terlebih dahulu!');
      return;
    }
    if (!editingAgenda?.materiAjar?.trim()) {
      alert('Materi ajar / Capaian pembelajaran wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const cls = classes.find((c) => c.id === editingAgenda.classId);
      const agendaToSave: TeachingAgenda = {
        ...(editingAgenda as TeachingAgenda),
        classNameSnapshot: cls?.namaKelas || editingAgenda.classNameSnapshot || '',
        mataPelajaran: cls?.mataPelajaran || editingAgenda.mataPelajaran || teacher.mataPelajaranUtama || '',
        guruName: teacher.namaGuru,
        updated_at: new Date().toISOString(),
      };

      await onSaveAgenda(agendaToSave);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSyncTime(timeStr);
      setSyncStatusMsg(`Agenda pertemuan ke-${editingAgenda.pertemuanKe || 1} berhasil disimpan ke Cloud Supabase!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
      setIsModalOpen(false);
      setEditingAgenda(null);
    } catch (err: any) {
      alert('Gagal menyimpan agenda: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAllAgendas = async () => {
    if (filteredAgendas.length === 0) return;
    setIsSavingAll(true);
    try {
      const promises = filteredAgendas.map((ag) => onSaveAgenda(ag));
      await Promise.all(promises);
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLastSyncTime(timeStr);
      setSyncStatusMsg(`Seluruh ${filteredAgendas.length} agenda berhasil disinkronkan ke Cloud Supabase!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan agenda ke cloud: ' + (err.message || 'Error'));
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleExportWord = () => {
    const isMultiClass = filterClassId === 'all';
    const classNameHeader = isMultiClass ? 'Semua Kelas' : selectedClassObj?.namaKelas || 'Kelas';
    const mapelHeader = isMultiClass ? teacher.mataPelajaranUtama || 'Semua Mapel' : selectedClassObj?.mataPelajaran || '';

    const rowsHtml = filteredAgendas
      .map(
        (ag, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${ag.hari}, ${ag.tanggal}</td>
          ${isMultiClass ? `<td><strong>${classesMap[ag.classId] || ag.classNameSnapshot || '-'}</strong></td>` : ''}
          <td style="text-align:center;">Jam ${ag.jamKe}<br><small>${ag.rentangJam}</small></td>
          <td><strong>${ag.materiAjar}</strong></td>
          <td>${ag.kegiatan || '-'}</td>
          <td>${ag.catatan || '-'}</td>
          <td style="text-align:center;">${ag.hadirCount}</td>
          <td style="text-align:center;">${ag.tidakHadirCount}</td>
        </tr>
      `
      )
      .join('');

    const contentHtml = `
      <h3 style="text-align:center; margin-bottom: 4px;">BUKU JURNAL & AGENDA MENGAJAR GURU</h3>
      <p style="text-align:center; margin: 0 0 15px 0;">
        Guru: <strong>${teacher.namaGuru}</strong> (NBM/NIP: ${teacher.nbm || teacher.nip || '-'}) | 
        Kelas: <strong>${classNameHeader}</strong> | Mapel: <strong>${mapelHeader}</strong> | 
        Tahun Ajaran: ${teacher.tahunAjaran} (${teacher.semester})
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:5%;">No</th>
            <th style="width:14%;">Hari / Tanggal</th>
            ${isMultiClass ? '<th style="width:12%;">Kelas</th>' : ''}
            <th style="width:12%;">Jam Pelajaran</th>
            <th style="width:25%;">Materi Pokok / TP</th>
            <th style="width:20%;">Kegiatan Pembelajaran</th>
            <th style="width:14%;">Catatan / Kendala</th>
            <th style="width:5%;">Hadir</th>
            <th style="width:5%;">Absen</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const fileName = isMultiClass
      ? `Jurnal_Mengajar_Semua_Kelas_${teacher.tahunAjaran.replace(/\//g, '-')}`
      : `Jurnal_Mengajar_${selectedClassObj?.namaKelas.replace(/\s+/g, '_')}`;

    exportToWordDocument(fileName, contentHtml);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full border border-indigo-100 dark:border-indigo-900/60">
              {filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas || 'Kelas Terpilih'}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {filterClassId === 'all' ? teacher.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              T.A. {teacher.tahunAjaran} ({teacher.semester})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Buku Jurnal / Agenda Mengajar Guru
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan tatap muka, materi TP Kurikulum Merdeka, dan dinamika kelas guru {SCHOOL_CONFIG.namaSekolah}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewPdfOpen(true)}
            className="min-h-[44px] px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Lihat format cetak PDF resmi"
          >
            <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Preview PDF
          </button>

          <button
            type="button"
            onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
            className="min-h-[44px] px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer"
            title="Unduh berkas PDF siap cetak"
          >
            <Download className="w-4 h-4" />
            Unduh PDF
          </button>

          <button
            type="button"
            onClick={() => exportAgendasToExcel(filteredAgendas, selectedClassObj, teacher, classesMap)}
            className="min-h-[44px] px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Excel
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            className="min-h-[44px] px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-800 dark:text-blue-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-900 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Word
          </button>

          {/* Tombol Simpan Agenda ke Cloud Supabase */}
          <button
            type="button"
            onClick={handleSyncAllAgendas}
            disabled={isSavingAll || filteredAgendas.length === 0}
            className="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            title="Simpan dan sinkronkan seluruh agenda mengajar ke database cloud Supabase secara real-time"
          >
            {isSavingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Cloud...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Simpan Agenda ke Cloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Agenda Baru
          </button>
        </div>
      </div>

      {/* Real-time Save Notification Banner */}
      {syncStatusMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          {lastSyncTime && (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
              {lastSyncTime}
            </span>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Agenda
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {stats.total} <span className="text-xs font-normal text-slate-500">pertemuan</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kelas Terpantau
          </p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {filterClassId === 'all' ? classes.length : 1} <span className="text-xs font-normal text-slate-500">kelas</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rata-rata Hadir
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats.avgKehadiran}%
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tahun Ajaran
          </p>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-2 truncate">
            {teacher.tahunAjaran} ({teacher.semester})
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
              onChange={handleFilterClassChange}
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
              onChange={(e) => handleFilterMonthChange(e.target.value)}
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
              onChange={(e) => handleFilterSemesterChange(e.target.value)}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[46px] pl-10 pr-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredAgendas.length}</strong> dari{' '}
            <span className="font-mono">{agendas.length}</span> total agenda
            {filterClassId !== 'all' && (
              <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                (Filter: {selectedClassObj?.namaKelas})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
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
              onClick={() => setViewMode('cards')}
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

      {/* Agenda Entries Display */}
      {filteredAgendas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Tidak ada catatan agenda mengajar yang sesuai filter.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Klik "Catat Agenda Baru" untuk menambahkan kegiatan pembelajaran atau ubah kriteria filter di atas.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (User specification 3: | Tanggal | Guru | Mapel | Kelas | Pertemuan | Materi | Status |) */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3 w-28">Tanggal</th>
                  <th className="py-3 px-3 min-w-[130px]">Guru</th>
                  <th className="py-3 px-3 min-w-[140px]">Mapel</th>
                  <th className="py-3 px-3 min-w-[110px]">Kelas</th>
                  <th className="py-3 px-3 text-center w-28">Pertemuan / Jam</th>
                  <th className="py-3 px-4 min-w-[260px]">Materi & Kegiatan</th>
                  <th className="py-3 px-3 text-center w-24">Kehadiran</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAgendas.map((ag, idx) => {
                  const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
                  const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';
                  const guru = ag.guruName || teacher.namaGuru;

                  return (
                    <tr
                      key={ag.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {ag.tanggal}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {ag.hari}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {guru}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 dark:text-slate-300">
                          {mapel}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] inline-block border border-indigo-100 dark:border-indigo-900/60">
                          {clsName}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          Ke-{ag.jamKe}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {ag.rentangJam}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white leading-snug">
                          {ag.materiAjar}
                        </p>
                        {ag.kegiatan && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {ag.kegiatan}
                          </p>
                        )}
                        {ag.catatan && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                            Catatan: {ag.catatan}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          H: {ag.hadirCount ?? 0}
                        </span>
                        {ag.tidakHadirCount > 0 && (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px]">
                            A: {ag.tidakHadirCount}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ag)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                            title="Edit Catatan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                                await onDeleteAgenda(ag.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Prominent Save Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {lastSyncTime
                  ? `Terakhir disimpan ke Cloud Supabase: ${lastSyncTime}`
                  : 'Seluruh agenda mengajar tersimpan aman dan terenkripsi di PostgreSQL Supabase.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncAllAgendas}
              disabled={isSavingAll || filteredAgendas.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {isSavingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Semua Agenda ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="space-y-4">
          {filteredAgendas.map((ag) => {
            const clsName = classesMap[ag.classId] || ag.classNameSnapshot || 'Kelas';
            const mapel = classSubjectMap[ag.classId] || ag.mataPelajaran || teacher.mataPelajaranUtama || '-';

            return (
              <div
                key={ag.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold font-mono">
                      {ag.hari}, {ag.tanggal}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-900/60">
                      {clsName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Jam: {ag.jamKe} ({ag.rentangJam})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold">
                      Hadir: {ag.hadirCount}
                    </span>
                    {ag.tidakHadirCount > 0 && (
                      <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold">
                        Absen: {ag.tidakHadirCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ag)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition ml-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Hapus catatan agenda "${ag.materiAjar}"?`)) {
                          await onDeleteAgenda(ag.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Mapel: {mapel}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {ag.materiAjar}
                  </h4>
                  {ag.kegiatan && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <strong className="text-slate-800 dark:text-slate-200">Kegiatan Pembelajaran: </strong>
                      {ag.kegiatan}
                    </p>
                  )}
                  {ag.catatan && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                      <strong className="not-italic text-slate-700 dark:text-slate-300">Catatan / Evaluasi: </strong>
                      {ag.catatan}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Agenda */}
      {isModalOpen && editingAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingAgenda.materiAjar ? 'Edit Agenda Mengajar' : 'Catat Agenda Mengajar Baru'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Dapat dicatat untuk semua kelas yang tersedia pada Data Kelas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Kelas (Searchable Dropdown with min 44px touch target) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Kelas / Rombel Target <span className="text-rose-500">*</span>
                </label>
                <SearchableClassSelect
                  classes={classes}
                  selectedClassId={editingAgenda.classId || ''}
                  onChange={(newClsId) => {
                    const sel = classes.find((c) => c.id === newClsId);
                    setEditingAgenda({
                      ...editingAgenda,
                      classId: newClsId,
                      classNameSnapshot: sel?.namaKelas || '',
                      mataPelajaran: sel?.mataPelajaran || editingAgenda.mataPelajaran || teacher.mataPelajaranUtama,
                    });
                  }}
                  placeholder="Pilih kelas yang diajar..."
                  required
                />
              </div>

              {/* Grid Tanggal, Hari, Jam Ke */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={editingAgenda.tanggal || ''}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      setEditingAgenda({
                        ...editingAgenda,
                        tanggal: e.target.value,
                        hari: days[d.getDay()] || 'Senin',
                      });
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hari
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAgenda.hari || ''}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, hari: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Jam Ke-
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 - 4"
                    value={editingAgenda.jamKe || ''}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, jamKe: e.target.value })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Rentang Waktu
                </label>
                <input
                  type="text"
                  placeholder="07.00 - 09.45 WIB"
                  value={editingAgenda.rentangJam || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, rentangJam: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Materi Pokok / Capaian Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Analisis Kebutuhan Bandwidth & Konfigurasi Simple Queue"
                  value={editingAgenda.materiAjar || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, materiAjar: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Kegiatan Pembelajaran & Sintaks
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi kegiatan (Apersepsi, Diskusi kelompok, Praktikum lab, Refleksi)..."
                  value={editingAgenda.kegiatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, kegiatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Catatan / Evaluasi / Kendala
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan keaktifan siswa, kendala perangkat lab, atau tindak lanjut..."
                  value={editingAgenda.catatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, catatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Jumlah Hadir
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingAgenda.hadirCount ?? 0}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, hadirCount: Number(e.target.value) })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Jumlah Tidak Hadir
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingAgenda.tidakHadirCount ?? 0}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, tidakHadirCount: Number(e.target.value) })}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Cloud Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Simpan Agenda ke Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview PDF Agenda Mengajar */}
      {isPreviewPdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Pratinjau Dokumen PDF Agenda Mengajar
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {filterClassId === 'all' ? 'Seluruh Kelas' : selectedClassObj?.namaKelas} &bull; T.A. {teacher.tahunAjaran} ({teacher.semester})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewPdfOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Paper Simulation Canvas */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1">
              <div className="bg-white mx-auto p-6 sm:p-10 shadow-lg rounded-xl border border-slate-200 text-slate-900 max-w-[210mm] font-serif leading-relaxed text-xs">
                {/* Kop Sekolah */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <p className="font-bold text-[11px] tracking-wide text-slate-700 uppercase">
                    MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL
                  </p>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase my-0.5">
                    {SCHOOL_CONFIG.namaSekolah}
                  </h1>
                  <p className="text-[10px] text-slate-600">
                    Alamat: {SCHOOL_CONFIG.alamat} &bull; Website: {SCHOOL_CONFIG.website} &bull; Telp: {SCHOOL_CONFIG.telepon}
                  </p>
                </div>

                {/* Document Title */}
                <div className="text-center mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-wider underline">
                    BUKU JURNAL / AGENDA MENGAJAR GURU
                  </h2>
                </div>

                {/* Guru & Rombel Info */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-5 font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <p><span className="text-slate-500 inline-block w-28">Nama Guru:</span> <strong>{teacher.namaGuru}</strong></p>
                    <p><span className="text-slate-500 inline-block w-28">NBM / NIP:</span> {teacher.nbm || teacher.nip || '-'}</p>
                    <p><span className="text-slate-500 inline-block w-28">Mata Pelajaran:</span> {filterClassId === 'all' ? teacher.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 inline-block w-28">Kelas / Rombel:</span> <strong>{filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas}</strong></p>
                    <p><span className="text-slate-500 inline-block w-28">Tahun Ajaran:</span> {teacher.tahunAjaran}</p>
                    <p><span className="text-slate-500 inline-block w-28">Semester:</span> {teacher.semester}</p>
                  </div>
                </div>

                {/* Table Agendas */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full border-collapse border border-slate-300 text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 p-2 text-center w-8">No</th>
                        <th className="border border-slate-300 p-2 text-left w-24">Hari / Tanggal</th>
                        {filterClassId === 'all' && (
                          <th className="border border-slate-300 p-2 text-center w-20">Kelas</th>
                        )}
                        <th className="border border-slate-300 p-2 text-center w-14">Jam Ke</th>
                        <th className="border border-slate-300 p-2 text-left">Materi / Capaian Pembelajaran</th>
                        <th className="border border-slate-300 p-2 text-center w-12">Hadir</th>
                        <th className="border border-slate-300 p-2 text-center w-12">Absen</th>
                        <th className="border border-slate-300 p-2 text-center w-16">Paraf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgendas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={filterClassId === 'all' ? 8 : 7}
                            className="border border-slate-300 p-4 text-center text-slate-400 italic"
                          >
                            Belum ada entri jurnal mengajar yang sesuai.
                          </td>
                        </tr>
                      ) : (
                        filteredAgendas.map((ag, idx) => (
                          <tr key={ag.id} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                            <td className="border border-slate-300 p-2 font-medium">{ag.hari?.substring(0, 3)}, {ag.tanggal}</td>
                            {filterClassId === 'all' && (
                              <td className="border border-slate-300 p-2 text-center font-bold">
                                {classesMap[ag.classId] || ag.classNameSnapshot || '-'}
                              </td>
                            )}
                            <td className="border border-slate-300 p-2 text-center font-mono">Ke-{ag.jamKe}</td>
                            <td className="border border-slate-300 p-2">
                              <p className="font-semibold text-slate-800">{ag.materiAjar}</p>
                              {ag.kegiatan && <p className="text-[10px] text-slate-500 mt-0.5">{ag.kegiatan}</p>}
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-mono text-emerald-700 font-bold">{ag.hadirCount ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-mono text-rose-700 font-bold">{ag.tidakHadirCount ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center text-slate-300 font-mono text-[9px]">&#10003;</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div className="flex justify-end pt-4 font-sans text-xs">
                  <div className="text-center w-64">
                    <p className="text-slate-600">
                      Bawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-slate-600 mt-0.5">Guru Pengampu Mata Pelajaran,</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-bold underline text-slate-900">{teacher.namaGuru}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      NBM / NIP: {teacher.nbm || teacher.nip || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Format resmi sesuai standar kurikulum {SCHOOL_CONFIG.namaSekolah}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewPdfOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => exportAgendaToPDF(filteredAgendas, selectedClassObj, teacher, classesMap)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
