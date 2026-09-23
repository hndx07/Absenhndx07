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

export function exportAgendasToExcel(agendas: TeachingAgenda[], classRoom: ClassRoom, teacher: TeacherProfile) {
  const header = [
    ['BUKU JURNAL / AGENDA MENGAJAR GURU'],
    [`Sekolah: ${teacher.namaSekolah}`],
    [`Guru: ${teacher.namaGuru} | NBM/NIP: ${teacher.nbm || teacher.nip}`],
    [`Kelas: ${classRoom.namaKelas} | Mapel: ${classRoom.mataPelajaran} | Semester: ${teacher.semester} ${teacher.tahunAjaran}`],
    [],
    ['No', 'Tanggal', 'Hari', 'Jam Ke', 'Rentang Jam', 'Materi / Capaian Pembelajaran', 'Kegiatan Pembelajaran', 'Catatan / Evaluasi', 'Hadir', 'Tidak Hadir'],
  ];

  const rows = agendas.map((ag, idx) => [
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
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
  ws['!cols'] = [
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
  XLSX.utils.book_append_sheet(wb, ws, 'Jurnal_Mengajar');
  XLSX.writeFile(wb, `Buku_Jurnal_${classRoom.namaKelas.replace(/\s+/g, '_')}.xlsx`);
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
          <p style="margin:0; font-size:9.5pt;">Alamat: Jl. Raya Bawang - Subah, Kec. Bawang, Kab. Batang, Jawa Tengah 51274</p>
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
