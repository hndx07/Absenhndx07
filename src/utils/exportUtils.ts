import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  TeachingAgenda,
  SavingTransaction,
  TeacherProfile,
  GradeColumn,
} from '../types';
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { calculateGradeMetrics } from './gradeCalculations';

export function downloadDataBackupJSON(data: any, fileName = 'backup_data_muhiba.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportStudentsToExcel(
  classRoom: ClassRoom | null,
  students: Student[],
  teacher?: TeacherProfile,
  allClasses: ClassRoom[] = []
) {
  const rows = students.map((s, idx) => {
    const cls = allClasses.find((c) => c.id === s.classId);
    return {
      No: idx + 1,
      NISN: s.nisn || '-',
      'Nama Lengkap Siswa': s.nama,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      Kelas: cls?.namaKelas || classRoom?.namaKelas || '-',
      'Mata Pelajaran': cls?.mataPelajaran || classRoom?.mataPelajaran || '-',
      'No HP / WA Ortu': s.noHpOrangTua || '-',
      Catatan: s.catatanUmum || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
  const fname = `Data_Siswa_${classRoom ? classRoom.namaKelas.replace(/\s+/g, '_') : 'Semua'}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function downloadStudentTemplateExcel(classRoom?: ClassRoom) {
  const sampleRows = [
    {
      No: 1,
      NISN: '0012345678',
      'Nama Siswa': 'Ahmad Fauzi',
      'L/P': 'L',
      'No HP Ortu': '081234567890',
      Catatan: 'Aktif dalam pembelajaran',
    },
    {
      No: 2,
      NISN: '0012345679',
      'Nama Siswa': 'Budi Santoso',
      'L/P': 'L',
      'No HP Ortu': '081234567891',
      Catatan: '',
    },
    {
      No: 3,
      NISN: '0012345680',
      'Nama Siswa': 'Citra Lestari',
      'L/P': 'P',
      'No HP Ortu': '081234567892',
      Catatan: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
  const className = classRoom?.namaKelas ? classRoom.namaKelas.replace(/\s+/g, '_') : 'Umum';
  XLSX.writeFile(wb, `Template_Data_Siswa_${className}.xlsx`);
}

export function exportAttendanceToExcel(
  session: AttendanceSession,
  classRoom: ClassRoom,
  students: Student[],
  teacher: TeacherProfile
) {
  const rows = students.map((s, idx) => {
    const rec = session.records?.[s.id];
    const statusMap: Record<string, string> = {
      H: 'Hadir',
      S: 'Sakit',
      I: 'Izin',
      A: 'Alpa',
      D: 'Dispen',
    };
    return {
      No: idx + 1,
      NISN: s.nisn || '-',
      'Nama Lengkap Siswa': s.nama,
      'Jenis Kelamin': s.gender,
      'Status Kehadiran': statusMap[rec?.status || 'H'] || 'Hadir',
      'Catatan / Alasan': rec?.catatan || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Presensi Harian');
  const fname = `Presensi_${classRoom.namaKelas.replace(/\s+/g, '_')}_P${session.pertemuanKe}_${session.tanggal}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function exportAttendanceToPDF(
  session: AttendanceSession,
  classRoom: ClassRoom,
  students: Student[],
  teacher: TeacherProfile
) {
  const doc = new jsPDF('portrait');
  doc.setFontSize(14);
  doc.text(SCHOOL_CONFIG.namaSekolah, 14, 15);
  doc.setFontSize(11);
  doc.text(`Presensi Harian Siswa - Pertemuan Ke-${session.pertemuanKe}`, 14, 22);
  doc.setFontSize(9);
  doc.text(
    `Kelas: ${classRoom.namaKelas} | Tanggal: ${session.tanggal} | Topik: ${session.topikMateri || '-'}`,
    14,
    28
  );

  const statusMap: Record<string, string> = {
    H: 'Hadir',
    S: 'Sakit',
    I: 'Izin',
    A: 'Alpa',
    D: 'Dispen',
  };

  const tableRows = students.map((s, idx) => {
    const rec = session.records?.[s.id];
    return [
      idx + 1,
      s.nisn || '-',
      s.nama,
      s.gender,
      statusMap[rec?.status || 'H'] || 'Hadir',
      rec?.catatan || '-',
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [['No', 'NISN', 'Nama Siswa', 'L/P', 'Status', 'Catatan']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 155, 98], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Presensi_${classRoom.namaKelas.replace(/\s+/g, '_')}_P${session.pertemuanKe}.pdf`);
}

export function exportMonthlyRecapToExcel(
  classRoomOrRecap: any,
  studentsOrClass: any,
  sessionsOrTeacher: any,
  monthOrMonthName: any,
  year: number,
  teacherParam?: TeacherProfile
) {
  let rows: any[] = [];
  let monthName = typeof monthOrMonthName === 'string' ? monthOrMonthName : `Bulan_${monthOrMonthName}`;

  if (Array.isArray(classRoomOrRecap)) {
    // Called with (recapData, classRoom, teacher, monthName, year)
    rows = classRoomOrRecap.map((r, idx) => ({
      No: idx + 1,
      NISN: r.student?.nisn || '-',
      'Nama Siswa': r.student?.nama || '-',
      'L/P': r.student?.gender || '-',
      Hadir: r.h || 0,
      Sakit: r.s || 0,
      Izin: r.i || 0,
      Alpa: r.a || 0,
      Dispen: r.d || 0,
      'Total Sesi': r.totalSessions || 0,
      'Persentase Hadir': `${r.persentase || 0}%`,
    }));
  } else {
    // Called with (classRoom, students, sessions, month, year, teacher)
    const classRoom: ClassRoom | null = classRoomOrRecap;
    const students: Student[] = studentsOrClass || [];
    const sessions: AttendanceSession[] = sessionsOrTeacher || [];
    const monthNum = typeof monthOrMonthName === 'number' ? monthOrMonthName : 1;

    const monthSessions = sessions.filter((s) => {
      if (classRoom && s.classId && s.classId !== classRoom.id) return false;
      const [y, m] = s.tanggal.split('-').map(Number);
      return y === year && m === monthNum;
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    monthName = monthNames[monthNum - 1] || `Bulan_${monthNum}`;

    rows = students.map((std, idx) => {
      let h = 0, s = 0, i = 0, a = 0, d = 0;
      monthSessions.forEach((sess) => {
        const rec = sess.records?.[std.id];
        if (rec) {
          if (rec.status === 'H') h++;
          else if (rec.status === 'S') s++;
          else if (rec.status === 'I') i++;
          else if (rec.status === 'A') a++;
          else if (rec.status === 'D') d++;
        }
      });
      const totalSess = monthSessions.length;
      const pct = totalSess > 0 ? Math.round((h / totalSess) * 100) : 100;
      return {
        No: idx + 1,
        NISN: std.nisn || '-',
        'Nama Siswa': std.nama,
        'L/P': std.gender || '-',
        Hadir: h,
        Sakit: s,
        Izin: i,
        Alpa: a,
        Dispen: d,
        'Total Sesi': totalSess,
        'Persentase Hadir': `${pct}%`,
      };
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Bulanan');
  const fname = `Rekap_Presensi_${monthName}_${year}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function exportMonthlyRecapToPDF(
  classRoomOrRecap: any,
  studentsOrClass: any,
  sessionsOrTeacher: any,
  monthOrMonthName: any,
  year: number,
  teacherParam?: TeacherProfile
) {
  let tableRows: any[] = [];
  let monthName = typeof monthOrMonthName === 'string' ? monthOrMonthName : `Bulan_${monthOrMonthName}`;
  let classNameStr = 'Semua Kelas';
  let teacherNameStr = 'Pengampu';

  if (Array.isArray(classRoomOrRecap)) {
    const classRoom: ClassRoom | null = studentsOrClass;
    const teacher: TeacherProfile | undefined = sessionsOrTeacher;
    classNameStr = classRoom ? classRoom.namaKelas : 'Semua Kelas';
    teacherNameStr = teacher?.namaGuru || 'Pengampu';

    tableRows = classRoomOrRecap.map((r, idx) => [
      idx + 1,
      r.student?.nisn || '-',
      r.student?.nama || '-',
      r.student?.gender || '-',
      r.h || 0,
      r.s || 0,
      r.i || 0,
      r.a || 0,
      r.d || 0,
      `${r.persentase || 0}%`,
    ]);
  } else {
    const classRoom: ClassRoom | null = classRoomOrRecap;
    const students: Student[] = studentsOrClass || [];
    const sessions: AttendanceSession[] = sessionsOrTeacher || [];
    const monthNum = typeof monthOrMonthName === 'number' ? monthOrMonthName : 1;
    const teacher: TeacherProfile | undefined = teacherParam;

    classNameStr = classRoom ? classRoom.namaKelas : 'Semua Kelas';
    teacherNameStr = teacher?.namaGuru || 'Pengampu';

    const monthSessions = sessions.filter((s) => {
      if (classRoom && s.classId && s.classId !== classRoom.id) return false;
      const [y, m] = s.tanggal.split('-').map(Number);
      return y === year && m === monthNum;
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    monthName = monthNames[monthNum - 1] || `Bulan_${monthNum}`;

    tableRows = students.map((std, idx) => {
      let h = 0, s = 0, i = 0, a = 0, d = 0;
      monthSessions.forEach((sess) => {
        const rec = sess.records?.[std.id];
        if (rec) {
          if (rec.status === 'H') h++;
          else if (rec.status === 'S') s++;
          else if (rec.status === 'I') i++;
          else if (rec.status === 'A') a++;
          else if (rec.status === 'D') d++;
        }
      });
      const totalSess = monthSessions.length;
      const pct = totalSess > 0 ? Math.round((h / totalSess) * 100) : 100;
      return [
        idx + 1,
        std.nisn || '-',
        std.nama,
        std.gender || '-',
        h,
        s,
        i,
        a,
        d,
        `${pct}%`,
      ];
    });
  }

  const doc = new jsPDF('landscape');
  doc.setFontSize(14);
  doc.text(SCHOOL_CONFIG.namaSekolah, 14, 15);
  doc.setFontSize(11);
  doc.text(`Rekap Presensi Siswa - Bulan ${monthName} ${year}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Kelas: ${classNameStr} | Guru: ${teacherNameStr}`, 14, 28);

  autoTable(doc, {
    startY: 32,
    head: [['No', 'NISN', 'Nama Siswa', 'L/P', 'H', 'S', 'I', 'A', 'D', 'Kehadiran']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 155, 98], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Rekap_Presensi_${monthName}_${year}.pdf`);
}

export function exportGradesToExcel(
  classRoom: ClassRoom,
  students: Student[],
  grades: StudentGrade[],
  gradeColumns: GradeColumn[],
  activeColumnsCountOrTeacher?: number | TeacherProfile,
  teacherParam?: TeacherProfile
) {
  let activeColumnsCount = 4;
  if (typeof activeColumnsCountOrTeacher === 'number') {
    activeColumnsCount = activeColumnsCountOrTeacher;
  } else if (Array.isArray(gradeColumns)) {
    activeColumnsCount = gradeColumns.length;
  }

  const rows = students.map((std, idx) => {
    const g = grades.find((item) => item.studentId === std.id);
    const metrics = calculateGradeMetrics(g, std.nama, classRoom.kkm);

    const rowObj: Record<string, any> = {
      No: idx + 1,
      NISN: std.nisn || '-',
      'Nama Siswa': std.nama,
    };

    for (let i = 0; i < activeColumnsCount; i++) {
      const col = gradeColumns[i];
      const k = (col?.key || `formatif${i + 1}`) as keyof StudentGrade;
      rowObj[`TP ${i + 1} (${col?.label || ''})`] = g ? (g[k] ?? '-') : '-';
    }

    rowObj['STS'] = g?.sumatifTengah ?? '-';
    rowObj['SAS'] = g?.sumatifAkhir ?? '-';
    rowObj['Nilai Akhir'] = metrics.hasAnyScore ? metrics.finalScore : '-';
    rowObj['Predikat'] = metrics.predicate;
    rowObj['Status'] = metrics.isPassed ? 'TUNTAS' : 'REMEDIAL';
    rowObj['Deskripsi Capaian'] = metrics.merdekaDeskripsiSingkat;

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai Kurikulum Merdeka');
  const fname = `Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function exportGradesToPDF(
  classRoom: ClassRoom,
  students: Student[],
  grades: StudentGrade[],
  gradeColumnsOrTeacher: GradeColumn[] | TeacherProfile,
  teacherParam?: TeacherProfile
) {
  const teacher =
    teacherParam ||
    (gradeColumnsOrTeacher && 'namaGuru' in gradeColumnsOrTeacher
      ? (gradeColumnsOrTeacher as TeacherProfile)
      : ({ namaGuru: 'Guru Pengampu' } as TeacherProfile));

  const doc = new jsPDF('landscape');
  doc.setFontSize(14);
  doc.text(SCHOOL_CONFIG.namaSekolah, 14, 15);
  doc.setFontSize(11);
  doc.text(`Daftar Nilai Siswa (Kurikulum Merdeka) - ${classRoom.namaKelas}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Mata Pelajaran: ${classRoom.mataPelajaran} | KKM: ${classRoom.kkm} | Guru: ${teacher.namaGuru}`, 14, 28);

  const tableRows = students.map((std, idx) => {
    const g = grades.find((item) => item.studentId === std.id);
    const metrics = calculateGradeMetrics(g, std.nama, classRoom.kkm);
    return [
      idx + 1,
      std.nisn || '-',
      std.nama,
      metrics.formatifAvg || '-',
      g?.sumatifTengah ?? '-',
      g?.sumatifAkhir ?? '-',
      metrics.hasAnyScore ? metrics.finalScore : '-',
      metrics.predicate,
      metrics.isPassed ? 'Tuntas' : 'Remedial',
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [['No', 'NISN', 'Nama Siswa', 'Rata Formatif', 'STS', 'SAS', 'Nilai Akhir', 'Predikat', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 155, 98], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}.pdf`);
}

export function downloadGradesTemplateExcel(
  classRoom: ClassRoom,
  students: Student[],
  activeColumnsCountOrColumns: number | any[] = 4,
  _teacher?: TeacherProfile
) {
  const activeCount = Array.isArray(activeColumnsCountOrColumns)
    ? activeColumnsCountOrColumns.length
    : (typeof activeColumnsCountOrColumns === 'number' ? activeColumnsCountOrColumns : 4);

  const rows = students.map((std, idx) => {
    const rowObj: Record<string, any> = {
      No: idx + 1,
      NISN: std.nisn || '',
      'Nama Siswa': std.nama,
    };
    for (let i = 1; i <= activeCount; i++) {
      rowObj[`Formatif_${i}`] = '';
    }
    rowObj['Sumatif_Tengah_Semester'] = '';
    rowObj['Sumatif_Akhir_Semester'] = '';
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
  XLSX.writeFile(wb, `Template_Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}.xlsx`);
}

export function exportAgendasToExcel(
  agendas: TeachingAgenda[],
  classRoom: ClassRoom | null,
  teacher: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const cMap = classesMap || {};
  const rows = agendas.map((ag, idx) => ({
    No: idx + 1,
    Tanggal: ag.tanggal,
    Hari: ag.hari,
    'Jam Ke': ag.jamKe,
    'Rentang Jam': ag.rentangJam,
    Kelas: cMap[ag.classId] || ag.classNameSnapshot || '-',
    'Mata Pelajaran': ag.mataPelajaran || classRoom?.mataPelajaran || teacher.mataPelajaranUtama || '-',
    Guru: ag.guruName || teacher.namaGuru,
    'Materi Ajar': ag.materiAjar,
    Kegiatan: ag.kegiatan || '-',
    Catatan: ag.catatan || '-',
    Hadir: ag.hadirCount || 0,
    Absen: ag.tidakHadirCount || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agenda Mengajar');
  const fname = `Agenda_Mengajar_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function exportAgendaToPDF(
  agendas: TeachingAgenda[],
  classRoom: ClassRoom | null,
  teacher: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const cMap = classesMap || {};
  const doc = new jsPDF('landscape');
  doc.setFontSize(14);
  doc.text(SCHOOL_CONFIG.namaSekolah, 14, 15);
  doc.setFontSize(11);
  doc.text(`Jurnal & Agenda Mengajar Guru`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Guru: ${teacher.namaGuru} | Semester: ${teacher.semester} | T.A: ${teacher.tahunAjaran}`, 14, 28);

  const tableRows = agendas.map((ag, idx) => [
    idx + 1,
    `${ag.hari}, ${ag.tanggal}`,
    cMap[ag.classId] || ag.classNameSnapshot || '-',
    ag.jamKe,
    ag.materiAjar,
    ag.kegiatan || '-',
    `H: ${ag.hadirCount} | A: ${ag.tidakHadirCount}`,
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['No', 'Hari/Tanggal', 'Kelas', 'Jam', 'Materi Ajar', 'Kegiatan', 'Kehadiran']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 155, 98], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Agenda_Mengajar_Guru_${Date.now()}.pdf`);
}

export function exportToWordDocument(fileName: string, htmlContent: string) {
  const header = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${fileName}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #111; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
  th { background-color: #f2f2f2; font-weight: bold; }
  h1, h2, h3 { text-align: center; margin: 4px 0; }
</style>
</head><body>`;
  const footer = '</body></html>';
  const sourceHtml = header + htmlContent + footer;

  const blob = new Blob(['\ufeff', sourceHtml], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSavingsToExcel(
  savings: SavingTransaction[],
  students: Student[],
  classRoom: ClassRoom | null,
  teacher?: TeacherProfile
) {
  const rows = savings.map((tx, idx) => {
    const std = students.find((s) => s.id === tx.studentId);
    return {
      No: idx + 1,
      Tanggal: tx.tanggal,
      Kategori: tx.isClassCash ? 'Kas Kelas' : 'Tabungan Siswa',
      'Nama Siswa': tx.isClassCash ? '-' : (std?.nama || '-'),
      Tipe: tx.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
      Nominal: tx.jumlah,
      Keterangan: tx.keterangan || '-',
      Pencatat: tx.pencatat || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Keuangan');
  const className = classRoom ? classRoom.namaKelas.replace(/\s+/g, '_') : 'Semua';
  const fname = `Keuangan_${className}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}
