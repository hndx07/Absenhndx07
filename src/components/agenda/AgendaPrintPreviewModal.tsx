import React from 'react';
import { Eye, Printer, Download, X } from 'lucide-react';
import { ClassRoom, TeachingAgenda, TeacherProfile } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';
import { OfficialLetterhead } from '../OfficialLetterhead';

export interface AgendaPrintDocumentProps {
  teacher: TeacherProfile;
  filterClassId: string;
  selectedClassObj: ClassRoom | null;
  filteredAgendas: TeachingAgenda[];
  classesMap: Record<string, string>;
}

export const AgendaPrintDocument: React.FC<AgendaPrintDocumentProps> = ({
  teacher,
  filterClassId,
  selectedClassObj,
  filteredAgendas,
  classesMap,
}) => (
  <div className="bg-white text-black font-serif leading-relaxed text-xs print:p-0 print:m-0 print:w-full">
    {/* Kop Surat Resmi Dokumen Siap Cetak */}
    <OfficialLetterhead namaSekolah={teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah} />

    {/* Document Title */}
    <div className="text-center my-4">
      <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-black">
        BUKU JURNAL / AGENDA MENGAJAR PENDIDIK
      </h2>
      <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-black mt-0.5">
        KURIKULUM MERDEKA &bull; TAHUN PELAJARAN {teacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran} ({teacher?.semester || SCHOOL_CONFIG.semester})
      </p>
    </div>

    {/* Pendidik & Rombel Info */}
    <div className="grid grid-cols-2 gap-4 text-xs mb-5 font-sans bg-slate-50 print:bg-white p-3 rounded-lg border border-slate-300 print:border-black text-black">
      <div className="space-y-1">
        <p><span className="text-slate-600 print:text-black inline-block w-28">Satuan Pendidikan:</span> <strong>{teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}</strong></p>
        <p><span className="text-slate-600 print:text-black inline-block w-28">Nama Pendidik:</span> <strong>{teacher?.namaGuru || 'Guru Pengampu'}</strong></p>
        <p><span className="text-slate-600 print:text-black inline-block w-28">NBM:</span> {teacher?.nbm || '-'}</p>
        <p><span className="text-slate-600 print:text-black inline-block w-28">Mata Pelajaran:</span> {filterClassId === 'all' ? teacher?.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}</p>
      </div>
      <div className="space-y-1">
        <p><span className="text-slate-600 print:text-black inline-block w-28">Kelas / Rombel:</span> <strong>{filterClassId === 'all' ? 'Semua Kelas' : selectedClassObj?.namaKelas}</strong></p>
        <p><span className="text-slate-600 print:text-black inline-block w-28">Tahun Ajaran:</span> {teacher?.tahunAjaran || '-'}</p>
        <p><span className="text-slate-600 print:text-black inline-block w-28">Semester:</span> {teacher?.semester || '-'}</p>
      </div>
    </div>

    {/* Table Agendas */}
    <div className="overflow-x-auto mb-6">
      <table className="w-full border-collapse border border-black text-[11px] font-sans text-black">
        <thead>
          <tr className="bg-slate-100 print:bg-slate-100 text-black">
            <th className="border border-black p-2 text-center w-8">No</th>
            <th className="border border-black p-2 text-left w-24">Hari / Tanggal</th>
            {filterClassId === 'all' && (
              <th className="border border-black p-2 text-center w-20">Kelas</th>
            )}
            <th className="border border-black p-2 text-center w-14">Jam Ke</th>
            <th className="border border-black p-2 text-left">Materi / Capaian Pembelajaran</th>
            <th className="border border-black p-2 text-center w-12">Hadir</th>
            <th className="border border-black p-2 text-center w-12">Absen</th>
            <th className="border border-black p-2 text-center w-16">Paraf</th>
          </tr>
        </thead>
        <tbody>
          {filteredAgendas.length === 0 ? (
            <tr>
              <td
                colSpan={filterClassId === 'all' ? 8 : 7}
                className="border border-black p-4 text-center text-slate-500 italic"
              >
                Belum ada entri jurnal mengajar yang sesuai.
              </td>
            </tr>
          ) : (
            filteredAgendas.map((ag, idx) => (
              <tr key={ag.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-2 font-medium">{ag.hari?.substring(0, 3)}, {ag.tanggal}</td>
                {filterClassId === 'all' && (
                  <td className="border border-black p-2 text-center font-bold">
                    {classesMap[ag.classId] || ag.classNameSnapshot || '-'}
                  </td>
                )}
                <td className="border border-black p-2 text-center font-mono">Ke-{ag.jamKe}</td>
                <td className="border border-black p-2">
                  <p className="font-semibold text-black">{ag.materiAjar}</p>
                  {ag.kegiatan && <p className="text-[10px] text-slate-700 print:text-black mt-0.5">{ag.kegiatan}</p>}
                </td>
                <td className="border border-black p-2 text-center font-mono font-bold text-black">{ag.hadirCount ?? 0}</td>
                <td className="border border-black p-2 text-center font-mono font-bold text-black">{ag.tidakHadirCount ?? 0}</td>
                <td className="border border-black p-2 text-center font-mono text-[9px] text-black">&#10003;</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Tanda Tangan Resmi Dokumen */}
    <div className="pt-6 font-sans text-xs text-black break-inside-avoid print:break-inside-avoid">
      <div className="flex justify-end mb-4">
        <p className="text-black">
          Bawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-8 text-center">
        <div>
          <p className="font-semibold text-black">Mengetahui,</p>
          <p className="font-semibold text-black">Kepala {teacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah}</p>
          <div className="h-16 flex items-end justify-center">
            <p className="font-bold underline text-black">
              {teacher?.namaKepalaSekolah ? teacher.namaKepalaSekolah : '( .................................................... )'}
            </p>
          </div>
          <p className="text-[10px] text-slate-700 print:text-black font-mono mt-0.5">
            {teacher?.nbmKepalaSekolah
              ? `NBM. ${teacher.nbmKepalaSekolah}`
              : 'NBM. ........................................'}
          </p>
        </div>
        <div>
          <p className="font-semibold text-black">Pendidik Pengampu Mata Pelajaran,</p>
          <p className="text-slate-700 print:text-black">{filterClassId === 'all' ? teacher?.mataPelajaranUtama || 'Seluruh Mapel' : selectedClassObj?.mataPelajaran}</p>
          <div className="h-16 flex items-end justify-center">
            <p className="font-bold underline text-black">{teacher?.namaGuru || 'Guru Pengampu'}</p>
          </div>
          <p className="text-[10px] text-slate-700 print:text-black font-mono mt-0.5">
            NBM: {teacher?.nbm || '-'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

interface AgendaPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherProfile;
  filterClassId: string;
  selectedClassObj: ClassRoom | null;
  filteredAgendas: TeachingAgenda[];
  classesMap: Record<string, string>;
  onExportPDF: () => void;
}

export const AgendaPrintPreviewModal: React.FC<AgendaPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  teacher,
  filterClassId,
  selectedClassObj,
  filteredAgendas,
  classesMap,
  onExportPDF,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print-modal-active">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh] print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:max-h-none print:p-0 print:m-0 print:bg-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 no-print">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Dokumen Siap Cetak & PDF Agenda Mengajar
              </h3>
              <p className="text-[11px] text-slate-400">
                {filterClassId === 'all' ? 'Seluruh Kelas' : selectedClassObj?.namaKelas} &bull; T.A. {teacher.tahunAjaran} ({teacher.semester})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </button>
            <button
              type="button"
              onClick={onExportPDF}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* A4 Paper Simulation Canvas */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-white mx-auto p-6 sm:p-10 shadow-lg rounded-xl border border-slate-200 text-slate-900 max-w-[210mm] font-serif leading-relaxed text-xs print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-none print:bg-white print-document">
            <AgendaPrintDocument
              teacher={teacher}
              filterClassId={filterClassId}
              selectedClassObj={selectedClassObj}
              filteredAgendas={filteredAgendas}
              classesMap={classesMap}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Format resmi sesuai standar kurikulum {SCHOOL_CONFIG.namaSekolah}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen
            </button>
            <button
              type="button"
              onClick={onExportPDF}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
