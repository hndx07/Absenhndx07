import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Award,
  Edit3,
  FileSpreadsheet,
  Share2,
  FileText,
  Search,
  Check,
  Sparkles,
  ExternalLink,
  Copy,
  Sliders,
  X,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Save,
  Cloud,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import {
  ClassRoom,
  Student,
  StudentGrade,
  GradeColumn,
  TeacherProfile,
  PublicShareRecord,
} from '../types';
import { exportGradesToExcel, downloadGradesTemplateExcel } from '../utils/exportUtils';
import { createOrUpdatePublicShare } from '../services/data';

interface GradesViewProps {
  currentClass: ClassRoom;
  students: Student[];
  grades: StudentGrade[];
  gradeColumns: GradeColumn[];
  teacher: TeacherProfile;
  onSaveGrade: (grade: StudentGrade) => void;
  onSaveGradeColumns: (cols: GradeColumn[]) => void;
}

interface GradePreviewRow {
  rowNum: number;
  nisn: string;
  nama: string;
  studentId?: string;
  scores: Record<string, number | null>;
  catatan: string;
  status: 'valid' | 'duplicate' | 'not_found' | 'invalid';
  reason?: string;
}

export const GradesView: React.FC<GradesViewProps> = ({
  currentClass,
  students,
  grades,
  gradeColumns,
  teacher,
  onSaveGrade,
  onSaveGradeColumns,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeColumnsCount, setActiveColumnsCount] = useState<number>(5);
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
  const [editingColumns, setEditingColumns] = useState<GradeColumn[]>(gradeColumns);

  // Local State for Instant UI (Zero-Delay Input)
  const [localGrades, setLocalGrades] = useState<Record<string, StudentGrade>>({});
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pendingSaves, setPendingSaves] = useState<Record<string, StudentGrade>>({});
  const debounceTimerRef = useRef<any>(null);

  // Share state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [importFileName, setImportFileName] = useState('');
  const [importRawText, setImportRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedGradeRows, setParsedGradeRows] = useState<GradePreviewRow[]>([]);
  const [overwriteMode, setOverwriteMode] = useState<'skip' | 'update'>('skip');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === currentClass.id)
      .sort((a, b) => a.no - b.no);
  }, [students, currentClass.id]);

  // Sync prop grades into local state initially and when switching classes
  useEffect(() => {
    const map: Record<string, StudentGrade> = {};
    grades
      .filter((g) => g.classId === currentClass.id)
      .forEach((g) => {
        map[g.studentId] = g;
      });
    setLocalGrades(map);
    setPendingSaves({});
    setSyncStatus('saved');
  }, [grades, currentClass.id]);

  useEffect(() => {
    setEditingColumns(gradeColumns);
  }, [gradeColumns]);

  // Debounced cloud synchronization
  const scheduleCloudSync = (updatedRecord: StudentGrade) => {
    setSyncStatus('saving');
    setPendingSaves((prev) => ({ ...prev, [updatedRecord.studentId]: updatedRecord }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await onSaveGrade(updatedRecord);
        setPendingSaves((prev) => {
          const next = { ...prev };
          delete next[updatedRecord.studentId];
          return next;
        });
        setSyncStatus('saved');
      } catch (err) {
        console.error('Failed to sync grade to cloud:', err);
        setSyncStatus('error');
      }
    }, 900);
  };

  // Immediate save all pending changes or all current grades to Cloud
  const handleSaveAllNow = async () => {
    setSyncStatus('saving');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    try {
      const pendingList = Object.values(pendingSaves);
      if (pendingList.length > 0) {
        const promises = pendingList.map((g) => onSaveGrade(g));
        await Promise.all(promises);
        setPendingSaves({});
      } else {
        // Save all students' grade records for the active class to Cloud
        const allGrades = classStudents.map((std) => {
          return (
            localGrades[std.id] || {
              id: `grd_${currentClass.id}_${std.id}`,
              studentId: std.id,
              classId: currentClass.id,
              catatan: '',
            }
          );
        });
        const promises = allGrades.map((g) => onSaveGrade(g));
        await Promise.all(promises);
      }
      setSyncStatus('saved');
    } catch (err) {
      console.error('Error saving all grades:', err);
      setSyncStatus('error');
    }
  };

  // Zero-delay Score Input Handler
  const handleScoreChange = (
    studentId: string,
    field: keyof StudentGrade,
    value: string
  ) => {
    let numVal: number | null = null;
    if (value.trim() !== '') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        numVal = Math.min(100, Math.max(0, parsed));
      }
    }

    const currentRecord = localGrades[studentId];
    const updated: StudentGrade = {
      id: currentRecord ? currentRecord.id : `grd_${Date.now()}_${studentId}`,
      studentId,
      classId: currentClass.id,
      catatan: currentRecord ? currentRecord.catatan : '',
      formatif1: currentRecord?.formatif1 ?? null,
      formatif2: currentRecord?.formatif2 ?? null,
      formatif3: currentRecord?.formatif3 ?? null,
      formatif4: currentRecord?.formatif4 ?? null,
      formatif5: currentRecord?.formatif5 ?? null,
      formatif6: currentRecord?.formatif6 ?? null,
      formatif7: currentRecord?.formatif7 ?? null,
      formatif8: currentRecord?.formatif8 ?? null,
      formatif9: currentRecord?.formatif9 ?? null,
      formatif10: currentRecord?.formatif10 ?? null,
      sumatifTengah: currentRecord?.sumatifTengah ?? null,
      sumatifAkhir: currentRecord?.sumatifAkhir ?? null,
      [field]: numVal,
    };

    // 1. Instant local state update
    setLocalGrades((prev) => ({ ...prev, [studentId]: updated }));

    // 2. Debounced sync to cloud
    scheduleCloudSync(updated);
  };

  const handleNoteChange = (studentId: string, note: string) => {
    const currentRecord = localGrades[studentId];
    const updated: StudentGrade = {
      id: currentRecord ? currentRecord.id : `grd_${Date.now()}_${studentId}`,
      studentId,
      classId: currentClass.id,
      catatan: note,
      formatif1: currentRecord?.formatif1 ?? null,
      formatif2: currentRecord?.formatif2 ?? null,
      formatif3: currentRecord?.formatif3 ?? null,
      formatif4: currentRecord?.formatif4 ?? null,
      formatif5: currentRecord?.formatif5 ?? null,
      formatif6: currentRecord?.formatif6 ?? null,
      formatif7: currentRecord?.formatif7 ?? null,
      formatif8: currentRecord?.formatif8 ?? null,
      formatif9: currentRecord?.formatif9 ?? null,
      formatif10: currentRecord?.formatif10 ?? null,
      sumatifTengah: currentRecord?.sumatifTengah ?? null,
      sumatifAkhir: currentRecord?.sumatifAkhir ?? null,
    };

    setLocalGrades((prev) => ({ ...prev, [studentId]: updated }));
    scheduleCloudSync(updated);
  };

  const calculateFinalScore = (grade?: StudentGrade) => {
    if (!grade) {
      return {
        finalScore: 0,
        sumInputted: 0,
        countInputted: 0,
        formatifAvg: 0,
        predicate: '-',
        isPassed: false,
        hasAnyScore: false,
      };
    }

    const formatifScores: number[] = [];
    for (let i = 1; i <= activeColumnsCount; i++) {
      const val = (grade as any)[`formatif${i}`];
      if (val !== null && val !== undefined && (val as any) !== '' && !isNaN(Number(val))) {
        formatifScores.push(Number(val));
      }
    }

    const sts =
      grade.sumatifTengah !== null &&
      grade.sumatifTengah !== undefined &&
      (grade.sumatifTengah as any) !== '' &&
      !isNaN(Number(grade.sumatifTengah))
        ? Number(grade.sumatifTengah)
        : null;

    const sas =
      grade.sumatifAkhir !== null &&
      grade.sumatifAkhir !== undefined &&
      (grade.sumatifAkhir as any) !== '' &&
      !isNaN(Number(grade.sumatifAkhir))
        ? Number(grade.sumatifAkhir)
        : null;

    // HANYA hitung nilai yang sudah diinput saja kedalam total sum (bukan yang kosong)
    let sumInputted = 0;
    let countInputted = 0;

    formatifScores.forEach((v) => {
      sumInputted += v;
      countInputted++;
    });

    if (sts !== null) {
      sumInputted += sts;
      countInputted++;
    }

    if (sas !== null) {
      sumInputted += sas;
      countInputted++;
    }

    if (countInputted === 0) {
      return {
        finalScore: 0,
        sumInputted: 0,
        countInputted: 0,
        formatifAvg: 0,
        predicate: '-',
        isPassed: false,
        hasAnyScore: false,
      };
    }

    // Rata-rata formatif hanya dari kolom TP yang terisi
    const formatifAvg =
      formatifScores.length > 0
        ? formatifScores.reduce((a, b) => a + b, 0) / formatifScores.length
        : null;

    // Hitung bobot proporsional HANYA untuk komponen yang sudah diinput (bukan semuanya termasuk yang kosong)
    let totalWeightedScore = 0;
    let totalWeight = 0;

    if (formatifAvg !== null) {
      totalWeightedScore += formatifAvg * 0.5;
      totalWeight += 0.5;
    }
    if (sts !== null) {
      totalWeightedScore += sts * 0.25;
      totalWeight += 0.25;
    }
    if (sas !== null) {
      totalWeightedScore += sas * 0.25;
      totalWeight += 0.25;
    }

    const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    let predicate = 'D';
    if (finalScore >= 90) predicate = 'A';
    else if (finalScore >= 80) predicate = 'B';
    else if (finalScore >= currentClass.kkm) predicate = 'C';

    const isPassed = finalScore >= currentClass.kkm;
    return {
      finalScore,
      sumInputted,
      countInputted,
      formatifAvg: formatifAvg !== null ? Math.round(formatifAvg) : 0,
      predicate,
      isPassed,
      hasAnyScore: true,
    };
  };

  const handleSaveColumns = () => {
    onSaveGradeColumns(editingColumns);
    setIsColumnEditorOpen(false);
  };

  const handleOpenShare = async () => {
    const shareId = `grade_share_${currentClass.id}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?nilai_share=${shareId}`;
    setShareLink(fullUrl);

    try {
      const qr = await QRCode.toDataURL(fullUrl, { width: 300, margin: 2 });
      setShareQrUrl(qr);

      const record: PublicShareRecord = {
        id: shareId,
        type: 'nilai',
        classId: currentClass.id,
        title: `Rekapitulasi Nilai Siswa Kelas ${currentClass.namaKelas} - ${currentClass.mataPelajaran}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          className: currentClass.namaKelas,
          subject: currentClass.mataPelajaran,
          teacherName: teacher.namaGuru,
          kkm: currentClass.kkm,
          grades: Object.values(localGrades),
          gradeColumns,
          students: classStudents,
        },
      };

      await createOrUpdatePublicShare(record);
      setShareModalOpen(true);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat tautan publik.');
    }
  };

  // Process raw Excel rows for Grades
  const processRawGradeRows = (rawData: any[][]) => {
    if (!rawData || rawData.length === 0) return;

    let headerRowIdx = -1;
    let colMap: Record<string, number> = { nisn: -1, nama: -1, sts: -1, sas: -1, catatan: -1 };
    for (let f = 1; f <= 10; f++) colMap[`tp${f}`] = -1;

    for (let i = 0; i < Math.min(6, rawData.length); i++) {
      const row = rawData[i].map((c) => String(c || '').toLowerCase().trim());
      const namaIdx = row.findIndex((c) => c.includes('nama') || c.includes('siswa'));
      if (namaIdx !== -1) {
        headerRowIdx = i;
        colMap.nama = namaIdx;
        colMap.nisn = row.findIndex((c) => c.includes('nisn') || c.includes('nis'));
        colMap.sts = row.findIndex((c) => c.includes('sts') || c.includes('uts') || c.includes('tengah'));
        colMap.sas = row.findIndex((c) => c.includes('sas') || c.includes('pas') || c.includes('uas') || c.includes('akhir'));
        colMap.catatan = row.findIndex((c) => c.includes('catatan') || c.includes('keterangan'));

        // map TP columns
        for (let f = 1; f <= 10; f++) {
          colMap[`tp${f}`] = row.findIndex(
            (c) =>
              c === `tp ${f}` ||
              c === `tp${f}` ||
              c.includes(`tp ${f}`) ||
              c.includes(`formatif ${f}`) ||
              c.includes(`f${f}`)
          );
        }
        break;
      }
    }

    const dataRows = headerRowIdx !== -1 ? rawData.slice(headerRowIdx + 1) : rawData;
    const existingGradesByStudentId = new Map(
      Object.values(localGrades).map((g) => [g.studentId, g])
    );

    const previews: GradePreviewRow[] = [];
    const seenStudentIds = new Set<string>();

    dataRows.forEach((row, idx) => {
      if (!row || row.length === 0 || row.every((c) => !c || String(c).trim() === '')) return;

      let nisn = '';
      let nama = '';
      let sts: number | null = null;
      let sas: number | null = null;
      let catatan = '';
      const scores: Record<string, number | null> = {};

      if (headerRowIdx !== -1 && colMap.nama !== -1) {
        nama = String(row[colMap.nama] || '').trim();
        nisn = colMap.nisn !== -1 ? String(row[colMap.nisn] || '').trim() : '';
        catatan = colMap.catatan !== -1 ? String(row[colMap.catatan] || '').trim() : '';

        const parseNum = (v: any) => {
          if (v === undefined || v === null || String(v).trim() === '') return null;
          const n = parseFloat(String(v));
          return isNaN(n) ? null : Math.min(100, Math.max(0, n));
        };

        if (colMap.sts !== -1) sts = parseNum(row[colMap.sts]);
        if (colMap.sas !== -1) sas = parseNum(row[colMap.sas]);

        for (let f = 1; f <= 10; f++) {
          if (colMap[`tp${f}`] !== -1) {
            scores[`formatif${f}`] = parseNum(row[colMap[`tp${f}`]]);
          } else {
            scores[`formatif${f}`] = null;
          }
        }
      } else {
        // Fallback positional
        nisn = String(row[0] || '').trim();
        nama = String(row[1] || '').trim();
      }

      if (nama.toLowerCase() === 'nama' || nama.toLowerCase() === 'nama siswa') return;

      scores.sumatifTengah = sts;
      scores.sumatifAkhir = sas;

      // Find student in current class
      const matchedStudent = classStudents.find(
        (s) =>
          (nisn && s.nisn && s.nisn === nisn) ||
          s.nama.toLowerCase().trim() === nama.toLowerCase().trim()
      );

      let status: 'valid' | 'duplicate' | 'not_found' | 'invalid' = 'valid';
      let reason = '';

      if (!matchedStudent) {
        status = 'not_found';
        reason = `Siswa "${nama}" tidak ditemukan di daftar kelas ${currentClass.namaKelas}`;
      } else if (seenStudentIds.has(matchedStudent.id)) {
        status = 'duplicate';
        reason = `Data siswa "${matchedStudent.nama}" muncul ganda dalam file Excel ini (dilewati)`;
      } else if (existingGradesByStudentId.has(matchedStudent.id)) {
        if (overwriteMode === 'skip') {
          status = 'duplicate';
          reason = `Nilai siswa "${matchedStudent.nama}" sudah ada di database (mode: lewati aktif)`;
        } else {
          status = 'valid';
          reason = `Akan memperbarui nilai yang sudah ada`;
        }
      }

      if (matchedStudent && status === 'valid') {
        seenStudentIds.add(matchedStudent.id);
      }

      previews.push({
        rowNum: idx + 1,
        nisn: matchedStudent?.nisn || nisn,
        nama: matchedStudent?.nama || nama,
        studentId: matchedStudent?.id,
        scores,
        catatan,
        status,
        reason,
      });
    });

    setParsedGradeRows(previews);
  };

  const handleFileDrop = (file: File) => {
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        processRawGradeRows(jsonData);
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitGradeImport = async () => {
    const validRows = parsedGradeRows.filter((r) => r.status === 'valid' && r.studentId);
    if (validRows.length === 0) {
      alert('Tidak ada data nilai valid yang dapat disimpan.');
      return;
    }

    setSyncStatus('saving');
    const newGradesMap = { ...localGrades };

    for (const r of validRows) {
      const studentId = r.studentId!;
      const existing = localGrades[studentId];
      const updated: StudentGrade = {
        id: existing ? existing.id : `grd_imp_${Date.now()}_${studentId}`,
        studentId,
        classId: currentClass.id,
        catatan: r.catatan || existing?.catatan || '',
        formatif1: r.scores.formatif1 ?? existing?.formatif1 ?? null,
        formatif2: r.scores.formatif2 ?? existing?.formatif2 ?? null,
        formatif3: r.scores.formatif3 ?? existing?.formatif3 ?? null,
        formatif4: r.scores.formatif4 ?? existing?.formatif4 ?? null,
        formatif5: r.scores.formatif5 ?? existing?.formatif5 ?? null,
        formatif6: r.scores.formatif6 ?? existing?.formatif6 ?? null,
        formatif7: r.scores.formatif7 ?? existing?.formatif7 ?? null,
        formatif8: r.scores.formatif8 ?? existing?.formatif8 ?? null,
        formatif9: r.scores.formatif9 ?? existing?.formatif9 ?? null,
        formatif10: r.scores.formatif10 ?? existing?.formatif10 ?? null,
        sumatifTengah: r.scores.sumatifTengah ?? existing?.sumatifTengah ?? null,
        sumatifAkhir: r.scores.sumatifAkhir ?? existing?.sumatifAkhir ?? null,
      };

      newGradesMap[studentId] = updated;
      await onSaveGrade(updated);
    }

    setLocalGrades(newGradesMap);
    setSyncStatus('saved');
    setIsImportOpen(false);
    setParsedGradeRows([]);
    setImportFileName('');
    alert(`Berhasil mengimpor dan memperbarui nilai ${validRows.length} siswa ke cloud!`);
  };

  // Metrics calculation - HANYA siswa yang sudah memiliki nilai terinput
  const studentsWithScores = useMemo(() => {
    return classStudents.filter((s) => calculateFinalScore(localGrades[s.id]).hasAnyScore);
  }, [classStudents, localGrades, activeColumnsCount]);

  const averageClassScore = useMemo(() => {
    const validScores = studentsWithScores.map((s) => calculateFinalScore(localGrades[s.id]).finalScore);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }, [studentsWithScores, localGrades, activeColumnsCount]);

  const passedCount = useMemo(() => {
    return studentsWithScores.filter((s) => calculateFinalScore(localGrades[s.id]).isPassed).length;
  }, [studentsWithScores, localGrades, activeColumnsCount, currentClass.kkm]);

  const passedPercentage = studentsWithScores.length > 0
    ? Math.round((passedCount / studentsWithScores.length) * 100)
    : 0;

  // Rekap Total Sum & Rata-rata per Kolom: HANYA nilai yang terinput saja (bukan yang kosong)
  const columnSummary = useMemo(() => {
    const tpSummaries: { sum: number; count: number; avg: number | string }[] = [];
    for (let c = 1; c <= activeColumnsCount; c++) {
      const fieldKey = `formatif${c}` as keyof StudentGrade;
      let sum = 0;
      let count = 0;
      classStudents.forEach((std) => {
        const val = localGrades[std.id]?.[fieldKey];
        if (val !== null && val !== undefined && (val as any) !== '' && !isNaN(Number(val))) {
          sum += Number(val);
          count++;
        }
      });
      tpSummaries.push({
        sum,
        count,
        avg: count > 0 ? Math.round(sum / count) : '-',
      });
    }

    let stsSum = 0;
    let stsCount = 0;
    let sasSum = 0;
    let sasCount = 0;
    let totalAllSum = 0;

    classStudents.forEach((std) => {
      const g = localGrades[std.id];
      const res = calculateFinalScore(g);
      totalAllSum += res.sumInputted;

      const sts = g?.sumatifTengah;
      if (sts !== null && sts !== undefined && (sts as any) !== '' && !isNaN(Number(sts))) {
        stsSum += Number(sts);
        stsCount++;
      }
      const sas = g?.sumatifAkhir;
      if (sas !== null && sas !== undefined && (sas as any) !== '' && !isNaN(Number(sas))) {
        sasSum += Number(sas);
        sasCount++;
      }
    });

    return {
      tpSummaries,
      sts: { sum: stsSum, count: stsCount, avg: stsCount > 0 ? Math.round(stsSum / stsCount) : '-' },
      sas: { sum: sasSum, count: sasCount, avg: sasCount > 0 ? Math.round(sasSum / sasCount) : '-' },
      totalAllSum,
    };
  }, [classStudents, localGrades, activeColumnsCount]);

  const filteredStudents = classStudents.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                {currentClass.namaKelas}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">KKM: {currentClass.kkm}</span>
              <span className="text-xs text-slate-400">&bull;</span>

              {/* Realtime Save Status Indicator */}
              <div className="flex items-center gap-1.5 ml-2">
                {syncStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tersimpan di Cloud
                  </span>
                )}
                {syncStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    Menyimpan ke Cloud...
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Gagal menyimpan
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Buku Penilaian Siswa (Kurikulum Merdeka)
            </h2>
            <p className="text-xs text-slate-500">
              Pengisian nilai instan tanpa jeda &bull; Otomatis tersinkronisasi aman ke database Supabase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Simpan Nilai ke Cloud (Selalu tampil & jelas) */}
            <button
              type="button"
              onClick={handleSaveAllNow}
              disabled={syncStatus === 'saving'}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
                Object.keys(pendingSaves).length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              } disabled:opacity-50`}
              title="Simpan seluruh nilai peserta didik ke database cloud Supabase secara real-time"
            >
              {syncStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Simpan Nilai ke Cloud</span>
                  {Object.keys(pendingSaves).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold">
                      {Object.keys(pendingSaves).length}
                    </span>
                  )}
                </>
              )}
            </button>

            <button
              onClick={() => {
                setEditingColumns([...gradeColumns]);
                setIsColumnEditorOpen(true);
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4" />
              Atur Kolom TP
            </button>

            {/* Import Excel Button for Grades */}
            <button
              onClick={() => {
                setParsedGradeRows([]);
                setImportFileName('');
                setImportRawText('');
                setIsImportOpen(true);
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              Impor Excel
            </button>

            {/* Export Excel Button for Grades */}
            <button
              onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Excel
            </button>

            <button
              onClick={handleOpenShare}
              className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Link Publik
            </button>
          </div>
        </div>

        {/* Quick Config & Metrics Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Tampilkan Kolom Formatif:</span>
            {[3, 5, 8, 10].map((num) => (
              <button
                key={num}
                onClick={() => setActiveColumnsCount(num)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  activeColumnsCount === num
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num} TP
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Rata-rata Kelas:</span>
              <span className="font-mono font-black text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded-lg" title="Rata-rata dihitung hanya dari nilai yang sudah diinput">
                {averageClassScore || '-'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Ketuntasan KKM:</span>
              <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg" title="Ketuntasan dihitung hanya dari siswa yang sudah memiliki nilai">
                {passedCount} / {studentsWithScores.length} Siswa Terinput ({passedPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau NISN siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-xs"
          />
        </div>
        <p className="text-xs text-slate-500">
          Menampilkan {filteredStudents.length} dari {classStudents.length} siswa ({studentsWithScores.length} memiliki nilai)
        </p>
      </div>

      {/* Grades Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10 sticky left-0 bg-slate-50 z-10 border-r">No</th>
                <th className="py-3 px-3 min-w-[180px] sticky left-10 bg-slate-50 z-10 border-r">Nama Siswa</th>
                
                {/* Formatif TP Columns */}
                {gradeColumns.slice(0, activeColumnsCount).map((col, idx) => (
                  <th key={col.id} className="py-2 px-1 text-center w-16 border-r font-medium text-[11px]">
                    <div className="font-bold text-slate-800">TP {idx + 1}</div>
                    <div className="text-[9px] text-slate-400 truncate max-w-[60px]" title={col.label}>
                      {col.label}
                    </div>
                  </th>
                ))}

                <th className="py-3 px-2 text-center w-16 bg-amber-50/50 text-amber-900 border-r">STS</th>
                <th className="py-3 px-2 text-center w-16 bg-blue-50/50 text-blue-900 border-r">SAS</th>
                <th className="py-3 px-2 text-center w-16 bg-emerald-50/70 text-emerald-950 border-r font-bold" title="Hanya nilai yang sudah diinput saja yang dihitung kedalam total sum">Total Sum</th>
                <th className="py-3 px-2 text-center w-16 bg-indigo-50/60 text-indigo-950 border-r font-bold">Nilai Akhir</th>
                <th className="py-3 px-2 text-center w-12 bg-indigo-50/60 text-indigo-950 border-r font-bold">Predikat</th>
                <th className="py-3 px-3 min-w-[200px]">Catatan Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7 + activeColumnsCount} className="py-12 text-center text-slate-400">
                    <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada siswa di kelas ini atau tidak cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const grade = localGrades[student.id];
                  const { finalScore, predicate, isPassed, sumInputted, countInputted, hasAnyScore } = calculateFinalScore(grade);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50 border-r">
                        {student.no}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 sticky left-10 bg-white group-hover:bg-slate-50 border-r">
                        <div className="truncate max-w-[170px]" title={student.nama}>
                          {student.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.nisn || '-'}</div>
                      </td>

                      {/* TP Inputs - Zero Delay */}
                      {Array.from({ length: activeColumnsCount }).map((_, colIdx) => {
                        const fieldKey = `formatif${colIdx + 1}` as keyof StudentGrade;
                        const scoreVal = grade ? (grade as any)[fieldKey] : null;

                        return (
                          <td key={colIdx} className="py-1 px-1 border-r text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={scoreVal !== null && scoreVal !== undefined ? scoreVal : ''}
                              onChange={(e) => handleScoreChange(student.id, fieldKey, e.target.value)}
                              onBlur={handleSaveAllNow}
                              className={`w-14 text-center py-1.5 rounded-lg border font-mono text-xs transition ${
                                scoreVal !== null && scoreVal < currentClass.kkm
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                                  : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                              }`}
                              placeholder="-"
                            />
                          </td>
                        );
                      })}

                      {/* STS Input */}
                      <td className="py-1 px-1 border-r text-center bg-amber-50/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={grade?.sumatifTengah !== null && grade?.sumatifTengah !== undefined ? grade.sumatifTengah : ''}
                          onChange={(e) => handleScoreChange(student.id, 'sumatifTengah', e.target.value)}
                          onBlur={handleSaveAllNow}
                          className="w-14 text-center py-1.5 rounded-lg border border-amber-200 focus:border-amber-500 font-mono text-xs"
                          placeholder="-"
                        />
                      </td>

                      {/* SAS Input */}
                      <td className="py-1 px-1 border-r text-center bg-blue-50/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={grade?.sumatifAkhir !== null && grade?.sumatifAkhir !== undefined ? grade.sumatifAkhir : ''}
                          onChange={(e) => handleScoreChange(student.id, 'sumatifAkhir', e.target.value)}
                          onBlur={handleSaveAllNow}
                          className="w-14 text-center py-1.5 rounded-lg border border-blue-200 focus:border-blue-500 font-mono text-xs"
                          placeholder="-"
                        />
                      </td>

                      {/* Total Sum (Hanya nilai terinput) */}
                      <td className="py-2 px-2 text-center border-r font-mono font-bold text-xs bg-emerald-50/30 text-emerald-800">
                        {hasAnyScore ? (
                          <span title={`Total dari ${countInputted} nilai yang sudah diinput (kosong diabaikan)`}>
                            {sumInputted}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Final Score */}
                      <td className="py-2 px-2 text-center border-r font-mono font-black text-sm bg-indigo-50/30">
                        {hasAnyScore ? (
                          <span className={isPassed ? 'text-indigo-900' : 'text-rose-600'}>
                            {finalScore}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Predicate */}
                      <td className="py-2 px-2 text-center border-r">
                        {hasAnyScore ? (
                          <span
                            className={`inline-block w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center mx-auto ${
                              predicate === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : predicate === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : predicate === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {predicate}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Catatan Input */}
                      <td className="py-1 px-3">
                        <input
                          type="text"
                          value={grade?.catatan || ''}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          onBlur={handleSaveAllNow}
                          placeholder="Deskripsi pencapaian kompetensi..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* TFOOT: Total Sum & Rata-rata HANYA nilai yang sudah diinput */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-50/95 font-mono text-[11px]">
              {/* Row 1: Total Sum per Kolom */}
              <tr className="border-b border-slate-200">
                <td colSpan={2} className="py-2.5 px-3 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-r text-right uppercase tracking-wider text-[10px]">
                  Total Sum (Hanya Terinput):
                </td>
                {columnSummary.tpSummaries.map((tp, idx) => (
                  <td key={idx} className="py-2 px-1 text-center font-bold text-slate-800 border-r" title={`${tp.count} nilai terisi (kosong diabaikan)`}>
                    {tp.sum > 0 ? tp.sum : '-'}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold text-amber-900 border-r bg-amber-50/40" title={`${columnSummary.sts.count} nilai terisi`}>
                  {columnSummary.sts.sum > 0 ? columnSummary.sts.sum : '-'}
                </td>
                <td className="py-2 px-2 text-center font-bold text-blue-900 border-r bg-blue-50/40" title={`${columnSummary.sas.count} nilai terisi`}>
                  {columnSummary.sas.sum > 0 ? columnSummary.sas.sum : '-'}
                </td>
                <td className="py-2 px-2 text-center font-black text-emerald-800 border-r bg-emerald-50/60" title="Akumulasi seluruh nilai terinput">
                  {columnSummary.totalAllSum > 0 ? columnSummary.totalAllSum : '-'}
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-400 border-r bg-indigo-50/20">-</td>
                <td className="py-2 px-2 text-center font-bold text-slate-400 border-r">-</td>
                <td className="py-2 px-3 text-slate-400 italic text-[10px] font-sans">
                  *Nilai kosong diabaikan dari perhitungan total sum
                </td>
              </tr>
              {/* Row 2: Rata-rata per Kolom */}
              <tr>
                <td colSpan={2} className="py-2.5 px-3 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-r text-right uppercase tracking-wider text-[10px]">
                  Rata-rata (Hanya Terinput):
                </td>
                {columnSummary.tpSummaries.map((tp, idx) => (
                  <td key={idx} className="py-2 px-1 text-center font-bold text-slate-800 border-r" title={`Rata-rata dari ${tp.count} nilai terisi`}>
                    {tp.avg}
                  </td>
                ))}
                <td className="py-2 px-2 text-center font-bold text-amber-900 border-r bg-amber-50/40" title={`Rata-rata dari ${columnSummary.sts.count} nilai terisi`}>
                  {columnSummary.sts.avg}
                </td>
                <td className="py-2 px-2 text-center font-bold text-blue-900 border-r bg-blue-50/40" title={`Rata-rata dari ${columnSummary.sas.count} nilai terisi`}>
                  {columnSummary.sas.avg}
                </td>
                <td className="py-2 px-2 text-center font-bold text-emerald-800 border-r bg-emerald-50/60">-</td>
                <td className="py-2 px-2 text-center font-black text-indigo-900 border-r bg-indigo-50/60" title="Rata-rata nilai akhir siswa">
                  {averageClassScore || '-'}
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-600 border-r text-[10px]">
                  KKM {currentClass.kkm}
                </td>
                <td className="py-2 px-3 text-slate-500 text-[10px] font-sans">
                  {passedCount} dari {studentsWithScores.length} siswa tuntas KKM
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Table Footer with Prominent Save Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {syncStatus === 'saved'
                  ? 'Semua nilai siswa tersimpan aman di database Cloud PostgreSQL Supabase.'
                  : syncStatus === 'saving'
                  ? 'Sedang menyimpan ke cloud...'
                  : syncStatus === 'error'
                  ? 'Gagal menyimpan, silakan coba lagi.'
                  : 'Klik tombol simpan untuk memastikan seluruh data nilai tersimpan ke cloud.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveAllNow}
              disabled={syncStatus === 'saving'}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {syncStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Semua Nilai ke Cloud</span>
                  {Object.keys(pendingSaves).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold">
                      {Object.keys(pendingSaves).length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Impor Excel Nilai dengan Validasi & Anti-Duplikasi */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Impor Nilai Siswa dari Excel
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Kelas: {currentClass.namaKelas} &bull; Mapel: {currentClass.mataPelajaran} &bull; KKM: {currentClass.kkm}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              {/* Options & Template Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Mode Penanganan Data Ganda:
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="overwriteMode"
                        checked={overwriteMode === 'skip'}
                        onChange={() => setOverwriteMode('skip')}
                        className="text-indigo-600"
                      />
                      <span>Data sudah ada &ndash; <strong>Lewati</strong></span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="overwriteMode"
                        checked={overwriteMode === 'update'}
                        onChange={() => setOverwriteMode('update')}
                        className="text-indigo-600"
                      />
                      <span>Update data nilai yang ada</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadGradesTemplateExcel(currentClass, classStudents, gradeColumns, teacher)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Unduh Template Nilai Excel
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileDrop(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileDrop(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {importFileName ? importFileName : 'Klik atau seret file Excel Nilai (.xlsx, .xls, .csv) ke sini'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung kolom TP 1..10, STS, SAS, dan Catatan Siswa
                </p>
              </div>

              {/* Parsed Summary Cards */}
              {parsedGradeRows.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Baris</span>
                      <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">
                        {parsedGradeRows.length}
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Siap Diimpor</span>
                      <span className="text-xl font-black font-mono text-emerald-800 block mt-0.5">
                        {parsedGradeRows.filter((r) => r.status === 'valid').length} siswa
                      </span>
                    </div>

                    <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Duplikat Dilewati</span>
                      <span className="text-xl font-black font-mono text-amber-800 block mt-0.5">
                        {parsedGradeRows.filter((r) => r.status === 'duplicate').length} baris
                      </span>
                    </div>

                    <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Tidak Ditemukan</span>
                      <span className="text-xl font-black font-mono text-rose-800 block mt-0.5">
                        {parsedGradeRows.filter((r) => r.status === 'not_found' || r.status === 'invalid').length} baris
                      </span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700">
                        Pratinjau Nilai Siswa
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {parsedGradeRows.filter((r) => r.status === 'valid').length} baris valid
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                            <th className="p-2.5 text-center w-10">No</th>
                            <th className="p-2.5 w-24">Status</th>
                            <th className="p-2.5 w-28">NISN</th>
                            <th className="p-2.5 min-w-[150px]">Nama Siswa</th>
                            <th className="p-2.5 text-center w-14">STS</th>
                            <th className="p-2.5 text-center w-14">SAS</th>
                            <th className="p-2.5">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedGradeRows.map((r) => (
                            <tr
                              key={r.rowNum}
                              className={
                                r.status === 'valid'
                                  ? 'hover:bg-emerald-50/40'
                                  : r.status === 'duplicate'
                                  ? 'bg-amber-50/50 hover:bg-amber-50 text-amber-900'
                                  : 'bg-rose-50/50 hover:bg-rose-50 text-rose-900'
                              }
                            >
                              <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{r.rowNum}</td>
                              <td className="p-2.5">
                                {r.status === 'valid' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" /> Valid
                                  </span>
                                )}
                                {r.status === 'duplicate' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3" /> Dilewati
                                  </span>
                                )}
                                {(r.status === 'not_found' || r.status === 'invalid') && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <X className="w-3 h-3" /> Ditolak
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono">{r.nisn || '-'}</td>
                              <td className="p-2.5 font-bold">{r.nama}</td>
                              <td className="p-2.5 text-center font-mono">{r.scores.sumatifTengah ?? '-'}</td>
                              <td className="p-2.5 text-center font-mono">{r.scores.sumatifAkhir ?? '-'}</td>
                              <td className="p-2.5 text-[11px] text-slate-500">
                                {r.reason || 'Siap diimpor'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {parsedGradeRows.filter((r) => r.status === 'valid').length > 0
                  ? `${parsedGradeRows.filter((r) => r.status === 'valid').length} nilai siswa siap diterapkan`
                  : 'Unggah berkas untuk memvalidasi nilai'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={parsedGradeRows.filter((r) => r.status === 'valid').length === 0}
                  onClick={handleCommitGradeImport}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    parsedGradeRows.filter((r) => r.status === 'valid').length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Terapkan Nilai ke Cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Custom Kolom TP */}
      {isColumnEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Atur Label Tujuan Pembelajaran (TP)</h3>
              </div>
              <button
                onClick={() => setIsColumnEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {editingColumns.slice(0, activeColumnsCount).map((col, idx) => (
                <div key={col.id} className="flex items-center gap-2">
                  <span className="w-14 font-mono font-bold text-xs text-slate-500">TP {idx + 1}</span>
                  <input
                    type="text"
                    value={col.label}
                    onChange={(e) => {
                      const updated = [...editingColumns];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setEditingColumns(updated);
                    }}
                    placeholder={`Nama materi TP ${idx + 1}...`}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsColumnEditorOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveColumns}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                Simpan Konfigurasi ke Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Share Publik */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Share2 className="w-6 h-6" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-200 mb-2">
                <span>🔒 Mode Publik (Read-Only Terisolasi)</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Tautan Publik Nilai Aktif</h3>
              <p className="text-xs text-slate-500 mt-1">
                Siswa dan orang tua dapat membuka tautan ini tanpa login untuk melihat transparansi buku nilai secara aman dan read-only.
              </p>
            </div>

            {shareQrUrl && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
                <img src={shareQrUrl} alt="QR Code Link Publik" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl text-xs">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="bg-transparent flex-1 font-mono text-slate-700 truncate px-2 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1.5 bg-white rounded-xl shadow-xs text-indigo-600 font-bold hover:bg-indigo-50 transition shrink-0 cursor-pointer"
              >
                {copiedLink ? 'Tersalin!' : 'Salin'}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Halaman Preview Publik (Tab Baru)
              </a>

              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
