import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Student,
  StudentGrade,
  GradeColumn,
  PublicShareRecord,
} from '../../../types';
import { SCHOOL_CONFIG } from '../../../config/schoolConfig';
import { createOrUpdatePublicShare, resequenceStudentsAlphabetically, sanitizePublicStudent } from '../../../services/data';
import { getKurikulumMerdekaAssessment } from '../../../utils/gradeCalculations';
import {
  GradesViewProps,
  GradePreviewRow,
  GradeFinalScoreResult,
  ColumnSummary,
} from '../types';

export function useGradesViewState({
  currentClass,
  students,
  grades,
  gradeColumns,
  teacher,
  onSaveGrade,
  onSaveGradeColumns,
}: GradesViewProps) {
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
  const [importFileName, setImportFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedGradeRows, setParsedGradeRows] = useState<GradePreviewRow[]>([]);
  const [rawGradeData, setRawGradeData] = useState<any[][] | null>(null);
  const [overwriteMode, setOverwriteMode] = useState<'skip' | 'update'>('update');
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classStudents = useMemo(() => {
    const raw = students.filter((s) => s.classId === currentClass.id);
    return resequenceStudentsAlphabetically(raw, currentClass.id);
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

    setLocalGrades((prev) => ({ ...prev, [studentId]: updated }));
    scheduleCloudSync(updated);
  };

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

  const calculateFinalScore = (grade?: StudentGrade, studentName?: string): GradeFinalScoreResult => {
    if (!grade) {
      const assessment = getKurikulumMerdekaAssessment(null, currentClass.kkm, currentClass.mataPelajaran, studentName);
      return {
        finalScore: 0,
        sumInputted: 0,
        countInputted: 0,
        formatifAvg: 0,
        predicate: '-',
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
        predicate: '-',
        predicateLabel: assessment.predikatLabel,
        merdekaDeskripsi: assessment.deskripsi,
        merdekaDeskripsiSingkat: assessment.deskripsiSingkat,
        isPassed: false,
        hasAnyScore: false,
      };
    }

    const formatifAvg =
      formatifScores.length > 0
        ? formatifScores.reduce((a, b) => a + b, 0) / formatifScores.length
        : null;

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

  const handleApplySingleMerdeka = (studentId: string, autoDesc: string) => {
    handleNoteChange(studentId, autoDesc);
    handleSingleStudentSave(studentId);
  };

  const handleApplyMerdekaDescriptionsAll = () => {
    const updatedMap = { ...localGrades };
    const recordsToSave: StudentGrade[] = [];

    classStudents.forEach((student) => {
      const grade = updatedMap[student.id];
      const { merdekaDeskripsi, hasAnyScore } = calculateFinalScore(grade, student.nama);
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
    const initialUrl = `${baseUrl}?nilai_share=${shareId}`;
    setShareLink(initialUrl);

    try {
      const sanitizedStudents = classStudents.map(sanitizePublicStudent);

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
          teacherNip: '',
          teacherNbm: teacher.nbm || '',
          namaSekolah: teacher.namaSekolah || SCHOOL_CONFIG.namaSekolah,
          namaKepalaSekolah: teacher.namaKepalaSekolah || '',
          nipKepalaSekolah: '',
          nbmKepalaSekolah: teacher.nbmKepalaSekolah || '',
          tahunAjaran: teacher.tahunAjaran || '2025/2026',
          semester: teacher.semester || 'Genap',
          kkm: currentClass.kkm,
          grades: Object.values(localGrades),
          gradeColumns,
          students: sanitizedStudents,
        },
      };

      const token = await createOrUpdatePublicShare(record);
      const effectiveToken = token || (record as any).share_token;
      const targetUrl = effectiveToken
        ? `${baseUrl}?nilai_share=${effectiveToken}`
        : initialUrl;
      setShareLink(targetUrl);

      const QRCode = (await import('qrcode')).default;
      const qr = await QRCode.toDataURL(targetUrl, { width: 300, margin: 2 });
      setShareQrUrl(qr);

      setShareModalOpen(true);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat tautan publik.');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOverwriteModeChange = (mode: 'skip' | 'update') => {
    setOverwriteMode(mode);
    if (rawGradeData) {
      processRawGradeRows(rawGradeData, mode);
    }
  };

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

      let matchedStudent = classStudents.find((s) => {
        const sNisnClean = (s.nisn || '').trim().replace(/^0+/, '');
        const cleanNisnStripped = cleanNisn.replace(/^0+/, '');
        if (cleanNisnStripped && sNisnClean && cleanNisnStripped === sNisnClean) return true;
        if (cleanNama && s.nama.toLowerCase().replace(/\s+/g, ' ').trim() === cleanNama) return true;
        if (cleanNama && stripPunct(s.nama) === stripPunct(cleanNama)) return true;
        return false;
      });

      if (!matchedStudent && cleanNama.length >= 3) {
        matchedStudent = classStudents.find((s) => {
          const sClean = s.nama.toLowerCase().trim();
          return sClean.includes(cleanNama) || cleanNama.includes(sClean);
        });
      }

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
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert('Format berkas tidak didukung. Harap pilih berkas dengan format .xlsx, .xls, atau .csv.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('Berkas Excel kosong atau tidak memiliki lembar kerja.');
          return;
        }

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
    let effectiveRows = parsedGradeRows;
    let validRows = effectiveRows.filter((r) => (r.status === 'valid' || overwriteMode === 'update') && r.studentId);
    
    if (validRows.length === 0 && effectiveRows.length > 0) {
      effectiveRows = effectiveRows.map((r, idx) => ({
        ...r,
        studentId: r.studentId || classStudents[idx]?.id,
        status: 'valid' as const,
      })).filter((r) => r.studentId);
      validRows = effectiveRows;
    }

    if (validRows.length === 0) {
      alert('Tidak ada data nilai murid yang dapat diproses. Pastikan file Excel berisi data nilai murid kelas ' + currentClass.namaKelas);
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

  const columnSummary = useMemo<ColumnSummary>(() => {
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

  return {
    searchTerm,
    setSearchTerm,
    sortOrder,
    setSortOrder,
    activeColumnsCount,
    setActiveColumnsCount,
    isColumnEditorOpen,
    setIsColumnEditorOpen,
    editingColumns,
    setEditingColumns,
    localGrades,
    rawInputs,
    syncStatus,
    pendingSaves,
    shareModalOpen,
    setShareModalOpen,
    shareQrUrl,
    shareLink,
    copiedLink,
    isPrintPreviewOpen,
    setIsPrintPreviewOpen,
    isImportOpen,
    setIsImportOpen,
    importFileName,
    isDragging,
    setIsDragging,
    parsedGradeRows,
    rawGradeData,
    overwriteMode,
    isUploadingToCloud,
    fileInputRef,
    classStudents,
    filteredStudents,
    studentsWithScores,
    averageClassScore,
    passedCount,
    passedPercentage,
    columnSummary,
    handleSaveAllNow,
    handleSingleStudentSave,
    handleScoreChange,
    handleScoreBlur,
    handleNoteChange,
    calculateFinalScore,
    handleApplySingleMerdeka,
    handleApplyMerdekaDescriptionsAll,
    handleSaveColumns,
    handleOpenShare,
    copyShareLink,
    handleOverwriteModeChange,
    handleFileDrop,
    handleCommitGradeImport,
  };
}
