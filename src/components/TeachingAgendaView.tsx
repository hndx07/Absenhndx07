import React, { useState } from 'react';
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
  Printer,
  Sparkles,
} from 'lucide-react';
import { TeachingAgenda, ClassRoom, TeacherProfile } from '../types';
import { exportAgendasToExcel, exportToWordDocument } from '../utils/exportUtils';

interface TeachingAgendaViewProps {
  currentClass: ClassRoom;
  agendas: TeachingAgenda[];
  teacher: TeacherProfile;
  onSaveAgenda: (agenda: TeachingAgenda) => void;
  onDeleteAgenda: (id: string) => void;
}

export const TeachingAgendaView: React.FC<TeachingAgendaViewProps> = ({
  currentClass,
  agendas,
  teacher,
  onSaveAgenda,
  onDeleteAgenda,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<Partial<TeachingAgenda> | null>(null);

  const classAgendas = agendas
    .filter((a) => a.classId === currentClass.id)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const handleOpenAdd = () => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = days[today.getDay()];

    setEditingAgenda({
      id: `ag_${Date.now()}`,
      classId: currentClass.id,
      tanggal: today.toISOString().split('T')[0],
      hari: currentDay,
      jamKe: '1 - 4',
      rentangJam: '07.00 - 09.45 WIB',
      materiAjar: '',
      kegiatan: '',
      catatan: 'Pembelajaran berlangsung kondusif dan tertib.',
      hadirCount: 12,
      tidakHadirCount: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ag: TeachingAgenda) => {
    setEditingAgenda({ ...ag });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda?.materiAjar) {
      alert('Materi ajar wajib diisi!');
      return;
    }
    onSaveAgenda(editingAgenda as TeachingAgenda);
    setIsModalOpen(false);
    setEditingAgenda(null);
  };

  const handleExportWord = () => {
    const rowsHtml = classAgendas
      .map(
        (ag, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${ag.hari}, ${ag.tanggal}</td>
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
        Guru: <strong>${teacher.namaGuru}</strong> (NBM/NIP: ${teacher.nbm || teacher.nip}) | 
        Kelas: <strong>${currentClass.namaKelas}</strong> | Mapel: <strong>${currentClass.mataPelajaran}</strong> | 
        Tahun Ajaran: ${teacher.tahunAjaran} (${teacher.semester})
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:5%;">No</th>
            <th style="width:15%;">Hari / Tanggal</th>
            <th style="width:12%;">Jam Pelajaran</th>
            <th style="width:25%;">Materi Pokok / TP</th>
            <th style="width:25%;">Kegiatan Pembelajaran</th>
            <th style="width:18%;">Catatan / Kendala</th>
            <th style="width:5%;">Hadir</th>
            <th style="width:5%;">Absen</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    exportToWordDocument(`Jurnal_Mengajar_${currentClass.namaKelas}`, contentHtml);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
              {currentClass.namaKelas}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-medium text-slate-500">{currentClass.mataPelajaran}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Buku Jurnal / Agenda Mengajar
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan rekam jejak tatap muka, materi ajar, dan dinamika kelas guru SMK Muhammadiyah Bawang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportAgendasToExcel(classAgendas, currentClass, teacher)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportWord}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Unduh Word (.doc)
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Catat Agenda Baru
          </button>
        </div>
      </div>

      {/* Agenda Entries List */}
      <div className="space-y-4">
        {classAgendas.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
            <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700">Belum ada catatan jurnal mengajar di kelas ini.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klik "Catat Agenda Baru" untuk mendokumentasikan kegiatan pembelajaran Anda hari ini.
            </p>
          </div>
        ) : (
          classAgendas.map((ag) => (
            <div
              key={ag.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-200 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold font-mono">
                    {ag.hari}, {ag.tanggal}
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Jam Ke: {ag.jamKe} ({ag.rentangJam})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                    Hadir: {ag.hadirCount}
                  </span>
                  {ag.tidakHadirCount > 0 && (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold">
                      Absen: {ag.tidakHadirCount}
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenEdit(ag)}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition ml-2"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Hapus catatan agenda ini?')) {
                        onDeleteAgenda(ag.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                  {ag.materiAjar}
                </h4>
                {ag.kegiatan && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <strong className="text-slate-800">Kegiatan Pembelajaran: </strong>
                    {ag.kegiatan}
                  </p>
                )}
                {ag.catatan && (
                  <p className="text-xs text-slate-500 mt-2 italic">
                    <strong className="not-italic text-slate-700">Catatan / Evaluasi: </strong>
                    {ag.catatan}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Agenda */}
      {isModalOpen && editingAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingAgenda.materiAjar ? 'Edit Agenda Mengajar' : 'Catat Agenda Mengajar Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tanggal</label>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Hari</label>
                  <input
                    type="text"
                    required
                    value={editingAgenda.hari || ''}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, hari: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jam Ke-</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 - 4"
                    value={editingAgenda.jamKe || ''}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, jamKe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Rentang Waktu</label>
                <input
                  type="text"
                  placeholder="07.00 - 09.45 WIB"
                  value={editingAgenda.rentangJam || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, rentangJam: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Materi Pokok / Capaian Pembelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Analisis Kebutuhan Bandwidth & Konfigurasi Simple Queue"
                  value={editingAgenda.materiAjar || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, materiAjar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Kegiatan Pembelajaran & Sintaks
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi langkah pembelajaran (Apersepsi, Diskusi kelompok, Praktikum lab, Refleksi)..."
                  value={editingAgenda.kegiatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, kegiatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Catatan / Evaluasi / Kendala
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan keaktifan siswa, kendala perangkat lab, atau tindak lanjut..."
                  value={editingAgenda.catatan || ''}
                  onChange={(e) => setEditingAgenda({ ...editingAgenda, catatan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jumlah Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={editingAgenda.hadirCount ?? 0}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, hadirCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jumlah Tidak Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={editingAgenda.tidakHadirCount ?? 0}
                    onChange={(e) => setEditingAgenda({ ...editingAgenda, tidakHadirCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
