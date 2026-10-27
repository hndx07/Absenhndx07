import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getPublicShare } from '../../../services/shares';
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

  // Metadata sekolah dan guru diambil dari payload share publik dengan fallback aman ke konfigurasi statis sekolah
  const satuanPendidikan =
    data?.namaSekolah || data?.school || SCHOOL_CONFIG.namaSekolah;
  const guruPengampu =
    data?.teacherName || data?.teacher || 'Pendidik Pengampu';
  const nbmGuru = data?.teacherNbm || data?.nbm || '';
  const tahunAjaran =
    data?.tahunAjaran || SCHOOL_CONFIG.tahunAjaran;
  const semester =
    data?.semester || SCHOOL_CONFIG.semester;
  const kepalaSekolah =
    data?.namaKepalaSekolah || '';
  const nbmKepala =
    data?.nbmKepalaSekolah || '';

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
        // Mode publik HANYA mengakses data via RPC get_public_share / cache terotentikasi publik
        const sharePayload = await getPublicShare(shareId, lastUpdatedAtRef.current);

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
          setErrorType('not_found');
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
          setErrorMessage(err?.message || null);
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
    cloudTeacher: (data?.cloudTeacher as TeacherProfile) || null,
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
