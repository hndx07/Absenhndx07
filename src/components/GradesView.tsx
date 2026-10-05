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
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  Printer,
  Eye,
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
import { SCHOOL_CONFIG } from '../config/schoolConfig';
import { exportGradesToExcel, downloadGradesTemplateExcel } from '../utils/exportUtils';
import { createOrUpdatePublicShare } from '../services/data';
import { getKurikulumMerdekaAssessment } from '../utils/gradeCalculations';
import { SmoothHorizontalScroller } from './SmoothHorizontalScroller';
import { OfficialLetterhead } from './OfficialLetterhead';

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
  const [sortOrder, setSortOrder] = useState<'no' | 'name-asc' | 'name-desc'>('name-asc');
  const [activeColumnsCount, setActiveColumnsCount] = useState<number>(5);
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
  const [editingColumns, setEditingColumns] = useState<GradeColumn[]>(gradeColumns);

  // Local State for Instant UI (Zero-Delay Input)
  const [localGrades, setLocalGrades] = useState<Record<string, StudentGrade>>({});
  // Raw string inputs map to prevent cursor jumps and dropped keystrokes
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pendingSaves, setPendingSaves] = useState<Record<string, StudentGrade>>({});
  const debounceTimerRef = useRef<any>(null);
  const prevClassIdRef = useRef<string>(currentClass.id);

  // Share state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Dokumen Siap Cetak State
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [importFileName, setImportFileName] = useState('');
  const [importRawText, setImportRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedGradeRows, setParsedGradeRows] = useState<GradePreviewRow[]>([]);
  const [rawGradeData, setRawGradeData] = useState<any[][] | null>(null);
  const [overwriteMode, setOverwriteMode] = useState<'skip' | 'update'>('update');
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.classId === currentClass.id)
      .sort((a, b) => a.no - b.no);
  }, [students, currentClass.id]);

  // Sync prop grades into local state ONLY when switching classes or on initial mount
  useEffect(() => {
    const isClassChanged = prevClassIdRef.current !== currentClass.id;
    if (isClassChanged || Object.keys(localGrades).length === 0) {
      prevClassIdRef.current = currentClass.id;
      const map: Record<string, StudentGrade> = {};
      grades
        .filter((g) => g.classId === currentClass.id)
        .forEach((g) => {
          map[g.studentId] = g;
        });
      setLocalGrades(map);
      setRawInputs({});
      setPendingSaves({});
      setSyncStatus('saved');
    }
  }, [grades, currentClass.id]);

  useEffect(() => {
    setEditingColumns(gradeColumns);
  }, [gradeColumns]);

  // Debounced cloud synchronization (saves only modified record without mass network spam)
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
    }, 700);
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
      alert(`Berhasil menyimpan seluruh nilai murid kelas ${currentClass.namaKelas} ke cloud database Supabase!`);
    } catch (err) {
      console.error('Error saving all grades:', err);
      setSyncStatus('error');
      alert('Gagal menyimpan nilai ke cloud. Silakan periksa koneksi internet Anda dan coba lagi.');
    }
  };

  // Single student immediate save on blur (fast, no 36-student request flood)
  const handleSingleStudentSave = (studentId: string) => {
    const record = localGrades[studentId];
    if (record) {
      onSaveGrade(record);
    }
  };

  // Zero-delay Score Input Handler with raw text caching
  const handleScoreChange = (
    studentId: string,
    field: keyof StudentGrade,
    valueStr: string
  ) => {
    const cellKey = `${studentId}_${field}`;
    // 1. Instant raw text state so user typing is 100% fluid without cursor jumping
    setRawInputs((prev) => ({ ...prev, [cellKey]: valueStr }));

    let numVal: number | null = null;
    if (valueStr.trim() !== '') {
      const parsed = parseFloat(valueStr);
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

    // 2. Instant local score state update
    setLocalGrades((prev) => ({ ...prev, [studentId]: updated }));

    // 3. Debounced cloud sync
    scheduleCloudSync(updated);
  };

  // On blur of a cell, clear raw input and save that row immediately
  const handleScoreBlur = (studentId: string, field: keyof StudentGrade) => {
    const cellKey = `${studentId}_${field}`;
    setRawInputs((prev) => {
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });
    handleSingleStudentSave(studentId);
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

  const calculateFinalScore = (grade?: StudentGrade, studentName?: string) => {
    if (!grade) {
      const assessment = getKurikulumMerdekaAssessment(null, currentClass.kkm, currentClass.mataPelajaran, studentName);
      return {
        finalScore: 0,
        sumInputted: 0,
        countInputted: 0,
        formatifAvg: 0,
        predicate: '-' as const,
        predicateLabel: assessment.predikatLabel,
        merdekaDeskripsi: assessment.deskripsi,
        merdekaDeskripsiSingkat: assessment.deskripsiSingkat,
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
      const assessment = getKurikulumMerdekaAssessment(null, currentClass.kkm, currentClass.mataPelajaran, studentName);
      return {
        finalScore: 0,
        sumInputted: 0,
        countInputted: 0,
        formatifAvg: 0,
        predicate: '-' as const,
        predicateLabel: assessment.predikatLabel,
        merdekaDeskripsi: assessment.deskripsi,
        merdekaDeskripsiSingkat: assessment.deskripsiSingkat,
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
    const assessment = getKurikulumMerdekaAssessment(
      finalScore,
      currentClass.kkm,
      currentClass.mataPelajaran,
      studentName
    );

    return {
      finalScore,
      sumInputted,
      countInputted,
      formatifAvg: formatifAvg !== null ? Math.round(formatifAvg) : 0,
      predicate: assessment.predikat,
      predicateLabel: assessment.predikatLabel,
      merdekaDeskripsi: assessment.deskripsi,
      merdekaDeskripsiSingkat: assessment.deskripsiSingkat,
      isPassed: assessment.isTuntas,
      hasAnyScore: true,
    };
  };

  // Helper: Isi deskripsi Kurikulum Merdeka untuk 1 siswa
  const handleApplySingleMerdeka = (studentId: string, autoDesc: string) => {
    handleNoteChange(studentId, autoDesc);
    handleSingleStudentSave(studentId);
  };

  // Helper: Terapkan deskripsi Kurikulum Merdeka otomatis ke SEMUA siswa yang ada nilainya
  const handleApplyMerdekaDescriptionsAll = () => {
    const updatedMap = { ...localGrades };
    const recordsToSave: StudentGrade[] = [];

    classStudents.forEach((student) => {
      const grade = updatedMap[student.id];
      const { finalScore, merdekaDeskripsi, hasAnyScore } = calculateFinalScore(grade, student.nama);
      if (hasAnyScore && merdekaDeskripsi) {
        const updated: StudentGrade = {
          id: grade ? grade.id : `grd_${Date.now()}_${student.id}`,
          studentId: student.id,
          classId: currentClass.id,
          catatan: merdekaDeskripsi,
          formatif1: grade?.formatif1 ?? null,
          formatif2: grade?.formatif2 ?? null,
          formatif3: grade?.formatif3 ?? null,
          formatif4: grade?.formatif4 ?? null,
          formatif5: grade?.formatif5 ?? null,
          formatif6: grade?.formatif6 ?? null,
          formatif7: grade?.formatif7 ?? null,
          formatif8: grade?.formatif8 ?? null,
          formatif9: grade?.formatif9 ?? null,
          formatif10: grade?.formatif10 ?? null,
          sumatifTengah: grade?.sumatifTengah ?? null,
          sumatifAkhir: grade?.sumatifAkhir ?? null,
        };
        updatedMap[student.id] = updated;
        recordsToSave.push(updated);
      }
    });

    setLocalGrades(updatedMap);
    recordsToSave.forEach((rec) => onSaveGrade(rec));
    alert(`Deskripsi Kurikulum Merdeka berhasil diterapkan otomatis ke ${recordsToSave.length} murid!`);
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
        title: `Rekapitulasi Nilai Murid Kelas ${currentClass.namaKelas} - ${currentClass.mataPelajaran}`,
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

  const handleOverwriteModeChange = (mode: 'skip' | 'update') => {
    setOverwriteMode(mode);
    if (rawGradeData) {
      processRawGradeRows(rawGradeData, mode);
    }
  };

  // Process raw Excel rows for Grades
  const processRawGradeRows = (rawData: any[][], currentMode: 'skip' | 'update' = overwriteMode) => {
    if (!rawData || rawData.length === 0) return;

    let headerRowIdx = -1;
    let colMap: Record<string, number> = { nisn: -1, nama: -1, sts: -1, sas: -1, catatan: -1 };
    for (let f = 1; f <= 10; f++) colMap[`tp${f}`] = -1;

    const normalizeHeader = (s: any) =>
      String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[\s_\-():.]+/g, '');

    const isStudentNameHeader = (norm: string) => {
      if (
        norm.includes('daftar') ||
        norm.includes('rekap') ||
        norm.includes('buku') ||
        norm.includes('leger') ||
        norm.includes('smk') ||
        norm.includes('smp') ||
        norm.includes('kurikulum')
      ) {
        return false;
      }
      return (
        norm === 'nama' ||
        norm === 'namasiswa' ||
        norm === 'namamurid' ||
        norm === 'namapesertadidik' ||
        norm === 'namalengkap' ||
        norm === 'namalengkapmurid' ||
        norm === 'namalengkapsiswa' ||
        norm === 'siswa' ||
        norm === 'murid' ||
        norm === 'pesertadidik' ||
        norm.startsWith('nama_') ||
        norm.startsWith('namasiswa') ||
        norm.startsWith('namamurid')
      );
    };

    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;

      const namaIdx = row.findIndex((c: any) => {
        const norm = normalizeHeader(c);
        return isStudentNameHeader(norm);
      });

      if (namaIdx !== -1) {
        headerRowIdx = i;
        colMap.nama = namaIdx;

        colMap.nisn = row.findIndex((c: any) => {
          const norm = normalizeHeader(c);
          return norm.includes('nisn') || norm === 'nis' || norm.startsWith('nis');
        });

        colMap.sts = row.findIndex((c: any) => {
          const norm = normalizeHeader(c);
          return norm.includes('sts') || norm.includes('uts') || norm.includes('pts') || norm.includes('tengah');
        });

        colMap.sas = row.findIndex((c: any) => {
          const norm = normalizeHeader(c);
          return norm.includes('sas') || norm.includes('pas') || norm.includes('uas') || norm.includes('akhir');
        });

        colMap.catatan = row.findIndex((c: any) => {
          const norm = normalizeHeader(c);
          return norm.includes('catatan') || norm.includes('keterangan');
        });

        // Map TP columns from 1 to 10 with strict number boundary so TP10 is not captured by TP1
        for (let f = 1; f <= 10; f++) {
          const targetIdx = row.findIndex((c: any, colIdx: number) => {
            if (
              colIdx === colMap.nama ||
              colIdx === colMap.nisn ||
              colIdx === colMap.sts ||
              colIdx === colMap.sas ||
              colIdx === colMap.catatan
            ) {
              return false;
            }
            const norm = normalizeHeader(c);
            const regex = new RegExp(`^(?:tp|formatif|f|ph|uh)0*${f}(?:[^0-9]|$)`, 'i');
            return regex.test(norm);
          });
          if (targetIdx !== -1) {
            colMap[`tp${f}`] = targetIdx;
          }
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
      if (!row || !Array.isArray(row) || row.length === 0 || row.every((c) => !c || String(c).trim() === '')) return;

      let nisn = '';
      let nama = '';
      let sts: number | null = null;
      let sas: number | null = null;
      let catatan = '';
      const scores: Record<string, number | null> = {};

      const parseNum = (v: any) => {
        if (v === undefined || v === null || String(v).trim() === '' || String(v).trim() === '-') return null;
        const n = parseFloat(String(v).replace(',', '.'));
        return isNaN(n) ? null : Math.min(100, Math.max(0, n));
      };

      if (headerRowIdx !== -1 && colMap.nama !== -1) {
        nama = String(row[colMap.nama] || '').trim();
        nisn = colMap.nisn !== -1 ? String(row[colMap.nisn] || '').trim() : '';
        catatan = colMap.catatan !== -1 ? String(row[colMap.catatan] || '').trim() : '';

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
        const val0 = String(row[0] || '').trim();
        const val1 = String(row[1] || '').trim();
        const val2 = String(row[2] || '').trim();

        if (val0.match(/^\d{1,3}$/) && val2) {
          nisn = val1;
          nama = val2;
        } else {
          nisn = val0;
          nama = val1;
        }
      }

      if (
        !nama ||
        nama.toLowerCase() === 'nama' ||
        nama.toLowerCase() === 'nama murid' ||
        nama.toLowerCase() === 'nama siswa' ||
        nama.toLowerCase() === 'nama lengkap'
      ) {
        return;
      }

      scores.sumatifTengah = sts;
      scores.sumatifAkhir = sas;

      const cleanNisn = nisn && nisn !== '-' && nisn !== '0' ? nisn.trim() : '';
      const cleanNama = nama.toLowerCase().replace(/\s+/g, ' ').trim();
      const stripPunct = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Find student in current class with fuzzy match
      let matchedStudent = classStudents.find((s) => {
        const sNisnClean = (s.nisn || '').trim().replace(/^0+/, '');
        const cleanNisnStripped = cleanNisn.replace(/^0+/, '');
        if (cleanNisnStripped && sNisnClean && cleanNisnStripped === sNisnClean) return true;
        if (cleanNama && s.nama.toLowerCase().replace(/\s+/g, ' ').trim() === cleanNama) return true;
        if (cleanNama && stripPunct(s.nama) === stripPunct(cleanNama)) return true;
        return false;
      });

      // Secondary match by contains if name is long enough
      if (!matchedStudent && cleanNama.length >= 3) {
        matchedStudent = classStudents.find((s) => {
          const sClean = s.nama.toLowerCase().trim();
          return sClean.includes(cleanNama) || cleanNama.includes(sClean);
        });
      }

      // Tertiary match: If student sequence matches (row idx < classStudents.length)
      if (!matchedStudent && idx < classStudents.length) {
        matchedStudent = classStudents[idx];
      }

      let status: 'valid' | 'duplicate' | 'not_found' | 'invalid' = 'valid';
      let reason = '';

      if (!matchedStudent) {
        status = 'not_found';
        reason = `Murid "${nama}" tidak terdaftar di kelas ${currentClass.namaKelas}`;
      } else if (seenStudentIds.has(matchedStudent.id)) {
        status = 'duplicate';
        reason = `Data murid "${matchedStudent.nama}" muncul ganda dalam file Excel ini (baris ini dilewati)`;
      } else if (existingGradesByStudentId.has(matchedStudent.id)) {
        if (currentMode === 'skip') {
          status = 'duplicate';
          reason = `Nilai murid "${matchedStudent.nama}" sudah ada di database (mode: lewati aktif)`;
        } else {
          status = 'valid';
          reason = `Akan memperbarui nilai murid di database cloud`;
        }
      } else {
        status = 'valid';
        reason = `Nilai baru siap diunggah ke cloud`;
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
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('Berkas Excel kosong atau tidak memiliki lembar kerja.');
          return;
        }

        // Find sheet that contains data
        let chosenSheet = workbook.SheetNames[0];
        let foundData: any[][] = [];
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) as any[][];
          if (raw && raw.length > 0) {
            chosenSheet = sName;
            foundData = raw;
            break;
          }
        }

        if (foundData.length === 0) {
          alert(`Lembar kerja "${chosenSheet}" tidak memiliki data yang dapat diimpor.`);
          return;
        }

        setRawGradeData(foundData);
        processRawGradeRows(foundData, overwriteMode);
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel. Pastikan format file .xlsx atau .xls valid.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitGradeImport = async () => {
    const validRows = parsedGradeRows.filter((r) => (r.status === 'valid' || overwriteMode === 'update') && r.studentId);
    if (validRows.length === 0) {
      alert('Tidak ada data nilai murid valid yang dapat disimpan. Pastikan nama murid sesuai dengan kelas ini.');
      return;
    }

    setIsUploadingToCloud(true);
    setSyncStatus('saving');

    try {
      const newGradesMap = { ...localGrades };
      const updatedGradesList: StudentGrade[] = [];

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
        updatedGradesList.push(updated);
      }

      // Fast concurrent saves in chunks of 10
      const chunkSize = 10;
      for (let i = 0; i < updatedGradesList.length; i += chunkSize) {
        const chunk = updatedGradesList.slice(i, i + chunkSize);
        await Promise.all(chunk.map((g) => onSaveGrade(g)));
      }

      setLocalGrades(newGradesMap);
      setSyncStatus('saved');
      setIsImportOpen(false);
      setParsedGradeRows([]);
      setImportFileName('');
      setRawGradeData(null);
      alert(`Berhasil mengunggah dan menyimpan nilai ${validRows.length} murid ke cloud Supabase!`);
    } catch (err) {
      console.error('Error committing grade import to cloud:', err);
      setSyncStatus('error');
      alert('Terjadi kesalahan saat mengunggah nilai ke cloud. Silakan coba lagi.');
    } finally {
      setIsUploadingToCloud(false);
    }
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

  const filteredStudents = useMemo(() => {
    return classStudents
      .filter(
        (s) =>
          s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.nisn || '').includes(searchTerm)
      )
      .sort((a, b) => {
        if (sortOrder === 'name-asc') {
          return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
        }
        if (sortOrder === 'name-desc') {
          return b.nama.localeCompare(a.nama, 'id', { sensitivity: 'base' });
        }
        return a.no - b.no;
      });
  }, [classStudents, searchTerm, sortOrder]);

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
              Buku Penilaian Murid (Kurikulum Merdeka)
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
              title="Simpan seluruh nilai murid ke database cloud Supabase secara real-time"
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
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              Atur Kolom TP
            </button>

            {/* Auto Apply Deskripsi Kurikulum Merdeka ke Seluruh Murid */}
            <button
              type="button"
              onClick={handleApplyMerdekaDescriptionsAll}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Isi deskripsi capaian kompetensi otomatis sesuai capaian nilai Kurikulum Merdeka ke seluruh murid"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Deskripsi Merdeka Otomatis</span>
            </button>

            {/* Import Excel Button for Grades */}
            <button
              onClick={() => {
                setParsedGradeRows([]);
                setImportFileName('');
                setImportRawText('');
                setRawGradeData(null);
                setOverwriteMode('update');
                setIsImportOpen(true);
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Upload berkas Excel nilai murid dan sinkronkan ke database cloud Supabase"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              Upload / Impor Excel
            </button>

            {/* Export Excel Button for Grades */}
            <button
              onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Excel
            </button>

            {/* Dokumen Siap Cetak Button */}
            <button
              onClick={() => setIsPrintPreviewOpen(true)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Pratinjau Dokumen Siap Cetak Leger Nilai & Unduh File Excel"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Dokumen Siap Cetak
            </button>

            <button
              onClick={handleOpenShare}
              className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-lg" title="Ketuntasan dihitung hanya dari murid yang sudah memiliki nilai">
                {passedCount} / {studentsWithScores.length} Murid Terinput ({passedPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NISN murid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-xs"
            />
          </div>

          {/* Quick Sort Buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setSortOrder('no')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                sortOrder === 'no'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Urutkan berdasarkan nomor urut murid"
            >
              <span>No Urut</span>
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('name-asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                sortOrder === 'name-asc'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Urutkan berdasarkan abjad A ke Z"
            >
              <ArrowUpAZ className="w-3.5 h-3.5" />
              <span>Abjad A-Z</span>
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('name-desc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                sortOrder === 'name-desc'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Urutkan berdasarkan abjad Z ke A"
            >
              <ArrowDownZA className="w-3.5 h-3.5" />
              <span>Abjad Z-A</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Menampilkan {filteredStudents.length} dari {classStudents.length} murid ({studentsWithScores.length} memiliki nilai) {sortOrder === 'name-asc' ? '(A-Z)' : sortOrder === 'name-desc' ? '(Z-A)' : ''}
        </p>
      </div>

      {/* Grades Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <SmoothHorizontalScroller label="Matriks Penilaian">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#009B62] via-[#008276] to-[#292E82] text-white font-bold uppercase tracking-wider shadow-xs">
                <th
                  onClick={() => setSortOrder('no')}
                  className="py-3 px-3 text-center w-10 sticky left-0 bg-[#009B62] text-white z-10 border-r border-[#008276]/40 cursor-pointer hover:opacity-90 select-none"
                  title="Klik untuk sortir nomor urut"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>No</span>
                    {sortOrder === 'no' && <ArrowUpDown className="w-3 h-3 text-white" />}
                  </div>
                </th>
                <th
                  onClick={() => setSortOrder((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                  className="py-3 px-3 min-w-[180px] sticky left-10 bg-[#008276] text-white z-10 border-r border-[#008276]/40 cursor-pointer hover:opacity-90 select-none"
                  title="Klik untuk sortir nama murid secara alfabetis (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Murid</span>
                    {sortOrder === 'name-asc' ? (
                      <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                        <ArrowUpAZ className="w-3 h-3 mr-0.5" /> A-Z
                      </span>
                    ) : sortOrder === 'name-desc' ? (
                      <span className="flex items-center text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono">
                        <ArrowDownZA className="w-3 h-3 mr-0.5" /> Z-A
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-white/70" />
                    )}
                  </div>
                </th>
                
                {/* Formatif TP Columns */}
                {gradeColumns.slice(0, activeColumnsCount).map((col, idx) => (
                  <th key={col.id} className="py-2 px-1 text-center w-16 border-r border-white/20 font-medium text-[11px] text-white">
                    <div className="font-bold text-white">TP {idx + 1}</div>
                    <div className="text-[9px] text-emerald-100 truncate max-w-[60px]" title={col.label}>
                      {col.label}
                    </div>
                  </th>
                ))}

                <th className="py-3 px-2 text-center w-16 bg-white/10 text-white border-r border-white/20">STS</th>
                <th className="py-3 px-2 text-center w-16 bg-white/10 text-white border-r border-white/20">SAS</th>
                <th className="py-3 px-2 text-center w-16 bg-white/15 text-white border-r border-white/20 font-bold" title="Hanya nilai yang sudah diinput saja yang dihitung kedalam total sum">Total Sum</th>
                <th className="py-3 px-2 text-center w-16 bg-white/20 text-white border-r border-white/20 font-bold">Nilai Akhir</th>
                <th className="py-3 px-2 text-center w-20 bg-white/20 text-white border-r border-white/20 font-bold">Predikat</th>
                <th className="py-3 px-3 min-w-[260px] text-white">Catatan Capaian Kompetensi (Kurikulum Merdeka)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7 + activeColumnsCount} className="py-12 text-center text-slate-400">
                    <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada murid di kelas ini atau tidak cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, sIdx) => {
                  const grade = localGrades[student.id];
                  const { finalScore, predicate, predicateLabel, merdekaDeskripsi, isPassed, sumInputted, countInputted, hasAnyScore } = calculateFinalScore(grade, student.nama);
                  const rowBg = sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80';

                  return (
                    <tr key={student.id} className={`${rowBg} hover:bg-indigo-50/60 transition group`}>
                      <td className={`py-2.5 px-3 text-center font-mono font-bold text-slate-500 sticky left-0 ${rowBg} group-hover:bg-indigo-50/60 border-r`}>
                        {student.no}
                      </td>
                      <td className={`py-2.5 px-3 font-semibold text-slate-900 sticky left-10 ${rowBg} group-hover:bg-indigo-50/60 border-r`}>
                        <div className="truncate max-w-[170px]" title={student.nama}>
                          {student.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.nisn || '-'}</div>
                      </td>

                      {/* TP Inputs - Zero Delay with rawInputs state */}
                      {Array.from({ length: activeColumnsCount }).map((_, colIdx) => {
                        const fieldKey = `formatif${colIdx + 1}` as keyof StudentGrade;
                        const scoreVal = grade ? (grade as any)[fieldKey] : null;
                        const cellKey = `${student.id}_${fieldKey}`;
                        const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                        return (
                          <td key={colIdx} className="py-1 px-1 border-r text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={displayVal}
                              onChange={(e) => handleScoreChange(student.id, fieldKey, e.target.value)}
                              onBlur={() => handleScoreBlur(student.id, fieldKey)}
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
                      {(() => {
                        const cellKey = `${student.id}_sumatifTengah`;
                        const scoreVal = grade?.sumatifTengah ?? null;
                        const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                        return (
                          <td className="py-1 px-1 border-r text-center bg-amber-50/20">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={displayVal}
                              onChange={(e) => handleScoreChange(student.id, 'sumatifTengah', e.target.value)}
                              onBlur={() => handleScoreBlur(student.id, 'sumatifTengah')}
                              className="w-14 text-center py-1.5 rounded-lg border border-amber-200 focus:border-amber-500 font-mono text-xs"
                              placeholder="-"
                            />
                          </td>
                        );
                      })()}

                      {/* SAS Input */}
                      {(() => {
                        const cellKey = `${student.id}_sumatifAkhir`;
                        const scoreVal = grade?.sumatifAkhir ?? null;
                        const displayVal = rawInputs[cellKey] ?? (scoreVal !== null && scoreVal !== undefined ? String(scoreVal) : '');

                        return (
                          <td className="py-1 px-1 border-r text-center bg-blue-50/20">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={displayVal}
                              onChange={(e) => handleScoreChange(student.id, 'sumatifAkhir', e.target.value)}
                              onBlur={() => handleScoreBlur(student.id, 'sumatifAkhir')}
                              className="w-14 text-center py-1.5 rounded-lg border border-blue-200 focus:border-blue-500 font-mono text-xs"
                              placeholder="-"
                            />
                          </td>
                        );
                      })()}

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

                      {/* Predicate A, B, C, D */}
                      <td className="py-2 px-2 text-center border-r">
                        {hasAnyScore ? (
                          <div className="flex flex-col items-center gap-0.5" title={`Predikat ${predicate}: ${predicateLabel}`}>
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs shadow-2xs ${
                                predicate === 'A'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : predicate === 'B'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : predicate === 'C'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {predicate}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                              {predicate === 'A' ? 'Sangat Baik' : predicate === 'B' ? 'Baik' : predicate === 'C' ? 'Cukup' : 'Bimbingan'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Catatan Input & Deskripsi Otomatis Kurikulum Merdeka */}
                      <td className="py-1 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={grade?.catatan !== undefined ? grade.catatan : ''}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            onBlur={() => handleSingleStudentSave(student.id)}
                            placeholder={hasAnyScore ? merdekaDeskripsi : 'Deskripsi pencapaian kompetensi...'}
                            title={grade?.catatan || (hasAnyScore ? merdekaDeskripsi : '')}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:border-indigo-500 truncate"
                          />
                          {hasAnyScore && (
                            <button
                              type="button"
                              onClick={() => handleApplySingleMerdeka(student.id, merdekaDeskripsi)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition shrink-0 cursor-pointer"
                              title="Terapkan Deskripsi Kurikulum Merdeka Otomatis"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                <td className="py-2 px-2 text-center font-black text-indigo-900 border-r bg-indigo-50/60" title="Rata-rata nilai akhir murid">
                  {averageClassScore || '-'}
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-600 border-r text-[10px]">
                  KKM {currentClass.kkm}
                </td>
                <td className="py-2 px-3 text-slate-500 text-[10px] font-sans">
                  {passedCount} dari {studentsWithScores.length} murid tuntas KKM
                </td>
              </tr>
            </tfoot>
          </table>
        </SmoothHorizontalScroller>

        {/* Table Footer with Prominent Save Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {syncStatus === 'saved'
                  ? 'Semua nilai murid tersimpan aman di database Cloud PostgreSQL Supabase.'
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
                    Impor Nilai Murid dari Excel
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
                    Mode Penanganan Data Nilai:
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="overwriteMode"
                        checked={overwriteMode === 'update'}
                        onChange={() => handleOverwriteModeChange('update')}
                        className="text-emerald-600 cursor-pointer"
                      />
                      <span className="font-semibold text-emerald-800">Perbarui nilai murid yang ada (Rekomendasi)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="overwriteMode"
                        checked={overwriteMode === 'skip'}
                        onChange={() => handleOverwriteModeChange('skip')}
                        className="text-slate-600 cursor-pointer"
                      />
                      <span>Lewati jika sudah ada nilai</span>
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
                  Mendukung kolom TP 1..10, STS, SAS, dan Catatan Murid
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
                        {parsedGradeRows.filter((r) => r.status === 'valid').length} murid
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
                        Pratinjau Nilai Murid
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
                            <th className="p-2.5 min-w-[150px]">Nama Murid</th>
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
            <div className="px-6 py-4 bg-slate-50 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                {(() => {
                  const validCount = parsedGradeRows.filter((r) => (r.status === 'valid' || overwriteMode === 'update') && r.studentId).length;
                  if (validCount > 0) {
                    return (
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {validCount} nilai murid siap diunggah & disimpan ke database cloud
                      </span>
                    );
                  }
                  if (parsedGradeRows.length > 0) {
                    return (
                      <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Semua murid sudah memiliki data nilai.{' '}
                        <button
                          type="button"
                          onClick={() => handleOverwriteModeChange('update')}
                          className="underline font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                        >
                          Klik di sini untuk mengaktifkan mode update
                        </button>
                      </span>
                    );
                  }
                  return (
                    <span className="text-slate-500">
                      Pilih atau seret berkas Excel untuk memverifikasi nilai murid.
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setParsedGradeRows([]);
                    setImportFileName('');
                    setRawGradeData(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                {(() => {
                  const validCount = parsedGradeRows.filter((r) => (r.status === 'valid' || overwriteMode === 'update') && r.studentId).length;

                  return (
                    <button
                      type="button"
                      disabled={isUploadingToCloud}
                      onClick={() => {
                        if (isUploadingToCloud) return;
                        if (!rawGradeData || parsedGradeRows.length === 0) {
                          fileInputRef.current?.click();
                          return;
                        }
                        if (validCount === 0) {
                          alert('Tidak ada baris nilai yang sesuai dengan daftar murid kelas ini. Pastikan file Excel memuat data nilai murid kelas ' + currentClass.namaKelas);
                          return;
                        }
                        handleCommitGradeImport();
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                      title={
                        parsedGradeRows.length === 0
                          ? 'Klik untuk memilih berkas Excel nilai murid'
                          : `Upload ${validCount} nilai murid ke cloud Supabase`
                      }
                    >
                      {isUploadingToCloud ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengunggah ke Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>
                            {parsedGradeRows.length === 0
                              ? 'Pilih File Excel & Upload ke Cloud'
                              : `Upload Nilai ke Cloud (${validCount} Murid)`}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
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

      {/* Modal Share Publik (Opacity dikurangi agar background terlihat) */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-[1.5px] animate-in fade-in">
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
                Murid dan orang tua dapat membuka tautan ini tanpa login untuk melihat transparansi buku nilai secara aman dan read-only.
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

      {/* Modal Dokumen Siap Cetak Leger Nilai Asesmen Kurikulum Merdeka */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
            {/* Header Modal - no-print */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 no-print">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Dokumen Siap Cetak & Leger Nilai - {currentClass.namaKelas}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentClass.mataPelajaran} &bull; KKM: {currentClass.kkm} &bull; T.A. {teacher.tahunAjaran} ({teacher.semester})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Download Data Nilai ke File Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download File Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950">
              <div className="bg-white text-black p-6 sm:p-10 font-serif leading-relaxed max-w-[210mm] mx-auto shadow-sm rounded-xl print:border-none print:shadow-none print:p-0 print:m-0 text-xs">
                {/* Kop Surat Resmi */}
                <OfficialLetterhead />

                {/* Judul Dokumen */}
                <div className="text-center my-4">
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-black">
                    LEGER CAPAIAN HASIL ASESMEN PESERTA DIDIK
                  </h2>
                  <p className="text-[11px] font-sans font-semibold tracking-wide uppercase text-black mt-0.5">
                    KURIKULUM MERDEKA &bull; TAHUN PELAJARAN {teacher.tahunAjaran} ({teacher.semester})
                  </p>
                </div>

                {/* Toolbar Download File Excel Siap Cetak (no-print) */}
                <div className="mb-3.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-slate-900 no-print">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-emerald-950">Dokumen Siap Cetak Leger Nilai & Asesmen</p>
                      <p className="text-[11px] text-emerald-800">
                        Unduh lembar nilai ini dalam format berkas Microsoft Excel (.xlsx) resmi dan terstruktur.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Download File Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File Excel (.xlsx)</span>
                  </button>
                </div>

                {/* Identitas Dokumen Formal */}
                <div className="border border-black p-3 mb-4 font-sans text-[11px]">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <table className="w-full text-left">
                        <tbody>
                          <tr>
                            <td className="w-32 py-0.5 text-black">Satuan Pendidikan</td>
                            <td className="w-3 py-0.5">:</td>
                            <td className="py-0.5 font-bold text-black">{SCHOOL_CONFIG.namaSekolah}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-black">Kelas / Rombel</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold text-black">{currentClass.namaKelas}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-black">Mata Pelajaran</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold text-black">{currentClass.mataPelajaran}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <table className="w-full text-left">
                        <tbody>
                          <tr>
                            <td className="w-32 py-0.5 text-black">Pendidik Pengampu</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold text-black">{teacher.namaGuru}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-black">Tahun Pelajaran</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 text-black">{teacher.tahunAjaran} ({teacher.semester})</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-black">KKM / KKTP</td>
                            <td className="py-0.5">:</td>
                            <td className="py-0.5 font-bold text-black">{currentClass.kkm}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tabel Leger Nilai */}
                <div className="mb-4">
                  <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-100">
                        <th className="border border-black p-1.5 w-7">No</th>
                        <th className="border border-black p-1.5 w-24">NISN</th>
                        <th className="border border-black p-1.5 text-left">Nama Peserta Didik</th>
                        {gradeColumns.slice(0, activeColumnsCount).map((c, i) => (
                          <th key={c.key} className="border border-black p-1.5 w-12" title={c.label}>
                            F{i + 1}
                          </th>
                        ))}
                        <th className="border border-black p-1.5 w-12 font-bold">Rata F</th>
                        <th className="border border-black p-1.5 w-12 font-bold">STS</th>
                        <th className="border border-black p-1.5 w-12 font-bold">SAS</th>
                        <th className="border border-black p-1.5 w-14 font-black">NA</th>
                        <th className="border border-black p-1.5 w-12 font-bold">Pred</th>
                        <th className="border border-black p-1.5 w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((std, idx) => {
                        const g = localGrades[std.id];
                        const fVals = [
                          g?.formatif1, g?.formatif2, g?.formatif3, g?.formatif4, g?.formatif5,
                          g?.formatif6, g?.formatif7, g?.formatif8, g?.formatif9, g?.formatif10
                        ].slice(0, activeColumnsCount).filter((v): v is number => typeof v === 'number' && !isNaN(v));
                        const avgF = fVals.length > 0 ? Math.round(fVals.reduce((a, b) => a + b, 0) / fVals.length) : null;
                        const sts = typeof g?.sumatifTengah === 'number' && !isNaN(g.sumatifTengah) ? g.sumatifTengah : null;
                        const sas = typeof g?.sumatifAkhir === 'number' && !isNaN(g.sumatifAkhir) ? g.sumatifAkhir : null;

                        let totalWeighted = 0;
                        let totalW = 0;
                        if (avgF !== null) { totalWeighted += avgF * 0.5; totalW += 0.5; }
                        if (sts !== null) { totalWeighted += sts * 0.25; totalW += 0.25; }
                        if (sas !== null) { totalWeighted += sas * 0.25; totalW += 0.25; }
                        const finalScore = totalW > 0 ? Math.round(totalWeighted / totalW) : null;
                        const hasScore = finalScore !== null;
                        const isTuntas = hasScore ? finalScore >= currentClass.kkm : false;
                        const predikat = hasScore ? (finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= currentClass.kkm ? 'C' : 'D') : '-';

                        return (
                          <tr key={std.id} className="hover:bg-slate-50">
                            <td className="border border-black p-1 font-mono">{idx + 1}</td>
                            <td className="border border-black p-1 font-mono">{std.nisn || '-'}</td>
                            <td className="border border-black p-1 text-left font-medium">{std.nama}</td>
                            {gradeColumns.slice(0, activeColumnsCount).map((col) => {
                              const val = g?.[col.key as keyof StudentGrade];
                              return (
                                <td key={col.key} className="border border-black p-1 font-mono">
                                  {typeof val === 'number' && !isNaN(val) ? val : '-'}
                                </td>
                              );
                            })}
                            <td className="border border-black p-1 font-mono font-semibold">{avgF !== null ? avgF : '-'}</td>
                            <td className="border border-black p-1 font-mono font-semibold">{sts !== null ? sts : '-'}</td>
                            <td className="border border-black p-1 font-mono font-semibold">{sas !== null ? sas : '-'}</td>
                            <td className="border border-black p-1 font-mono font-bold">{finalScore !== null ? finalScore : '-'}</td>
                            <td className="border border-black p-1 font-semibold">{predikat}</td>
                            <td className="border border-black p-1 font-medium">{hasScore ? (isTuntas ? 'TUNTAS' : 'REMEDIAL') : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan Resmi Dokumen (Tanpa Nama Kepala Sekolah) */}
                <div className="mt-8 font-sans text-xs">
                  <div className="flex justify-end mb-4">
                    <p>Bawang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p className="font-semibold">Mengetahui,</p>
                      <p className="font-semibold">Kepala SMK Muhammadiyah Bawang</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline">( .................................................... )</p>
                      <p className="text-[11px] text-slate-600">NBM / NIP. ........................................</p>
                    </div>
                    <div>
                      <p className="font-semibold">Pendidik Pengampu Mata Pelajaran,</p>
                      <p className="text-slate-600">{currentClass.mataPelajaran}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline">{teacher.namaGuru}</p>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        NBM / NIP: {teacher.nbm || teacher.nip || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - no-print */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Format resmi sesuai standar kurikulum {SCHOOL_CONFIG.namaSekolah}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => exportGradesToExcel(currentClass, classStudents, Object.values(localGrades), gradeColumns, teacher)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Unduh File Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download File Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
