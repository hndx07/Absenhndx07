import { useState, useEffect, useRef, useMemo } from 'react';
import { getPublicShare, getTeacherProfile, getClasses, getStudents, getAttendanceSessions, getStudentGrades, getGradeColumns, getSavingTransactions, getTeachingAgendas } from '../../services/data';
import { TeacherProfile } from '../../types';
import { SCHOOL_CONFIG } from '../../config/schoolConfig';

export interface UsePublicShareDataProps {
  initialType: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  shareId: string;
}

export function formatIndonesianDate(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatIndonesianDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const dStr = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dStr}, ${tStr} WIB`;
}

export function usePublicShareData({ initialType, shareId }: UsePublicShareDataProps) {
  const [data, setData] = useState<any>(null);
  const [cloudTeacher, setCloudTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);
  const [sortOrder, setSortOrder] = useState<'no' | 'name-asc' | 'name-desc'>('name-asc');

  const effectiveType: 'absen' | 'nilai' | 'tabungan' | 'agenda' =
    data?.shareType || initialType;

  const satuanPendidikan =
    data?.namaSekolah || data?.school || cloudTeacher?.namaSekolah || SCHOOL_CONFIG.namaSekolah;
  const guruPengampu =
    data?.teacherName || data?.teacher || cloudTeacher?.namaGuru || 'Pendidik Pengampu';
  const nbmGuru = data?.teacherNbm || cloudTeacher?.nbm || '';
  const tahunAjaran =
    data?.tahunAjaran || cloudTeacher?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran;
  const semester =
    data?.semester || cloudTeacher?.semester || SCHOOL_CONFIG.semester;
  const kepalaSekolah =
    data?.namaKepalaSekolah || cloudTeacher?.namaKepalaSekolah || '';
  const nbmKepala =
    data?.nbmKepalaSekolah || cloudTeacher?.nbmKepalaSekolah || '';

  const lastUpdatedAtRef = useRef<string | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const [sharePayload, teacherData] = await Promise.all([
        getPublicShare(shareId, lastUpdatedAtRef.current).catch(() => null),
        getTeacherProfile().catch(() => null),
      ]);
      if (teacherData) {
        setCloudTeacher(teacherData);
      }

      // Jika server mengembalikan indikator unchanged (hemat data/bandwidth)
      if ((sharePayload as any)?.payload?.unchanged === true || (sharePayload as any)?.unchanged === true) {
        return;
      }

      const recUpdatedAt =
        (sharePayload as any)?.updated_at ||
        (sharePayload as any)?.created_at ||
        (sharePayload as any)?.payload?.updated_at ||
        null;
      if (recUpdatedAt) {
        lastUpdatedAtRef.current = recUpdatedAt;
      }

      const cleanClassId =
        (sharePayload as any)?.classId ||
        (sharePayload as any)?.payload?.classId ||
        shareId
          .replace(/^(att_share_|grade_share_|sav_share_|agenda_share_|att_|grade_|sav_|agenda_)/, '')
          .trim();

      if (sharePayload) {
        const payloadContent =
          (sharePayload as any).payload || (sharePayload as any).data || sharePayload;

        let mergedSessions = payloadContent.sessions;
        if (payloadContent.shareType === 'absen' || initialType === 'absen') {
          try {
            const rawLocal = localStorage.getItem('smk_attendance');
            if (rawLocal) {
              const localSessions = JSON.parse(rawLocal);
              const classLocalSessions = cleanClassId
                ? localSessions.filter((s: any) => s.classId === cleanClassId)
                : localSessions;
              if (classLocalSessions && classLocalSessions.length > 0) {
                if (!mergedSessions || classLocalSessions.length >= mergedSessions.length) {
                  mergedSessions = classLocalSessions;
                }
              }
            }
          } catch {}
        }

        let mergedAgendas = payloadContent.agendas;
        if (payloadContent.shareType === 'agenda' || initialType === 'agenda') {
          try {
            const rawLocal = localStorage.getItem('smk_teaching_agendas');
            if (rawLocal) {
              const localAgendas = JSON.parse(rawLocal);
              if (localAgendas && localAgendas.length > 0) {
                if (!mergedAgendas || localAgendas.length >= mergedAgendas.length) {
                  mergedAgendas = localAgendas;
                }
              }
            }
          } catch {}
        }

        let mergedGrades = payloadContent.grades;
        let mergedGradeColumns = payloadContent.gradeColumns;
        let mergedStudents = payloadContent.students;
        if (payloadContent.shareType === 'nilai' || initialType === 'nilai') {
          try {
            const rawLocalGrades = localStorage.getItem('smk_grades') || localStorage.getItem('smk_student_grades');
            if (rawLocalGrades) {
              const localGrades = JSON.parse(rawLocalGrades);
              const classLocalGrades = cleanClassId
                ? localGrades.filter((g: any) => g.classId === cleanClassId)
                : localGrades;
              if (classLocalGrades && classLocalGrades.length > 0) {
                mergedGrades = classLocalGrades;
              }
            }

            const rawGradeCols = localStorage.getItem('muhiba_grade_columns');
            if (rawGradeCols) {
              const allCols = JSON.parse(rawGradeCols);
              if (cleanClassId && allCols[cleanClassId] && Array.isArray(allCols[cleanClassId]) && allCols[cleanClassId].length > 0) {
                mergedGradeColumns = allCols[cleanClassId];
              }
            }

            if (!mergedStudents || mergedStudents.length === 0) {
              const rawStudents = localStorage.getItem('smk_students');
              if (rawStudents) {
                const allStds = JSON.parse(rawStudents);
                const classStds = cleanClassId
                  ? allStds.filter((s: any) => s.classId === cleanClassId)
                  : allStds;
                if (classStds && classStds.length > 0) {
                  mergedStudents = classStds;
                }
              }
            }
          } catch {}
        }

        let mergedTransactions = payloadContent.transactions || payloadContent.allTransactions;
        let finalCashBalance = payloadContent.classCashBalance;
        let finalCashIn = payloadContent.totalCashIn;
        let finalCashOut = payloadContent.totalCashOut;
        let finalCashTransactions = payloadContent.cashTransactions;

        if (payloadContent.shareType === 'tabungan' || initialType === 'tabungan') {
          try {
            const rawSavings = localStorage.getItem('smk_savings') || localStorage.getItem('smk_saving_transactions');
            if (rawSavings) {
              const localSavings = JSON.parse(rawSavings);
              const classLocalSavings = cleanClassId
                ? localSavings.filter((t: any) => t.classId === cleanClassId)
                : localSavings;
              if (classLocalSavings && classLocalSavings.length > 0) {
                mergedTransactions = classLocalSavings;
              }
            }

            if (!mergedStudents || mergedStudents.length === 0) {
              const rawStudents = localStorage.getItem('smk_students');
              if (rawStudents) {
                const allStds = JSON.parse(rawStudents);
                const classStds = cleanClassId
                  ? allStds.filter((s: any) => s.classId === cleanClassId)
                  : allStds;
                if (classStds && classStds.length > 0) {
                  mergedStudents = classStds;
                }
              }
            }
          } catch {}

          if (Array.isArray(mergedTransactions)) {
            const txList = mergedTransactions;
            finalCashBalance = txList
              .filter((tx: any) => tx.isClassCash)
              .reduce((acc: number, tx: any) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)), 0);
            finalCashIn = txList
              .filter((tx: any) => tx.isClassCash && tx.tipe === 'masuk')
              .reduce((acc: number, tx: any) => acc + Number(tx.jumlah || 0), 0);
            finalCashOut = txList
              .filter((tx: any) => tx.isClassCash && tx.tipe === 'keluar')
              .reduce((acc: number, tx: any) => acc + Number(tx.jumlah || 0), 0);
            finalCashTransactions = txList.filter((tx: any) => tx.isClassCash);

            const studentBalances: Record<string, number> = {};
            const studentLatestDateMap: Record<string, string> = {};
            if (Array.isArray(mergedStudents)) {
              mergedStudents.forEach((std: any) => {
                const stdTxs = txList
                  .filter((tx: any) => !tx.isClassCash && tx.studentId === std.id)
                  .sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
                studentBalances[std.id] = stdTxs.reduce(
                  (acc: number, tx: any) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)),
                  0
                );
                if (stdTxs.length > 0) {
                  studentLatestDateMap[std.id] = stdTxs[0].tanggal;
                }
              });

              mergedStudents = mergedStudents.map((std: any) => ({
                ...std,
                saldo: studentBalances[std.id] ?? std.saldo ?? 0,
                tanggalInput: studentLatestDateMap[std.id] || std.tanggalInput || std.lastTransactionDate || '',
                lastTransactionDate: studentLatestDateMap[std.id] || std.lastTransactionDate || std.tanggalInput || '',
              }));
            }

            mergedTransactions = txList.map((tx: any) => {
              const std = Array.isArray(mergedStudents) ? mergedStudents.find((s: any) => s.id === tx.studentId) : null;
              return {
                ...tx,
                namaMurid: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : (tx.namaMurid || '-'),
                namaSiswa: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : (tx.namaSiswa || '-'),
              };
            });
          }
        }

        setData({
          ...payloadContent,
          sessions: mergedSessions || payloadContent.sessions,
          agendas: mergedAgendas || payloadContent.agendas,
          grades: mergedGrades || payloadContent.grades,
          gradeColumns: mergedGradeColumns || payloadContent.gradeColumns,
          students: mergedStudents || payloadContent.students,
          transactions: mergedTransactions || payloadContent.transactions,
          allTransactions: mergedTransactions || payloadContent.allTransactions,
          cashTransactions: finalCashTransactions ?? payloadContent.cashTransactions,
          classCashBalance: finalCashBalance ?? payloadContent.classCashBalance,
          totalCashIn: finalCashIn ?? payloadContent.totalCashIn,
          totalCashOut: finalCashOut ?? payloadContent.totalCashOut,
          shareType: (sharePayload as any).type || payloadContent.shareType || initialType,
          title: (sharePayload as any).title || payloadContent.title,
          created_at: (sharePayload as any).created_at || payloadContent.created_at,
          updated_at: (sharePayload as any).updated_at || payloadContent.updated_at,
        });
      } else {
        const loadedClasses = await getClasses().catch(() => []);
        const targetClass =
          loadedClasses.find((c) => c.id === cleanClassId) || loadedClasses[0] || null;
        const clsId = targetClass?.id || cleanClassId || 'class_tkj_1';

        if (initialType === 'absen') {
          const [stds, sess] = await Promise.all([
            getStudents(clsId).catch(() => []),
            getAttendanceSessions(clsId).catch(() => []),
          ]);
          setData({
            className: targetClass?.namaKelas || 'XII TKJ 1',
            subject: targetClass?.mataPelajaran || 'Administrasi Infrastruktur Jaringan',
            teacher: teacherData?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
            teacherName: teacherData?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
            namaSekolah: teacherData?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
            tahunAjaran: teacherData?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
            semester: teacherData?.semester || SCHOOL_CONFIG.semester,
            students: stds,
            sessions: sess,
            shareType: 'absen',
          });
        } else if (initialType === 'nilai') {
          const [stds, grds, cols] = await Promise.all([
            getStudents(clsId).catch(() => []),
            getStudentGrades(clsId).catch(() => []),
            getGradeColumns(clsId).catch(() => []),
          ]);
          setData({
            className: targetClass?.namaKelas || 'XII TKJ 1',
            subject: targetClass?.mataPelajaran || 'Administrasi Infrastruktur Jaringan',
            teacherName: teacherData?.namaGuru || 'Guru SMK Muhammadiyah Bawang',
            namaSekolah: teacherData?.namaSekolah || SCHOOL_CONFIG.namaSekolah,
            tahunAjaran: teacherData?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran,
            semester: teacherData?.semester || SCHOOL_CONFIG.semester,
            kkm: targetClass?.kkm || 75,
            students: stds,
            grades: grds,
            gradeColumns: cols,
            shareType: 'nilai',
          });
        } else if (initialType === 'tabungan') {
          const [stds, txs] = await Promise.all([
            getStudents(clsId).catch(() => []),
            getSavingTransactions(clsId).catch(() => []),
          ]);
          const classTxList = txs;
          const classCashBalance = classTxList
            .filter((tx) => tx.isClassCash)
            .reduce((acc, tx) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)), 0);
          const totalCashIn = classTxList
            .filter((tx) => tx.isClassCash && tx.tipe === 'masuk')
            .reduce((acc, tx) => acc + Number(tx.jumlah || 0), 0);
          const totalCashOut = classTxList
            .filter((tx) => tx.isClassCash && tx.tipe === 'keluar')
            .reduce((acc, tx) => acc + Number(tx.jumlah || 0), 0);
          const cashTransactions = classTxList.filter((tx) => tx.isClassCash);

          const studentBalances: Record<string, number> = {};
          const studentLatestDateMap: Record<string, string> = {};
          stds.forEach((std) => {
            const stdTxs = classTxList
              .filter((tx) => !tx.isClassCash && tx.studentId === std.id)
              .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
            studentBalances[std.id] = stdTxs.reduce(
              (acc, tx) => (tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0)),
              0
            );
            if (stdTxs.length > 0) {
              studentLatestDateMap[std.id] = stdTxs[0].tanggal;
            }
          });

          const detailedTransactions = classTxList.map((tx) => {
            const std = stds.find((s) => s.id === tx.studentId);
            return {
              ...tx,
              namaMurid: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : '-',
              namaSiswa: std ? std.nama : tx.isClassCash ? 'Kas Kelas' : '-',
            };
          });

          const studentsWithDatesAndBalances = stds.map((s) => ({
            ...s,
            saldo: studentBalances[s.id] || 0,
            tanggalInput: studentLatestDateMap[s.id] || '',
            lastTransactionDate: studentLatestDateMap[s.id] || '',
          }));

          setData({
            className: targetClass?.namaKelas || 'XII TKJ 1',
            classCashBalance,
            totalCashIn,
            totalCashOut,
            cashTransactions,
            students: studentsWithDatesAndBalances,
            transactions: detailedTransactions,
            allTransactions: detailedTransactions,
            shareType: 'tabungan',
          });
        } else if (initialType === 'agenda') {
          const ags = await getTeachingAgendas(clsId).catch(() => []);
          setData({
            className: targetClass?.namaKelas || 'Semua Kelas',
            agendas: ags,
            shareType: 'agenda',
          });
        }
      }
    } catch (err) {
      console.warn('Could not load public share from supabase', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    loadData();

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      loadData(true);
    }, 45000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadData(true);
      }
    };
    const handleFocus = () => loadData(true);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    window.addEventListener('public_share_updated', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('pub_share') || e.key.includes('smk_') || e.key.includes('muhiba_')) {
        loadData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener('public_share_updated', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [shareId]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveTimestamp = data?.updated_at || data?.created_at;
  const formattedUpdateDate = effectiveTimestamp
    ? formatIndonesianDateTime(effectiveTimestamp)
    : `${lastRefreshed.toLocaleTimeString('id-ID')} WIB`;

  const sortedStudents = useMemo(() => {
    const list = Array.isArray(data?.students) ? [...data.students] : [];
    return list
      .filter(
        (s: any) =>
          (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.nisn || '').includes(searchTerm)
      )
      .sort((a: any, b: any) => {
        if (sortOrder === 'name-asc') {
          return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
        }
        if (sortOrder === 'name-desc') {
          return (b.nama || '').localeCompare(a.nama || '', 'id', { sensitivity: 'base' });
        }
        return (a.no || 0) - (b.no || 0);
      });
  }, [data?.students, searchTerm, sortOrder]);

  return {
    data,
    cloudTeacher,
    loading,
    isRefreshing,
    searchTerm,
    setSearchTerm,
    lastRefreshed,
    copied,
    sortOrder,
    setSortOrder,
    effectiveType,
    satuanPendidikan,
    guruPengampu,
    nbmGuru,
    tahunAjaran,
    semester,
    kepalaSekolah,
    nbmKepala,
    loadData,
    handleCopyLink,
    formattedUpdateDate,
    sortedStudents,
  };
}
