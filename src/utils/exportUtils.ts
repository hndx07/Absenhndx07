import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  AttendanceSession,
  ClassRoom,
  Student,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  TeacherProfile,
} from '../types';

export function exportAttendanceToExcel(
  classRoom: ClassRoom,
  students: Student[],
  sessions: AttendanceSession[],
  teacher: TeacherProfile
) {
  const sortedSessions = [...sessions].sort((a, b) => a.pertemuanKe - b.pertemuanKe);

  const headerRow1 = ['REKAPITULASI PRESENSI SISWA'];
  const headerRow2 = [`Sekolah: ${teacher.namaSekolah}`];
  const headerRow3 = [`Kelas: ${classRoom.namaKelas} | Mata Pelajaran: ${classRoom.mataPelajaran} | Tahun Ajaran: ${teacher.tahunAjaran} (${teacher.semester})`];
  const headerRow4 = [`Guru Pengampu: ${teacher.namaGuru} (NIP: ${teacher.nip})`];
  const emptyRow: any[] = [];

  const tableHeader = [
    'No',
    'NISN',
    'Nama Lengkap Siswa',
    'L/P',
    ...sortedSessions.map((s) => `P-${s.pertemuanKe} (${s.tanggal})`),
    'Hadir (H)',
    'Sakit (S)',
    'Izin (I)',
    'Alfa (A)',
    '% Kehadiran',
  ];

  const tableData = students.map((std, idx) => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;

    const sessionCols = sortedSessions.map((session) => {
      const record = session.records?.[std.id];
      const st = record?.status || '-';
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
      return st;
    });

    const totalSessions = sortedSessions.length || 1;
    const pct = Math.round((h / totalSessions) * 100);

    return [
      idx + 1,
      std.nisn,
      std.nama,
      std.gender,
      ...sessionCols,
      h,
      s,
      i,
      a,
      `${pct}%`,
    ];
  });

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 30 },
    { wch: 6 },
    ...sortedSessions.map(() => ({ wch: 14 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Presensi_${classRoom.namaKelas.replace(/\s+/g, '_')}`);
  XLSX.writeFile(wb, `Presensi_${classRoom.namaKelas.replace(/\s+/g, '_')}_${teacher.tahunAjaran.replace(/\//g, '-')}.xlsx`);
}

export function exportGradesToExcel(
  classRoom: ClassRoom,
  students: Student[],
  grades: StudentGrade[],
  gradeColumns: GradeColumn[],
  teacher: TeacherProfile
) {
  const headerRow1 = ['REKAPITULASI PENILAIAN SISWA (FORMATIF & SUMATIF)'];
  const headerRow2 = [`Sekolah: ${teacher.namaSekolah}`];
  const headerRow3 = [`Kelas: ${classRoom.namaKelas} | Mapel: ${classRoom.mataPelajaran} | KKM: ${classRoom.kkm}`];
  const headerRow4 = [`Guru: ${teacher.namaGuru} (NIP: ${teacher.nip}) | Semester: ${teacher.semester} ${teacher.tahunAjaran}`];
  const emptyRow: any[] = [];

  const colHeaders = gradeColumns.slice(0, 8).map((c) => c.label);
  const tableHeader = [
    'No',
    'NISN',
    'Nama Siswa',
    'L/P',
    ...colHeaders,
    'Rata Formatif',
    'STS',
    'SAS',
    'Nilai Akhir',
    'Predikat',
    'Status (KKM)',
    'Catatan Capaian',
  ];

  const tableData = students.map((std, idx) => {
    const g = grades.find((item) => item.studentId === std.id);
    const fVals = [
      g?.formatif1,
      g?.formatif2,
      g?.formatif3,
      g?.formatif4,
      g?.formatif5,
      g?.formatif6,
      g?.formatif7,
      g?.formatif8,
    ];

    const filledF = fVals.filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const avgF = filledF.length > 0 ? Math.round(filledF.reduce((a, b) => a + b, 0) / filledF.length) : 0;
    const sts = g?.sumatifTengah ?? 0;
    const sas = g?.sumatifAkhir ?? 0;

    // Nilai Akhir calculation: 50% Formatif, 25% STS, 25% SAS
    const finalScore = sts && sas ? Math.round(avgF * 0.5 + sts * 0.25 + sas * 0.25) : avgF || 0;

    let predikat = 'D';
    if (finalScore >= 90) predikat = 'A';
    else if (finalScore >= 80) predikat = 'B';
    else if (finalScore >= classRoom.kkm) predikat = 'C';

    const status = finalScore >= classRoom.kkm ? 'Tuntas' : 'Belum Tuntas';

    return [
      idx + 1,
      std.nisn,
      std.nama,
      std.gender,
      ...fVals.map((v) => (v !== undefined && v !== null ? v : '')),
      avgF,
      sts || '',
      sas || '',
      finalScore,
      predikat,
      status,
      g?.catatan || '',
    ];
  });

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 28 },
    { wch: 6 },
    ...colHeaders.map(() => ({ wch: 12 })),
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 35 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}`);
  XLSX.writeFile(wb, `Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}_${teacher.tahunAjaran.replace(/\//g, '-')}.xlsx`);
}

export function exportAgendasToExcel(
  agendas: TeachingAgenda[],
  classRoom: ClassRoom | null | undefined,
  teacher: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const isMultiClass = !classRoom || classRoom.id === 'all';
  const classNameHeader = isMultiClass ? 'Semua Kelas' : classRoom.namaKelas;
  const subjectHeader = isMultiClass ? teacher.mataPelajaranUtama || 'Semua Mapel' : classRoom.mataPelajaran;

  const header = [
    ['BUKU JURNAL / AGENDA MENGAJAR GURU'],
    [`Sekolah: ${teacher.namaSekolah}`],
    [`Guru: ${teacher.namaGuru} | NBM/NIP: ${teacher.nbm || teacher.nip}`],
    [`Kelas: ${classNameHeader} | Mapel: ${subjectHeader} | Semester: ${teacher.semester} ${teacher.tahunAjaran}`],
    [],
    isMultiClass
      ? ['No', 'Tanggal', 'Hari', 'Kelas', 'Jam Ke', 'Rentang Jam', 'Materi / Capaian Pembelajaran', 'Kegiatan Pembelajaran', 'Catatan / Evaluasi', 'Hadir', 'Tidak Hadir']
      : ['No', 'Tanggal', 'Hari', 'Jam Ke', 'Rentang Jam', 'Materi / Capaian Pembelajaran', 'Kegiatan Pembelajaran', 'Catatan / Evaluasi', 'Hadir', 'Tidak Hadir'],
  ];

  const rows = agendas.map((ag, idx) => {
    const clsName = classesMap?.[ag.classId] || ag.classNameSnapshot || ag.classId;
    if (isMultiClass) {
      return [
        idx + 1,
        ag.tanggal,
        ag.hari,
        clsName,
        ag.jamKe,
        ag.rentangJam,
        ag.materiAjar,
        ag.kegiatan,
        ag.catatan,
        ag.hadirCount,
        ag.tidakHadirCount,
      ];
    }
    return [
      idx + 1,
      ag.tanggal,
      ag.hari,
      ag.jamKe,
      ag.rentangJam,
      ag.materiAjar,
      ag.kegiatan,
      ag.catatan,
      ag.hadirCount,
      ag.tidakHadirCount,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
  ws['!cols'] = isMultiClass
    ? [
        { wch: 5 },
        { wch: 14 },
        { wch: 10 },
        { wch: 16 },
        { wch: 10 },
        { wch: 18 },
        { wch: 35 },
        { wch: 40 },
        { wch: 30 },
        { wch: 8 },
        { wch: 12 },
      ]
    : [
        { wch: 5 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 35 },
        { wch: 40 },
        { wch: 30 },
        { wch: 8 },
        { wch: 12 },
      ];

  const wb = XLSX.utils.book_new();
  const sheetName = isMultiClass ? 'Jurnal_Semua_Kelas' : `Jurnal_${classRoom.namaKelas.replace(/\s+/g, '_').slice(0, 20)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fileName = isMultiClass
    ? `Buku_Jurnal_Semua_Kelas_${teacher.tahunAjaran.replace(/\//g, '-')}.xlsx`
    : `Buku_Jurnal_${classRoom.namaKelas.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToWordDocument(title: string, contentHtml: string) {
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111; padding: 20px; }
          h1, h2, h3 { color: #1e1b4b; margin-bottom: 8px; }
          h1 { font-size: 16pt; text-align: center; text-transform: uppercase; }
          h2 { font-size: 13pt; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
          th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .header-box { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h2 style="margin:0; font-size:14pt;">MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL</h2>
          <h1 style="margin:4px 0; font-size:16pt; font-weight:bold;">SMK MUHAMMADIYAH BAWANG</h1>
          <p style="margin:0; font-size:9.5pt;">Alamat: Jl. Bawang-Sukorejo KM 01, Jlamprang, Bawang, 51274 &bull; Telp: (0285) 4486909 &bull; Website: smkmuhiba.sch.id &bull; Email: smkmutu1@yahoo.co.id</p>
        </div>
        ${contentHtml}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAttendanceToPDF(
  classRoom: ClassRoom,
  students: Student[],
  sessions: AttendanceSession[],
  teacher: TeacherProfile
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header SMK Muhammadiyah Bawang
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SMK MUHAMMADIYAH BAWANG - BATANG', 148, 15, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('REKAPITULASI PRESENSI PESERTA DIDIK', 148, 21, { align: 'center' });
  doc.setFontSize(9);
  doc.text(
    `Kelas: ${classRoom.namaKelas} | Mapel: ${classRoom.mataPelajaran} | Guru: ${teacher.namaGuru} | Semester: ${teacher.semester} ${teacher.tahunAjaran}`,
    148,
    27,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 30, 283, 30);

  // Table Simple Grid
  let startY = 36;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  doc.text('No', 15, startY);
  doc.text('NISN', 23, startY);
  doc.text('Nama Siswa', 45, startY);
  doc.text('L/P', 110, startY);
  doc.text('H', 230, startY);
  doc.text('S', 242, startY);
  doc.text('I', 254, startY);
  doc.text('A', 266, startY);
  doc.text('%', 276, startY);

  doc.setLineWidth(0.2);
  doc.line(14, startY + 2, 283, startY + 2);

  let currentY = startY + 6;
  doc.setFont('helvetica', 'normal');

  students.forEach((std, idx) => {
    if (currentY > 185) {
      doc.addPage();
      currentY = 20;
    }

    let h = 0, s = 0, i = 0, a = 0;
    sessions.forEach((sess) => {
      const st = sess.records?.[std.id]?.status;
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
    });

    const total = sessions.length || 1;
    const pct = Math.round((h / total) * 100);

    doc.text(String(idx + 1), 15, currentY);
    doc.text(std.nisn || '-', 23, currentY);
    doc.text(std.nama.substring(0, 32), 45, currentY);
    doc.text(std.gender, 110, currentY);
    doc.text(String(h), 230, currentY);
    doc.text(String(s), 242, currentY);
    doc.text(String(i), 254, currentY);
    doc.text(String(a), 266, currentY);
    doc.text(`${pct}%`, 276, currentY);

    currentY += 5;
  });

  // Footer / Tanda Tangan
  const signY = currentY + 10 > 180 ? 180 : currentY + 10;
  doc.setFontSize(9);
  doc.text(`Bawang, Batang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 220, signY);
  doc.text('Guru Mata Pelajaran,', 220, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.namaGuru, 220, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM. ${teacher.nbm || teacher.nip}`, 220, signY + 27);

  doc.save(`Presensi_${classRoom.namaKelas.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Export data siswa ke file Excel (.xlsx)
 */
export function exportStudentsToExcel(
  classRoom: ClassRoom | null,
  students: Student[],
  teacher?: TeacherProfile,
  allClasses?: ClassRoom[]
) {
  const headerRow1 = ['DATA PESERTA DIDIK'];
  const headerRow2 = [`Sekolah: ${teacher?.namaSekolah || 'SMK Muhammadiyah Bawang'}`];
  const headerRow3 = [
    classRoom
      ? `Kelas: ${classRoom.namaKelas} | Jurusan: ${classRoom.jurusan || '-'} | Tahun Ajaran: ${teacher?.tahunAjaran || '2025/2026'}`
      : `Seluruh Siswa (${students.length} Siswa) | Tahun Ajaran: ${teacher?.tahunAjaran || '2025/2026'}`
  ];
  const headerRow4 = [`Alamat: Jl. Bawang-Sukorejo KM 01, Jlamprang, Bawang, 51274 | Website: www.smkmuhiba.sch.id`];
  const emptyRow: any[] = [];

  const tableHeader = [
    'No',
    'NISN',
    'Nama Lengkap Siswa',
    'Jenis Kelamin (L/P)',
    'Kelas / Rombel',
    'Konsentrasi Keahlian',
    'No HP Orang Tua / Wali',
    'Catatan Khusus',
  ];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const tableData = sortedStudents.map((std, idx) => {
    const cls = allClasses?.find((c) => c.id === std.classId) || classRoom;
    return [
      idx + 1,
      std.nisn || '',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      cls ? cls.namaKelas : '-',
      cls ? cls.jurusan || 'Akuntansi dan Keuangan Lembaga' : '-',
      std.noHpOrangTua || '',
      std.catatanUmum || '',
    ];
  });

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = classRoom ? classRoom.namaKelas.replace(/[/\\?*[\]]/g, '_').slice(0, 30) : 'Semua Siswa';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = classRoom
    ? `Data_Siswa_${classRoom.namaKelas.replace(/\s+/g, '_')}.xlsx`
    : `Data_Seluruh_Siswa_SMK_Muhiba.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Agenda Mengajar ke PDF
 */
export function exportAgendaToPDF(
  agendas: TeachingAgenda[],
  classRoom: ClassRoom | null | undefined,
  teacher: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isMultiClass = !classRoom || classRoom.id === 'all';
  const classNameHeader = isMultiClass ? 'Semua Kelas' : classRoom.namaKelas;
  const subjectHeader = isMultiClass ? teacher.mataPelajaranUtama || 'Semua Mata Pelajaran' : classRoom.mataPelajaran;

  // Kop Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL', 105, 14, { align: 'center' });
  doc.setFontSize(14);
  doc.text('SMK MUHAMMADIYAH BAWANG', 105, 20, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Bawang-Sukorejo KM 01, Jlamprang, Bawang, 51274 | Website: www.smkmuhiba.sch.id', 105, 25, { align: 'center' });
  doc.setLineWidth(0.6);
  doc.line(14, 28, 196, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29, 196, 29);

  // Judul
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('JURNAL / AGENDA MENGAJAR GURU', 105, 36, { align: 'center' });

  // Identitas Guru & Kelas
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama Guru    : ${teacher.namaGuru}`, 14, 43);
  doc.text(`NBM / NIP     : ${teacher.nbm || teacher.nip || '-'}`, 14, 48);
  doc.text(`Mata Pelajaran: ${subjectHeader}`, 14, 53);

  doc.text(`Kelas / Rombel : ${classNameHeader}`, 130, 43);
  doc.text(`Tahun Ajaran   : ${teacher.tahunAjaran}`, 130, 48);
  doc.text(`Semester       : ${teacher.semester}`, 130, 53);

  // Table
  let startY = 58;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, startY, 182, 8, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(14, startY, 182, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('No', 16, startY + 5.5);
  doc.text('Hari / Tgl', 24, startY + 5.5);
  if (isMultiClass) {
    doc.text('Kelas', 46, startY + 5.5);
    doc.text('Jam', 66, startY + 5.5);
    doc.text('Materi / Capaian Pembelajaran', 78, startY + 5.5);
  } else {
    doc.text('Jam', 48, startY + 5.5);
    doc.text('Materi / Capaian Pembelajaran', 62, startY + 5.5);
  }
  doc.text('Hdr', 156, startY + 5.5);
  doc.text('Abs', 167, startY + 5.5);
  doc.text('TTD', 182, startY + 5.5);

  let currentY = startY + 8;
  doc.setFont('helvetica', 'normal');

  agendas.forEach((ag, idx) => {
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }

    const rowH = 10;
    const clsName = classesMap?.[ag.classId] || ag.classNameSnapshot || ag.classId;
    doc.rect(14, currentY, 182, rowH, 'S');
    doc.text(String(idx + 1), 16, currentY + 6);
    doc.text(`${ag.hari?.substring(0, 3)}, ${ag.tanggal}`, 24, currentY + 6);

    if (isMultiClass) {
      doc.text(clsName ? clsName.substring(0, 10) : '-', 46, currentY + 6);
      doc.text(`Ke-${ag.jamKe}`, 66, currentY + 6);
      doc.text(ag.materiAjar ? ag.materiAjar.substring(0, 38) : '-', 78, currentY + 6);
    } else {
      doc.text(`Ke-${ag.jamKe}`, 48, currentY + 6);
      doc.text(ag.materiAjar ? ag.materiAjar.substring(0, 46) : '-', 62, currentY + 6);
    }

    doc.text(String(ag.hadirCount ?? 0), 158, currentY + 6);
    doc.text(String(ag.tidakHadirCount ?? 0), 169, currentY + 6);
    doc.text('...', 184, currentY + 6);

    currentY += rowH;
  });

  // Tanda Tangan
  const signY = currentY + 12 > 260 ? 260 : currentY + 12;
  doc.setFontSize(8.5);
  doc.text(`Bawang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 140, signY);
  doc.text('Guru Mata Pelajaran,', 140, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.namaGuru, 140, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM/NIP: ${teacher.nbm || teacher.nip || '-'}`, 140, signY + 26);

  const pdfFileName = isMultiClass
    ? `Agenda_Mengajar_Semua_Kelas_${teacher.tahunAjaran.replace(/\//g, '-')}.pdf`
    : `Agenda_Mengajar_${classRoom.namaKelas.replace(/\s+/g, '_')}.pdf`;
  doc.save(pdfFileName);
}

/**
 * Unduh template Excel untuk impor data siswa
 */
export function downloadStudentTemplateExcel(classRoom: ClassRoom) {
  const wsData = [
    ['No', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'No HP Orang Tua', 'Catatan'],
    [1, '0081234567', 'Ahmad Fauzi', 'L', '08123456789', 'Contoh siswa 1'],
    [2, '0087654321', 'Siti Nurhaliza', 'P', '08567890123', 'Contoh siswa 2'],
    [3, '', 'Muhammad Rizki', 'L', '08781234567', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 14 },
    { wch: 20 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
  XLSX.writeFile(wb, `Template_Impor_Siswa_${classRoom.namaKelas.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Unduh template Excel untuk impor nilai siswa (sudah berisi daftar siswa kelas)
 */
export function downloadGradesTemplateExcel(
  classRoom: ClassRoom,
  students: Student[],
  gradeColumns: GradeColumn[],
  teacher: TeacherProfile
) {
  const activeCols = gradeColumns.slice(0, 8);
  const colLabels = activeCols.map((c) => c.label);

  const headerRow1 = ['TEMPLATE PENGISIAN NILAI SISWA'];
  const headerRow2 = [`Sekolah: ${teacher.namaSekolah || 'SMK Muhammadiyah Bawang'}`];
  const headerRow3 = [`Kelas: ${classRoom.namaKelas} | Mapel: ${classRoom.mataPelajaran} | KKM: ${classRoom.kkm}`];
  const headerRow4 = ['Petunjuk: Isikan angka nilai (0-100) pada kolom formatif dan sumatif. Jangan ubah kolom NISN atau Nama Siswa.'];
  const emptyRow: any[] = [];

  const tableHeader = [
    'No',
    'NISN',
    'Nama Siswa',
    'L/P',
    ...colLabels,
    'STS',
    'SAS',
    'Catatan Capaian',
  ];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const tableData = sortedStudents.map((std, idx) => [
    idx + 1,
    std.nisn || '',
    std.nama,
    std.gender,
    ...activeCols.map(() => ''),
    '',
    '',
    '',
  ]);

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 30 },
    { wch: 6 },
    ...activeCols.map(() => ({ wch: 14 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa');
  XLSX.writeFile(wb, `Template_Nilai_${classRoom.namaKelas.replace(/\s+/g, '_')}_${classRoom.mataPelajaran.replace(/\s+/g, '_')}.xlsx`);
}

