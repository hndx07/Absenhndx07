import React, { useState } from 'react';
import { MessageSquare, Printer, Award, User, Calendar, BookOpen, Wallet, Send, CheckCircle2 } from 'lucide-react';
import { ClassRoom, Student, AttendanceSession, StudentGrade, SavingTransaction, TeacherProfile } from '../types';
import { calculateGradeMetrics } from '../utils/gradeCalculations';
import { SCHOOL_CONFIG } from '../config/schoolConfig';

interface ParentReportViewProps {
  activeClass: ClassRoom | null;
  students: Student[];
  sessions: AttendanceSession[];
  grades: StudentGrade[];
  savings: SavingTransaction[];
  teacher: TeacherProfile;
}

export const ParentReportView: React.FC<ParentReportViewProps> = ({
  activeClass,
  students,
  sessions,
  grades,
  savings,
  teacher,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Calculate attendance stats for this student
  let hCount = 0;
  let sCount = 0;
  let iCount = 0;
  let aCount = 0;
  let dCount = 0;

  sessions.forEach((sess) => {
    const rec = sess.records?.[selectedStudent?.id || ''];
    if (rec) {
      if (rec.status === 'H') hCount++;
      else if (rec.status === 'S') sCount++;
      else if (rec.status === 'I') iCount++;
      else if (rec.status === 'A') aCount++;
      else if (rec.status === 'D') dCount++;
    }
  });

  const totalSessions = sessions.length;
  const attendanceRate = totalSessions > 0 ? Math.round((hCount / totalSessions) * 100) : 100;

  // Grade metrics
  const studentGrade = grades.find((g) => g.studentId === selectedStudent?.id);
  const gradeMetrics = calculateGradeMetrics(
    studentGrade,
    selectedStudent?.nama,
    activeClass?.kkm || 75
  );

  // Savings balance
  const studentSavings = savings.filter((t) => t.studentId === selectedStudent?.id);
  let totalMasuk = 0;
  let totalKeluar = 0;
  studentSavings.forEach((t) => {
    if (t.tipe === 'masuk') totalMasuk += t.jumlah;
    else totalKeluar += t.jumlah;
  });
  const saldoTabungan = totalMasuk - totalKeluar;

  const handleSendWhatsApp = () => {
    if (!selectedStudent?.noHpOrangTua) {
      alert('Nomor HP / WhatsApp orang tua belum terdaftar.');
      return;
    }

    let cleanPhone = selectedStudent.noHpOrangTua.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const message = `*LAPORAN PERKEMBANGAN BELAJAR SISWA*
*${SCHOOL_CONFIG.namaSekolah}*
---------------------------------------
Nama Siswa: *${selectedStudent.nama}*
NISN: ${selectedStudent.nisn || '-'}
Kelas: ${activeClass?.namaKelas || '-'} (${activeClass?.mataPelajaran || '-'})
Guru Pengampu: ${teacher.namaGuru}

*1. Presensi & Kehadiran:*
- Hadir: ${hCount} pertemuan (${attendanceRate}%)
- Sakit: ${sCount} | Izin: ${iCount} | Alpa: ${aCount}

*2. Capaian Nilai Pembelajaran:*
- Nilai Rata-rata: *${gradeMetrics.finalScore.toFixed(1)}*
- Predikat: *${gradeMetrics.predicate} (${gradeMetrics.predicateLabel})*
- Status Ketercapaian: *${gradeMetrics.isPassed ? 'TUNTAS' : 'PERLU BIMBINGAN'}*
- Keterangan: ${gradeMetrics.merdekaDeskripsiSingkat}

*3. Tabungan Siswa:*
- Saldo Aktif: Rp ${saldoTabungan.toLocaleString('id-ID')}

Terima kasih atas kerja sama Bapak/Ibu dalam mendampingi putra/putri kita.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Student Selector Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#009B62] flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pilih Peserta Didik
            </h3>
            <p className="text-sm font-bold text-slate-800">
              {selectedStudent ? selectedStudent.nama : 'Pilih siswa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#009B62]/30"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.no}. {s.nama} ({s.gender})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Main Report Card */}
      {selectedStudent && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header with Muhammadiyah Visual Identity */}
          <div className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Award className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                  Rapor Perkembangan Belajar Siswa
                </span>
                <h2 className="text-xl font-black">{selectedStudent.nama}</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  NISN: {selectedStudent.nisn || '-'} • Kelas {activeClass?.namaKelas || '-'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer self-start sm:self-auto"
            >
              <Send className="w-4 h-4" />
              <span>Kirim WhatsApp ke Orang Tua</span>
            </button>
          </div>

          {/* Report Body */}
          <div className="p-6 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-700 uppercase block">Tingkat Kehadiran</span>
                <span className="text-2xl font-black text-emerald-800">{attendanceRate}%</span>
                <p className="text-xs text-emerald-600 mt-1">
                  Hadir {hCount} dari {totalSessions} total pertemuan
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <span className="text-[11px] font-bold text-blue-700 uppercase block">Nilai Capaian Belajar</span>
                <span className="text-2xl font-black text-blue-900">
                  {gradeMetrics.finalScore > 0 ? gradeMetrics.finalScore.toFixed(1) : '-'}
                </span>
                <p className="text-xs text-blue-600 mt-1">
                  Predikat {gradeMetrics.predicate} ({gradeMetrics.predicateLabel})
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100">
                <span className="text-[11px] font-bold text-teal-700 uppercase block">Saldo Tabungan</span>
                <span className="text-2xl font-black text-teal-900">
                  Rp {saldoTabungan.toLocaleString('id-ID')}
                </span>
                <p className="text-xs text-teal-600 mt-1">
                  {studentSavings.length} transaksi tercatat
                </p>
              </div>
            </div>

            {/* Attendance Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Rincian Presensi Kelas
              </h4>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Hadir</span>
                  <span className="font-bold text-emerald-600 text-sm">{hCount}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Sakit</span>
                  <span className="font-bold text-blue-600 text-sm">{sCount}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Izin</span>
                  <span className="font-bold text-amber-600 text-sm">{iCount}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Alpa</span>
                  <span className="font-bold text-rose-600 text-sm">{aCount}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Dispen</span>
                  <span className="font-bold text-purple-600 text-sm">{dCount}</span>
                </div>
              </div>
            </div>

            {/* Kurikulum Merdeka Competency Description */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Deskripsi Capaian Pembelajaran (Kurikulum Merdeka)
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {gradeMetrics.merdekaDeskripsi ||
                  `Ananda ${selectedStudent.nama} terus menunjukkan perkembangan belajar yang positif pada mata pelajaran ${activeClass?.mataPelajaran || 'terkait'}.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
