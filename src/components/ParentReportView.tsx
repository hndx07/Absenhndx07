import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ClassRoom, Student, AttendanceSession, StudentGrade, TeacherProfile } from '../types';

interface ParentReportViewProps {
  currentClass: ClassRoom;
  students: Student[];
  sessions: AttendanceSession[];
  grades: StudentGrade[];
  teacher: TeacherProfile;
}

export const ParentReportView: React.FC<ParentReportViewProps> = ({
  currentClass,
  students,
  sessions,
  grades,
  teacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.no - b.no);

  const filteredStudents = classStudents.filter((s) =>
    s.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find session for selected date if exists
  const targetSession = sessions.find(
    (s) => s.classId === currentClass.id && s.tanggal === selectedDate
  ) || sessions[0];

  const generateWhatsAppMessage = (std: Student) => {
    const statusRecord = targetSession?.records?.[std.id];
    const statusText =
      statusRecord?.status === 'H'
        ? 'HADIR (Tepat Waktu)'
        : statusRecord?.status === 'S'
        ? `SAKIT (${statusRecord.catatan || 'Surat menyusul'})`
        : statusRecord?.status === 'I'
        ? `IZIN (${statusRecord.catatan || 'Keterangan izin'})`
        : 'ALFA (Tanpa Keterangan)';

    const studentGrade = grades.find((g) => g.studentId === std.id && g.classId === currentClass.id);
    const avgF = studentGrade?.formatif1 ? studentGrade.formatif1 : 80;

    return `*LAPORAN PRESENSI PESERTA DIDIK*
*SMK MUHAMMADIYAH BAWANG - BATANG*
Tahun Ajaran ${teacher.tahunAjaran} (${teacher.semester})

Kepada Yth. Bapak/Ibu Wali Murid dari:
Nama Siswa: *${std.nama}*
Kelas: *${currentClass.namaKelas}*
Mata Pelajaran: *${currentClass.mataPelajaran}*

Bersama ini kami informasikan rekap harian pembelajaran:
📅 Tanggal: ${targetSession?.tanggal || selectedDate}
📖 Materi: ${targetSession?.topikMateri || 'Pembelajaran Kejuruan Terstruktur'}
📌 Status Kehadiran: *${statusText}*

Catatan Guru:
${std.catatanUmum || 'Ananda senantiasa mengikuti kegiatan pembelajaran dengan baik dan santun.'}

Salam takzim,
*${teacher.namaGuru}*
Guru Mata Pelajaran SMK Muhammadiyah Bawang
_Pendidikan Vokasi Unggul & Berkarakter Islami_`;
  };

  const handleCopyText = (std: Student) => {
    const text = generateWhatsAppMessage(std);
    navigator.clipboard.writeText(text);
    setCopiedId(std.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = (std: Student) => {
    const phone = std.noHpOrangTua?.replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Nomor HP Orang Tua belum terdaftar untuk siswa ini!');
      return;
    }
    const cleanPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
    const text = encodeURIComponent(generateWhatsAppMessage(std));
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
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
            <span className="text-xs font-semibold text-slate-600">Layanan Komunikasi Wali Murid</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Laporan Presensi & Kehadiran ke Orang Tua
          </h2>
          <p className="text-xs text-slate-500">
            Kirimkan laporan resmi perkembangan presensi harian siswa langsung ke nomor WhatsApp orang tua
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm"
          />
        </div>
        <p className="text-xs text-slate-400">
          Sesi terpilih: <strong>Pertemuan Ke-{targetSession?.pertemuanKe || 1}</strong> ({targetSession?.tanggal || selectedDate})
        </p>
      </div>

      {/* Student List for WhatsApp notification */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((std) => {
          const rec = targetSession?.records?.[std.id];
          const st = rec?.status || 'H';

          return (
            <div
              key={std.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{std.nama}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {std.nisn || '-'}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                      st === 'H'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : st === 'S'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : st === 'I'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {st === 'H' ? 'Hadir' : st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alfa'}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <p className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    WA: <span className="font-mono font-bold text-slate-700">{std.noHpOrangTua || 'Belum diisi'}</span>
                  </p>
                  {rec?.catatan && (
                    <p className="text-slate-600 italic">
                      Catatan: "{rec.catatan}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleCopyText(std)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 flex-1"
                >
                  {copiedId === std.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === std.id ? 'Tersalin' : 'Salin Pesan'}
                </button>

                <button
                  onClick={() => handleSendWhatsApp(std)}
                  disabled={!std.noHpOrangTua}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim WA
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
