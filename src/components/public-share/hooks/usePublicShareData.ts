import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  getPublicShare,
  getTeacherProfile,
  getClasses,
  getStudents,
  getAttendanceSessions,
  getStudentGrades,
  getGradeColumns,
  getSavingTransactions,
  getTeachingAgendas,
} from '../../../services/data';
import { TeacherProfile } from '../../../types';
import { SCHOOL_CONFIG } from '../../../config/schoolConfig';
import { PublicShareErrorType } from '../PublicShareError';

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
  const [errorType, setErrorType] = useState<PublicShareErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!shareId || !shareId.trim()) {
        setErrorType('invalid_token');
        setLoading(false);
        return;
      }

      if (!isSilent) {
        setLoading(true);
        setErrorType(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [sharePayload, teacherData] = await Promise.all([
          getPublicShare(shareId, lastUpdatedAtRef.current),
          getTeacherProfile().catch(() => null),
        ]);

        if (teacherData) {
          setCloudTeacher(teacherData);
        }

        // Jika respons unchanged dari server untuk hemat bandwidth
        if (
          (sharePayload as any)?.payload?.unchanged === true ||
          (sharePayload as any)?.unchanged === true
        ) {
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

          setData({
            ...payloadContent,
            shareType: (sharePayload as any).type || payloadContent.shareType || initialType,
            title: (sharePayload as any).title || payloadContent.title,
            created_at: (sharePayload as any).created_at || payloadContent.created_at,
            updated_at: (sharePayload as any).updated_at || payloadContent.updated_at,
          });
          setErrorType(null);
        } else {
          // Fallback cerdas: query basis kelas jika ada
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
            setErrorType(null);
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
            setErrorType(null);
          } else if (initialType === 'tabungan') {
            const [stds, txs] = await Promise.all([
              getStudents(clsId).catch(() => []),
              getSavingTransactions(clsId).catch(() => []),
            ]);
            const classTxList = txs;
            const classCashBalance = classTxList
              .filter((tx) => tx.isClassCash)
              .reduce(
                (acc, tx) =>
                  tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0),
                0
              );
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
                (acc, tx) =>
                  tx.tipe === 'masuk' ? acc + Number(tx.jumlah || 0) : acc - Number(tx.jumlah || 0),
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
            setErrorType(null);
          } else if (initialType === 'agenda') {
            const ags = await getTeachingAgendas(clsId).catch(() => []);
            setData({
              className: targetClass?.namaKelas || 'Semua Kelas',
              agendas: ags,
              shareType: 'agenda',
            });
            setErrorType(null);
          } else {
            setErrorType('not_found');
          }
        }
      } catch (err: any) {
        if (err?.code === 'REVOKED') {
          setErrorType('revoked');
          setErrorMessage(err.message);
        } else if (err?.code === 'EXPIRED') {
          setErrorType('expired');
          setErrorMessage(err.message);
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setErrorType('network');
        } else {
          setErrorType('not_found');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setLastRefreshed(new Date());
      }
    },
    [initialType, shareId]
  );

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
      if (
        !e.key ||
        e.key.includes('pub_share') ||
        e.key.includes('smk_') ||
        e.key.includes('muhiba_')
      ) {
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
  }, [loadData]);

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
    errorType,
    errorMessage,
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
