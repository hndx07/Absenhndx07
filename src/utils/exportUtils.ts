import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceSession,
  ClassRoom,
  Student,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  TeacherProfile,
} from '../types';
import { triggerSafeDownload, ExportDownloadPayload } from '../components/ExportDownloadModal';

// Helper to format safe filenames
function sanitizeFileName(str: string, fallback = 'Dokumen'): string {
  if (!str) return fallback;
  return str.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
}

// Helper to dispatch global export event so modal appears instantly
export function dispatchExportEvent(payload: ExportDownloadPayload) {
  try {
    const event = new CustomEvent<ExportDownloadPayload>('app:show-export-download', {
      detail: payload,
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.error('Failed to dispatch export event:', err);
  }
}

// Helper to bundle XLSX workbook into safe download payload & trigger download
function finalizeWorkbookDownload(
  wb: XLSX.WorkBook,
  fileName: string,
  title: string,
  description?: string,
  previewHeaders?: string[],
  previewRows?: (string | number)[][]
) {
  try {
    // 1. Array buffer & Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const blobUrl = URL.createObjectURL(blob);

    // 2. Base64 data URI
    const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`;

    // 3. Extract CSV and TSV string from first worksheet
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const csvContent = ws ? XLSX.utils.sheet_to_csv(ws) : '';
    const tsvClipboardContent = ws
      ? XLSX.utils.sheet_to_csv(ws, { FS: '\t' })
      : '';

    // Estimate file size
    const sizeInKb = (blob.size / 1024).toFixed(1);
    const fileSizeStr = `${sizeInKb} KB`;

    // 4. Trigger safe browser download immediately
    triggerSafeDownload(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // 5. Open export download modal with all options
    dispatchExportEvent({
      id: String(Date.now()),
      title,
      description,
      fileName,
      fileType: fileName.toLowerCase().includes('template') ? 'template' : 'excel',
      fileSizeStr,
      blob,
      blobUrl,
      dataUri,
      csvContent,
      tsvClipboardContent,
      previewHeaders,
      previewRows,
      totalRows: previewRows?.length || 0,
    });
  } catch (err) {
    console.error('Error generating workbook download:', err);
  }
}

// Helper to bundle jsPDF document into safe download payload & trigger download
function finalizePdfDownload(
  doc: jsPDF,
  fileName: string,
  title: string,
  description?: string
) {
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const dataUri = doc.output('datauristring');

    const sizeInKb = (pdfBlob.size / 1024).toFixed(1);
    const fileSizeStr = `${sizeInKb} KB`;

    // 1. Attempt standard download
    triggerSafeDownload(pdfBlob, fileName, 'application/pdf');

    // 2. Open modal with PDF preview / direct download link / print
    dispatchExportEvent({
      id: String(Date.now()),
      title,
      description,
      fileName,
      fileType: 'pdf',
      fileSizeStr,
      blob: pdfBlob,
      blobUrl,
      dataUri,
    });
  } catch (err) {
    console.error('Error generating PDF download:', err);
  }
}

/* =========================================================================
 * 1. PRESENSI (ATTENDANCE) - EXCEL & PDF
 * ========================================================================= */

export function exportAttendanceToExcel(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  sessions: AttendanceSession[] = [],
  teacher?: TeacherProfile
) {
  const className = classRoom?.namaKelas || 'Kelas';
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';
  const subject = classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || '-';
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';

  const sortedSessions = [...sessions].sort((a, b) => a.pertemuanKe - b.pertemuanKe);

  const headerRow1 = ['REKAPITULASI PRESENSI SISWA'];
  const headerRow2 = [`Sekolah: ${schoolName}`];
  const headerRow3 = [`Kelas: ${className} | Mata Pelajaran: ${subject} | Tahun Ajaran: ${academicYear} (${semester})`];
  const headerRow4 = [`Guru Pengampu: ${teacherName} (NBM/NIP: ${nip})`];
  const emptyRow: any[] = [];

  const sessionCols = sortedSessions.map((s) => `P-${s.pertemuanKe} (${s.tanggal || '-'})`);
  const tableHeader = [
    'No',
    'NISN',
    'Nama Lengkap Siswa',
    'L/P',
    ...sessionCols,
    'Hadir (H)',
    'Sakit (S)',
    'Izin (I)',
    'Alfa (A)',
    '% Kehadiran',
  ];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const tableData = sortedStudents.map((std, idx) => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;

    const rowSessionVals = sortedSessions.map((session) => {
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
      std.nisn || '',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      ...rowSessionVals,
      h,
      s,
      i,
      a,
      `${pct}%`,
    ];
  });

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

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
  const safeSheetName = sanitizeFileName(className, 'Presensi').slice(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const fileName = `Presensi_${sanitizeFileName(className)}_${sanitizeFileName(academicYear)}.xlsx`;
  finalizeWorkbookDownload(
    wb,
    fileName,
    `Rekap Presensi - ${className}`,
    `Data presensi ${sortedStudents.length} siswa dengan ${sortedSessions.length} sesi pertemuan`,
    tableHeader,
    tableData.slice(0, 15)
  );
}

export function exportAttendanceToPDF(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  sessions: AttendanceSession[] = [],
  teacher?: TeacherProfile
) {
  const className = classRoom?.namaKelas || 'Kelas';
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';
  const subject = classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || '-';
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Kop Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 148, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REKAPITULASI PRESENSI PESERTA DIDIK', 148, 20, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(
    `Kelas: ${className} | Mata Pelajaran: ${subject} | Semester: ${semester} ${academicYear} | Guru: ${teacherName} (NBM/NIP: ${nip})`,
    148,
    25,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 28, 283, 28);

  const sortedSessions = [...sessions].sort((a, b) => a.pertemuanKe - b.pertemuanKe);
  const sortedStudents = [...students].sort((a, b) => a.no - b.no);

  const head = [
    [
      'No',
      'NISN',
      'Nama Peserta Didik',
      'L/P',
      ...sortedSessions.slice(0, 16).map((s) => `P${s.pertemuanKe}`),
      'H',
      'S',
      'I',
      'A',
      '%',
    ],
  ];

  const body = sortedStudents.map((std, idx) => {
    let h = 0, s = 0, i = 0, a = 0;
    const sessionVals = sortedSessions.slice(0, 16).map((sess) => {
      const st = sess.records?.[std.id]?.status || '-';
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
      return st;
    });

    const total = sortedSessions.length || 1;
    const pct = Math.round((h / total) * 100);

    return [
      idx + 1,
      std.nisn || '-',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      ...sessionVals,
      h,
      s,
      i,
      a,
      `${pct}%`,
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      halign: 'center',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 55, halign: 'left' },
      3: { cellWidth: 10 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer Signature
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  const signY = finalY + 12 > 185 ? 185 : finalY + 12;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Bawang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    230,
    signY
  );
  doc.text('Guru Mata Pelajaran,', 230, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, 230, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM/NIP: ${nip}`, 230, signY + 26);

  const fileName = `Presensi_${sanitizeFileName(className)}.pdf`;
  finalizePdfDownload(doc, fileName, `Rekap Presensi PDF - ${className}`, `Format resmi cetak untuk kelas ${className}`);
}

/* =========================================================================
 * 2. NILAI (GRADES) - EXCEL & PDF
 * ========================================================================= */

export function exportGradesToExcel(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  grades: StudentGrade[] = [],
  gradeColumns: GradeColumn[] = [],
  teacher?: TeacherProfile
) {
  const className = classRoom?.namaKelas || 'Kelas';
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const kkm = Number(classRoom?.kkm) || 75;
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';
  const subject = classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || '-';
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';

  const headerRow1 = ['REKAPITULASI PENILAIAN SISWA (FORMATIF & SUMATIF)'];
  const headerRow2 = [`Sekolah: ${schoolName}`];
  const headerRow3 = [`Kelas: ${className} | Mapel: ${subject} | Standar KKM: ${kkm}`];
  const headerRow4 = [`Guru: ${teacherName} (NBM/NIP: ${nip}) | Semester: ${semester} ${academicYear}`];
  const emptyRow: any[] = [];

  const activeCols = gradeColumns.slice(0, 10);
  const colHeaders = activeCols.map((c) => c.label);

  const tableHeader = [
    'No',
    'NISN',
    'Nama Lengkap Siswa',
    'L/P',
    ...colHeaders,
    'Total Sum (Terisi)',
    'Rata Formatif',
    'STS',
    'SAS',
    'Nilai Akhir',
    'Predikat',
    'Status KKM',
    'Catatan Capaian',
  ];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const tableData = sortedStudents.map((std, idx) => {
    const g = grades.find((item) => item.studentId === std.id);
    const fVals = activeCols.map((col) => {
      const val = g ? (g as any)[col.key] : undefined;
      return typeof val === 'number' && !isNaN(val) ? val : null;
    });

    const filledF = fVals.filter((v): v is number => v !== null);
    const avgF = filledF.length > 0 ? Math.round(filledF.reduce((a, b) => a + b, 0) / filledF.length) : null;
    const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
    const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

    // HANYA hitung nilai yang sudah diinput saja kedalam total sum (bukan yang kosong)
    let totalSum = 0;
    let countInputted = 0;
    filledF.forEach((v) => {
      totalSum += v;
      countInputted++;
    });
    if (sts !== null) {
      totalSum += sts;
      countInputted++;
    }
    if (sas !== null) {
      totalSum += sas;
      countInputted++;
    }

    const hasAny = countInputted > 0;

    let totalWeighted = 0;
    let totalW = 0;
    if (avgF !== null) {
      totalWeighted += avgF * 0.5;
      totalW += 0.5;
    }
    if (sts !== null) {
      totalWeighted += sts * 0.25;
      totalW += 0.25;
    }
    if (sas !== null) {
      totalWeighted += sas * 0.25;
      totalW += 0.25;
    }

    const finalScore = totalW > 0 ? Math.round(totalWeighted / totalW) : 0;

    let predikat = '-';
    if (hasAny) {
      if (finalScore >= 90) predikat = 'A';
      else if (finalScore >= 80) predikat = 'B';
      else if (finalScore >= kkm) predikat = 'C';
      else predikat = 'D';
    }

    const status = !hasAny ? '-' : finalScore >= kkm ? 'Tuntas' : 'Belum Tuntas';

    return [
      idx + 1,
      std.nisn || '',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      ...fVals.map((v) => (v !== null ? v : '')),
      hasAny ? totalSum : '',
      avgF !== null ? avgF : '',
      sts !== null ? sts : '',
      sas !== null ? sas : '',
      hasAny ? finalScore : '',
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
    ...colHeaders.map(() => ({ wch: 10 })),
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = sanitizeFileName(className, 'Nilai').slice(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const fileName = `Nilai_${sanitizeFileName(className)}_${sanitizeFileName(academicYear)}.xlsx`;
  finalizeWorkbookDownload(
    wb,
    fileName,
    `Rekapitulasi Nilai - ${className}`,
    `Daftar capaian nilai formatif & sumatif untuk kelas ${className}`,
    tableHeader,
    tableData.slice(0, 15)
  );
}

export function exportGradesToPDF(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  grades: StudentGrade[] = [],
  gradeColumns: GradeColumn[] = [],
  teacher?: TeacherProfile
) {
  const className = classRoom?.namaKelas || 'Kelas';
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const kkm = Number(classRoom?.kkm) || 75;
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';
  const subject = classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || '-';
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Kop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 148, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('DAFTAR KUMPULAN NILAI (FORMATIF & SUMATIF)', 148, 20, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(
    `Kelas: ${className} | Mata Pelajaran: ${subject} | KKM: ${kkm} | Semester: ${semester} ${academicYear} | Guru: ${teacherName} (NBM/NIP: ${nip})`,
    148,
    25,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 28, 283, 28);

  const activeCols = gradeColumns.slice(0, 6);
  const head = [
    [
      'No',
      'NISN',
      'Nama Peserta Didik',
      'L/P',
      ...activeCols.map((c) => c.label),
      'Sum',
      'Avg F',
      'STS',
      'SAS',
      'Akhir',
      'Pred',
      'Status',
    ],
  ];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const body = sortedStudents.map((std, idx) => {
    const g = grades.find((item) => item.studentId === std.id);
    const fVals = activeCols.map((col) => {
      const val = g ? (g as any)[col.key] : undefined;
      return typeof val === 'number' && !isNaN(val) ? val : null;
    });

    const filledF = fVals.filter((v): v is number => v !== null);
    const avgF = filledF.length > 0 ? Math.round(filledF.reduce((a, b) => a + b, 0) / filledF.length) : null;
    const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
    const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

    let totalSum = 0;
    let countInputted = 0;
    filledF.forEach((v) => {
      totalSum += v;
      countInputted++;
    });
    if (sts !== null) {
      totalSum += sts;
      countInputted++;
    }
    if (sas !== null) {
      totalSum += sas;
      countInputted++;
    }

    const hasAny = countInputted > 0;
    let totalWeighted = 0;
    let totalW = 0;
    if (avgF !== null) {
      totalWeighted += avgF * 0.5;
      totalW += 0.5;
    }
    if (sts !== null) {
      totalWeighted += sts * 0.25;
      totalW += 0.25;
    }
    if (sas !== null) {
      totalWeighted += sas * 0.25;
      totalW += 0.25;
    }
    const finalScore = totalW > 0 ? Math.round(totalWeighted / totalW) : 0;

    let predikat = '-';
    if (hasAny) {
      if (finalScore >= 90) predikat = 'A';
      else if (finalScore >= 80) predikat = 'B';
      else if (finalScore >= kkm) predikat = 'C';
      else predikat = 'D';
    }

    const status = !hasAny ? '-' : finalScore >= kkm ? 'Tuntas' : 'B.Tuntas';

    return [
      idx + 1,
      std.nisn || '-',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      ...fVals.map((v) => (v !== null ? v : '-')),
      hasAny ? totalSum : '-',
      avgF !== null ? avgF : '-',
      sts !== null ? sts : '-',
      sas !== null ? sas : '-',
      hasAny ? finalScore : '-',
      predikat,
      status,
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      halign: 'center',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 55, halign: 'left' },
      3: { cellWidth: 10 },
      11: {
        fontStyle: 'bold',
      },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  const signY = finalY + 12 > 185 ? 185 : finalY + 12;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Bawang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    230,
    signY
  );
  doc.text('Guru Mata Pelajaran,', 230, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, 230, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM/NIP: ${nip}`, 230, signY + 26);

  const fileName = `Rekap_Nilai_${sanitizeFileName(className)}.pdf`;
  finalizePdfDownload(doc, fileName, `Rekap Nilai PDF - ${className}`, `Laporan nilai resmi kelas ${className}`);
}

/* =========================================================================
 * 3. DATA SISWA (STUDENTS) - EXCEL, PDF & TEMPLATE
 * ========================================================================= */

export function exportStudentsToExcel(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  teacher?: TeacherProfile,
  allClasses?: ClassRoom[]
) {
  const isAll = !classRoom || classRoom.id === 'all';
  const className = isAll ? 'Semua Kelas' : classRoom.namaKelas;
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const academicYear = teacher?.tahunAjaran || '2025/2026';

  const headerRow1 = ['DATA PESERTA DIDIK'];
  const headerRow2 = [`Sekolah: ${schoolName}`];
  const headerRow3 = [
    isAll
      ? `Seluruh Siswa (${students.length} Siswa) | Tahun Ajaran: ${academicYear}`
      : `Kelas: ${className} | Konsentrasi Keahlian: ${classRoom?.jurusan || '-'} | Tahun Ajaran: ${academicYear}`,
  ];
  const headerRow4 = ['Alamat: Jl. Bawang-Sukorejo KM 01, Bawang, Batang | Website: www.smkmuhiba.sch.id'];
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
  const sheetName = isAll ? 'Semua Siswa' : sanitizeFileName(className).slice(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = isAll
    ? `Data_Seluruh_Siswa_SMK_Muhiba.xlsx`
    : `Data_Siswa_${sanitizeFileName(className)}.xlsx`;

  finalizeWorkbookDownload(
    wb,
    fileName,
    `Data Siswa - ${className}`,
    `Daftar lengkap peserta didik (${sortedStudents.length} siswa)`,
    tableHeader,
    tableData.slice(0, 15)
  );
}

export function exportStudentsToPDF(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  teacher?: TeacherProfile,
  allClasses?: ClassRoom[]
) {
  const isAll = !classRoom || classRoom.id === 'all';
  const className = isAll ? 'Semua Kelas' : classRoom.namaKelas;
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const academicYear = teacher?.tahunAjaran || '2025/2026';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Kop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 105, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('DAFTAR PESERTA DIDIK', 105, 20, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(
    `Rombel: ${className} | Tahun Ajaran: ${academicYear} | Total: ${students.length} Siswa`,
    105,
    25,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  const head = [['No', 'NISN', 'Nama Lengkap Siswa', 'L/P', 'Rombel', 'No HP Ortu / Wali']];

  const sortedStudents = [...students].sort((a, b) => a.no - b.no);
  const body = sortedStudents.map((std, idx) => {
    const cls = allClasses?.find((c) => c.id === std.classId) || classRoom;
    return [
      idx + 1,
      std.nisn || '-',
      std.nama,
      std.gender === 'P' ? 'P' : 'L',
      cls ? cls.namaKelas : '-',
      std.noHpOrangTua || '-',
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 65 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 40 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const fileName = isAll
    ? `Daftar_Siswa_Semua_Kelas.pdf`
    : `Daftar_Siswa_${sanitizeFileName(className)}.pdf`;

  finalizePdfDownload(doc, fileName, `Daftar Siswa PDF - ${className}`, `Daftar resmi peserta didik kelas ${className}`);
}

/**
 * Unduh template Excel untuk impor data siswa
 */
export function downloadStudentTemplateExcel(classRoom?: ClassRoom | null) {
  const className = classRoom?.namaKelas || 'Umum';

  const wsData = [
    ['TEMPLATE IMPOR DATA SISWA (SMK MUHAMMADIYAH BAWANG)'],
    [`Kelas: ${className} | Petunjuk: Isi kolom NISN, Nama Lengkap, Jenis Kelamin (L/P), No HP Ortu, dan Catatan.`],
    [],
    ['No', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'No HP Orang Tua', 'Catatan'],
    [1, '0081234567', 'Ahmad Fauzi', 'L', '08123456789', 'Contoh siswa 1'],
    [2, '0087654321', 'Siti Nurhaliza', 'P', '08567890123', 'Contoh siswa 2'],
    [3, '0089988776', 'Muhammad Rizki', 'L', '08781234567', 'Contoh siswa 3'],
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

  const fileName = `Template_Impor_Siswa_${sanitizeFileName(className)}.xlsx`;
  const tableHeader = ['No', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'No HP Orang Tua', 'Catatan'];
  const previewRows = [
    [1, '0081234567', 'Ahmad Fauzi', 'L', '08123456789', 'Contoh siswa 1'],
    [2, '0087654321', 'Siti Nurhaliza', 'P', '08567890123', 'Contoh siswa 2'],
    [3, '0089988776', 'Muhammad Rizki', 'L', '08781234567', 'Contoh siswa 3'],
  ];

  finalizeWorkbookDownload(
    wb,
    fileName,
    `Template Impor Siswa - ${className}`,
    'Gunakan template ini untuk mengisi daftar nama siswa baru sebelum diunggah kembali ke sistem.',
    tableHeader,
    previewRows
  );
}

/**
 * Unduh template Excel untuk impor nilai siswa (sudah berisi daftar siswa kelas)
 */
export function downloadGradesTemplateExcel(
  classRoom: ClassRoom | null | undefined,
  students: Student[] = [],
  gradeColumns: GradeColumn[] = [],
  teacher?: TeacherProfile
) {
  const className = classRoom?.namaKelas || 'Kelas';
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const subject = classRoom?.mataPelajaran || teacher?.mataPelajaranUtama || 'Mapel';
  const kkm = Number(classRoom?.kkm) || 75;

  const activeCols = (gradeColumns || []).slice(0, 8);
  const colLabels = activeCols.length > 0 ? activeCols.map((c) => c.label) : ['TP 1', 'TP 2', 'TP 3'];

  const headerRow1 = ['TEMPLATE PENGISIAN NILAI SISWA'];
  const headerRow2 = [`Sekolah: ${schoolName}`];
  const headerRow3 = [`Kelas: ${className} | Mapel: ${subject} | KKM: ${kkm}`];
  const headerRow4 = [
    'Petunjuk: Isikan angka nilai (0-100) pada kolom formatif dan sumatif. Jangan ubah kolom NISN atau Nama Siswa.',
  ];
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
  const tableData = sortedStudents.length > 0
    ? sortedStudents.map((std, idx) => [
        idx + 1,
        std.nisn || '',
        std.nama,
        std.gender === 'P' ? 'P' : 'L',
        ...colLabels.map(() => ''),
        '',
        '',
        '',
      ])
    : [
        [1, '0081234567', 'Ahmad Fauzi', 'L', ...colLabels.map(() => '85'), '80', '88', 'Sangat baik'],
        [2, '0087654321', 'Siti Nurhaliza', 'P', ...colLabels.map(() => '90'), '85', '92', 'Sangat baik'],
      ];

  const fullData = [headerRow1, headerRow2, headerRow3, headerRow4, emptyRow, tableHeader, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 30 },
    { wch: 6 },
    ...colLabels.map(() => ({ wch: 12 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa');

  const fileName = `Template_Nilai_${sanitizeFileName(className)}_${sanitizeFileName(subject)}.xlsx`;
  finalizeWorkbookDownload(
    wb,
    fileName,
    `Template Impor Nilai - ${className}`,
    `Template pengisian nilai dengan daftar ${sortedStudents.length} siswa kelas ${className}`,
    tableHeader,
    tableData.slice(0, 15)
  );
}

/* =========================================================================
 * 4. AGENDA MENGAJAR (TEACHING AGENDAS) - EXCEL & PDF
 * ========================================================================= */

export function exportAgendasToExcel(
  agendas: TeachingAgenda[] = [],
  classRoom: ClassRoom | null | undefined,
  teacher?: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const isMultiClass = !classRoom || classRoom.id === 'all';
  const classNameHeader = isMultiClass ? 'Semua Kelas' : classRoom.namaKelas;
  const subjectHeader = isMultiClass ? teacher?.mataPelajaranUtama || 'Semua Mapel' : classRoom.mataPelajaran;
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';

  const header = [
    ['BUKU JURNAL / AGENDA MENGAJAR GURU'],
    [`Sekolah: ${teacher?.namaSekolah || 'SMK Muhammadiyah Bawang'}`],
    [`Guru: ${teacherName} | NBM/NIP: ${nip}`],
    [`Kelas: ${classNameHeader} | Mapel: ${subjectHeader} | Semester: ${semester} ${academicYear}`],
    [],
    isMultiClass
      ? [
          'No',
          'Tanggal',
          'Hari',
          'Kelas',
          'Jam Ke',
          'Rentang Jam',
          'Materi / Capaian Pembelajaran',
          'Kegiatan Pembelajaran',
          'Catatan / Evaluasi',
          'Hadir',
          'Tidak Hadir',
        ]
      : [
          'No',
          'Tanggal',
          'Hari',
          'Jam Ke',
          'Rentang Jam',
          'Materi / Capaian Pembelajaran',
          'Kegiatan Pembelajaran',
          'Catatan / Evaluasi',
          'Hadir',
          'Tidak Hadir',
        ],
  ];

  const rows = agendas.map((ag, idx) => {
    const clsName = classesMap?.[ag.classId] || ag.classNameSnapshot || ag.classId;
    if (isMultiClass) {
      return [
        idx + 1,
        ag.tanggal || '-',
        ag.hari || '-',
        clsName || '-',
        ag.jamKe || '-',
        ag.rentangJam || '-',
        ag.materiAjar || '-',
        ag.kegiatan || '-',
        ag.catatan || '-',
        ag.hadirCount ?? 0,
        ag.tidakHadirCount ?? 0,
      ];
    }
    return [
      idx + 1,
      ag.tanggal || '-',
      ag.hari || '-',
      ag.jamKe || '-',
      ag.rentangJam || '-',
      ag.materiAjar || '-',
      ag.kegiatan || '-',
      ag.catatan || '-',
      ag.hadirCount ?? 0,
      ag.tidakHadirCount ?? 0,
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
  const sheetName = isMultiClass
    ? 'Jurnal_Semua_Kelas'
    : `Jurnal_${sanitizeFileName(classNameHeader).slice(0, 20)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = isMultiClass
    ? `Buku_Jurnal_Semua_Kelas_${sanitizeFileName(academicYear)}.xlsx`
    : `Buku_Jurnal_${sanitizeFileName(classNameHeader)}.xlsx`;

  finalizeWorkbookDownload(
    wb,
    fileName,
    `Buku Jurnal Mengajar - ${classNameHeader}`,
    `Catatan kegiatan mengajar (${agendas.length} entri agenda)`,
    header[5],
    rows.slice(0, 15)
  );
}

export function exportAgendaToPDF(
  agendas: TeachingAgenda[] = [],
  classRoom: ClassRoom | null | undefined,
  teacher?: TeacherProfile,
  classesMap?: Record<string, string>
) {
  const isMultiClass = !classRoom || classRoom.id === 'all';
  const classNameHeader = isMultiClass ? 'Semua Kelas' : classRoom.namaKelas;
  const subjectHeader = isMultiClass ? teacher?.mataPelajaranUtama || 'Semua Mata Pelajaran' : classRoom.mataPelajaran;
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';
  const academicYear = teacher?.tahunAjaran || '2025/2026';
  const semester = teacher?.semester || 'Ganjil';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Kop Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL', 105, 14, { align: 'center' });
  doc.setFontSize(14);
  doc.text('SMK MUHAMMADIYAH BAWANG', 105, 20, { align: 'center' });
  doc.setFontSize(8);
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
  doc.text(`Nama Guru    : ${teacherName}`, 14, 43);
  doc.text(`NBM / NIP     : ${nip}`, 14, 48);
  doc.text(`Mata Pelajaran: ${subjectHeader}`, 14, 53);

  doc.text(`Kelas / Rombel : ${classNameHeader}`, 125, 43);
  doc.text(`Tahun Ajaran   : ${academicYear}`, 125, 48);
  doc.text(`Semester       : ${semester}`, 125, 53);

  const head = [
    isMultiClass
      ? ['No', 'Hari/Tgl', 'Kelas', 'Jam', 'Materi / Capaian Pembelajaran', 'Hdr', 'Abs', 'Paraf']
      : ['No', 'Hari/Tgl', 'Jam', 'Materi / Capaian Pembelajaran', 'Kegiatan', 'Hdr', 'Abs', 'Paraf'],
  ];

  const body = agendas.map((ag, idx) => {
    const clsName = classesMap?.[ag.classId] || ag.classNameSnapshot || ag.classId;
    if (isMultiClass) {
      return [
        idx + 1,
        `${ag.hari?.substring(0, 3) || ''}, ${ag.tanggal || ''}`,
        clsName || '-',
        `Ke-${ag.jamKe || 1}`,
        ag.materiAjar || '-',
        ag.hadirCount ?? 0,
        ag.tidakHadirCount ?? 0,
        'OK',
      ];
    }
    return [
      idx + 1,
      `${ag.hari?.substring(0, 3) || ''}, ${ag.tanggal || ''}`,
      `Ke-${ag.jamKe || 1}`,
      ag.materiAjar || '-',
      ag.kegiatan || '-',
      ag.hadirCount ?? 0,
      ag.tidakHadirCount ?? 0,
      'OK',
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 58,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const signY = finalY + 12 > 250 ? 250 : finalY + 12;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Bawang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    140,
    signY
  );
  doc.text('Guru Mata Pelajaran,', 140, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, 140, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM/NIP: ${nip}`, 140, signY + 26);

  const pdfFileName = isMultiClass
    ? `Agenda_Mengajar_Semua_Kelas_${sanitizeFileName(academicYear)}.pdf`
    : `Agenda_Mengajar_${sanitizeFileName(classNameHeader)}.pdf`;

  finalizePdfDownload(doc, pdfFileName, `Agenda Mengajar PDF - ${classNameHeader}`, `Buku jurnal cetak untuk kelas ${classNameHeader}`);
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
  const fileName = `${sanitizeFileName(title)}.doc`;
  triggerSafeDownload(blob, fileName, 'application/msword');

  dispatchExportEvent({
    id: String(Date.now()),
    title: `Dokumen Word - ${title}`,
    description: 'Dokumen Microsoft Word siap dibuka dan diedit.',
    fileName,
    fileType: 'word',
    blob,
  });
}

/* =========================================================================
 * 5. REKAP BULANAN (MONTHLY RECAP) - EXCEL & PDF
 * ========================================================================= */

export function exportMonthlyAttendanceToExcel(
  classLabel: string,
  monthLabel: string,
  selectedYear: number,
  dataRows: any[],
  teacher?: TeacherProfile
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([]);

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['REKAPITULASI PRESENSI BULANAN'],
      [`Sekolah: ${teacher?.namaSekolah || 'SMK Muhammadiyah Bawang'}`],
      [`Periode: ${monthLabel} ${selectedYear} | Rombel: ${classLabel}`],
      [`Guru Pengampu: ${teacher?.namaGuru || 'Guru'} (NBM/NIP: ${teacher?.nbm || teacher?.nip || '-'})`],
      ['Website: www.smkmuhiba.sch.id | Alamat: Jl. Bawang-Sukorejo KM 01, Bawang'],
      [],
    ],
    { origin: 'A1' }
  );

  XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A7' });
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Bulanan');

  const fileName = `Rekap_Presensi_${sanitizeFileName(classLabel)}_${sanitizeFileName(monthLabel)}_${selectedYear}.xlsx`;
  const previewHeaders = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];
  const previewRows = dataRows.slice(0, 15).map((r) => Object.values(r) as (string | number)[]);

  finalizeWorkbookDownload(
    wb,
    fileName,
    `Rekap Presensi Bulanan - ${classLabel}`,
    `Rekapitulasi kehadiran siswa periode ${monthLabel} ${selectedYear}`,
    previewHeaders,
    previewRows
  );
}

export function exportMonthlyAttendanceToPDF(
  classLabel: string,
  monthLabel: string,
  selectedYear: number,
  dataRows: any[],
  teacher?: TeacherProfile
) {
  const schoolName = teacher?.namaSekolah || 'SMK Muhammadiyah Bawang';
  const teacherName = teacher?.namaGuru || 'Guru Pengampu';
  const nip = teacher?.nbm || teacher?.nip || '-';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 148, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`REKAPITULASI PRESENSI BULANAN - ${monthLabel.toUpperCase()} ${selectedYear}`, 148, 20, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(
    `Rombel: ${classLabel} | Guru: ${teacherName} (NBM/NIP: ${nip})`,
    148,
    25,
    { align: 'center' }
  );

  doc.setLineWidth(0.5);
  doc.line(14, 28, 283, 28);

  if (dataRows.length > 0) {
    const headers = Object.keys(dataRows[0]);
    const body = dataRows.map((r) => Object.values(r) as (string | number)[]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: 32,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        halign: 'center',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  }

  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  const signY = finalY + 12 > 185 ? 185 : finalY + 12;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Bawang, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    230,
    signY
  );
  doc.text('Guru Mata Pelajaran,', 230, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, 230, signY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`NBM/NIP: ${nip}`, 230, signY + 26);

  const fileName = `Rekap_Presensi_${sanitizeFileName(classLabel)}_${sanitizeFileName(monthLabel)}_${selectedYear}.pdf`;
  finalizePdfDownload(doc, fileName, `Rekap Bulanan PDF - ${classLabel}`, `Format cetak rekap kehadiran ${monthLabel} ${selectedYear}`);
}
