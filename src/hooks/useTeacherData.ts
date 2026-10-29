import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Session } from '@supabase/supabase-js';
import {
  getAuthSession,
  getSafeSupabaseClient,
  signOutSupabase,
} from '../services/supabase';
import {
  syncAttendanceSessionToAgenda,
  syncPublicAttendanceShare,
  syncPublicGradesShare,
  syncPublicAgendasShare,
  syncPublicSavingsShare,
  resequenceStudentsAlphabetically,
} from '../services/data';
import {
  TeacherProfile,
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  SavingTransaction,
} from '../types';
import { UiStatePersistence, SafeCache } from '../utils/storageCache';
import { exportDataToJsonBackup } from '../utils/storage';
import { smoothScrollToTop } from '../utils/smoothScroll';
import { queryKeys } from '../lib/queryKeys';
import { NavTab } from '../components/layout/types';

// Domain Query Hooks
import { useTeacherProfileQuery, useTeacherProfileMutation } from './useTeacherProfileQuery';
import { useClassesQuery, useClassMutations } from './useClassesQuery';
import { useStudentsQuery, useStudentMutations } from './useStudentsQuery';
import { useAttendanceQuery, useAttendanceMutations } from './useAttendanceQuery';
import { useGradesQuery, useGradeColumnsQuery, useGradesMutations } from './useGradesQuery';
import { useJournalsQuery, useJournalsMutations } from './useJournalsQuery';
import { useFinancesQuery, useFinancesMutations } from './useFinancesQuery';

export function useTeacherData() {
  const queryClient = useQueryClient();

  // 1. Auth Session
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const userId = session?.user?.id;

  // 2. Active Tab & Active Class
  const [activeTab, setActiveTabState] = useState<NavTab>(() =>
    UiStatePersistence.get<NavTab>('activeTab', 'attendance')
  );
  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    UiStatePersistence.set('activeTab', tab);
    smoothScrollToTop(400);
  };

  const [activeClassId, setActiveClassIdState] = useState<string>(() =>
    UiStatePersistence.get('activeClassId', '')
  );
  const setActiveClassId = (clsId: string) => {
    setActiveClassIdState(clsId);
    UiStatePersistence.set('activeClassId', clsId);
  };

  // 3. Feedback Toasts
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshSuccessToast, setRefreshSuccessToast] = useState<string | null>(null);

  // 4. TanStack Queries with Lazy Loading Strategy:
  // - Profile & Classes: Essential data loaded at startup
  const profileQuery = useTeacherProfileQuery({
    userId,
    enabled: Boolean(session),
  });

  const classesQuery = useClassesQuery({
    userId,
    enabled: Boolean(session),
  });

  // - Students: Lazy loaded whenever an activeClassId is selected
  const studentsQuery = useStudentsQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId),
  });

  // - Attendance: Lazy loaded strictly when on attendance/recap/agendas/stats/parent tabs
  const isAttendanceTabActive = ['attendance', 'recap', 'agendas', 'statistics', 'parent_report'].includes(activeTab);
  const attendanceQuery = useAttendanceQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isAttendanceTabActive),
  });

  // - Grades & Grade Columns: Lazy loaded strictly when on grades/stats/parent tabs
  const isGradesTabActive = ['grades', 'statistics', 'parent_report'].includes(activeTab);
  const gradesQuery = useGradesQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isGradesTabActive),
  });
  const gradeColumnsQuery = useGradeColumnsQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isGradesTabActive),
  });

  // - Agendas/Journals: Lazy loaded strictly when on agendas/attendance tabs
  const isAgendasTabActive = ['agendas', 'attendance'].includes(activeTab);
  const journalsQuery = useJournalsQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && isAgendasTabActive),
  });

  // - Finances/Savings: Lazy loaded strictly when on savings/stats tabs
  const isSavingsTabActive = ['savings', 'statistics'].includes(activeTab);
  const financesQuery = useFinancesQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isSavingsTabActive),
  });

  // 5. TanStack Mutations
  const profileMutation = useTeacherProfileMutation(userId);
  const classMutations = useClassMutations(userId);
  const studentMutations = useStudentMutations(userId, activeClassId);
  const attendanceMutations = useAttendanceMutations(userId, activeClassId);
  const gradesMutations = useGradesMutations(userId, activeClassId);
  const journalsMutations = useJournalsMutations(userId);
  const financesMutations = useFinancesMutations(userId, activeClassId);

  // Derived Reactive Data
  const teacher = profileQuery.data || null;
  const classes = useMemo(() => classesQuery.data || [], [classesQuery.data]);

  const students = useMemo(() => {
    if (!studentsQuery.data || studentsQuery.data.length === 0) return [];
    return resequenceStudentsAlphabetically(studentsQuery.data, activeClassId);
  }, [studentsQuery.data, activeClassId]);

  const attendance = useMemo(() => attendanceQuery.data || [], [attendanceQuery.data]);
  const grades = useMemo(() => gradesQuery.data || [], [gradesQuery.data]);
  const gradeColumns = useMemo(() => gradeColumnsQuery.data || [], [gradeColumnsQuery.data]);
  const agendas = useMemo(() => journalsQuery.data || [], [journalsQuery.data]);
  const savings = useMemo(() => financesQuery.data || [], [financesQuery.data]);

  // Loading & Error States
  const isLoadingData =
    (classesQuery.isLoading && classes.length === 0) ||
    (Boolean(activeClassId) && studentsQuery.isLoading && students.length === 0);

  const queryError =
    classesQuery.error ||
    profileQuery.error ||
    (activeClassId ? studentsQuery.error : null);

  const dataError = queryError instanceof Error ? queryError.message : null;

  // Auto-select initial active class once classes load
  useEffect(() => {
    if (classes.length > 0) {
      if (!activeClassId) {
        const saved = UiStatePersistence.get('activeClassId', '') || teacher?.activeClassId;
        const matched = classes.find((c) => c.id === saved) || classes[0];
        if (matched) {
          setActiveClassId(matched.id);
        }
      } else {
        const exists = classes.some((c) => c.id === activeClassId);
        if (!exists) {
          setActiveClassId(classes[0].id);
        }
      }
    }
  }, [classes, activeClassId, teacher?.activeClassId]);

  // Auth initialization & session listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentSession = await getAuthSession();
        if (isMounted) {
          setSession(currentSession);
          setIsAuthChecking(false);
        }
      } catch (err: unknown) {
        console.error('Session check error:', err);
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    initAuth();

    const supabase = getSafeSupabaseClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setIsAuthChecking(false);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (newSession) {
            queryClient.invalidateQueries();
          }
        } else if (event === 'SIGNED_OUT') {
          queryClient.clear();
          SafeCache.clear();
          try {
            localStorage.removeItem('muhiba_teacher_profile');
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('pub_share_') || k.startsWith('smk_'))) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
          } catch {}
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  // Class Selection
  const handleSelectClass = (clsId: string) => {
    setActiveClassId(clsId);
    if (teacher) {
      profileMutation.saveProfile({ activeClassId: clsId }).catch(console.error);
    }
  };

  // Revalidate/Refresh data
  const loadUserData = useCallback(async (targetClassId?: string, _force = false) => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.classes(userId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      const cId = targetClassId || activeClassId;
      if (cId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.students(userId, cId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.attendance(userId, cId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.grades(userId, cId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.savings(userId, cId) });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.agendas(userId) });
    }
  }, [queryClient, userId, activeClassId]);

  // Manual Refresh
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.classes(userId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.agendas(userId) });
        if (activeClassId) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.students(userId, activeClassId) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.attendance(userId, activeClassId) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.grades(userId, activeClassId) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.savings(userId, activeClassId) });
        }
      }
      setRefreshSuccessToast('Data diperbarui dari cloud Supabase');
      setTimeout(() => setRefreshSuccessToast(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi error';
      alert(`Gagal memuat ulang data: ${msg}`);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Profile Save
  const handleSaveTeacherProfile = async (formData: TeacherProfile): Promise<void> => {
    try {
      await profileMutation.saveProfile(formData);
    } catch (err: unknown) {
      console.error('Failed to save teacher profile:', err);
      throw err;
    }
  };

  // Classes Handlers
  const handleSaveClass = async (cls: ClassRoom) => {
    const exists = classes.some((c) => c.id === cls.id);
    let result: ClassRoom;
    if (exists) {
      result = await classMutations.updateClass(cls);
    } else {
      result = await classMutations.createClass(cls);
      if (!activeClassId) {
        handleSelectClass(result.id);
      }
    }
    SafeCache.invalidate('all_classes');
  };

  const handleDeleteClass = async (clsId: string) => {
    await classMutations.deleteClass(clsId);
    SafeCache.invalidate(`class_data_${clsId}`);
    SafeCache.invalidate('all_classes');

    if (activeClassId === clsId) {
      const remaining = classes.filter((c) => c.id !== clsId);
      if (remaining.length > 0) {
        handleSelectClass(remaining[0].id);
      } else {
        setActiveClassId('');
      }
    }
  };

  // Students Handlers
  const handleSaveStudent = async (std: Student) => {
    const targetClassId = std.classId;
    const exists = students.some((s) => s.id === std.id);

    const savedTarget: Student = { ...std };
    if (exists) {
      await studentMutations.updateStudent(savedTarget);
    } else {
      await studentMutations.createStudent(savedTarget);
    }

    if (activeClassId) {
      SafeCache.invalidate(`class_data_${activeClassId}`);
      SafeCache.invalidate(`pub_share_att_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_grade_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_sav_share_${activeClassId}`);
    }
  };

  const handleDeleteStudent = async (stdId: string) => {
    const deletedStd = students.find((s) => s.id === stdId);
    const targetClassId = deletedStd?.classId || activeClassId;

    await studentMutations.deleteStudent({ studentId: stdId, targetClassId });

    if (activeClassId) {
      SafeCache.invalidate(`class_data_${activeClassId}`);
      SafeCache.invalidate(`pub_share_att_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_grade_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_sav_share_${activeClassId}`);
    }
  };

  const handleBatchAddStudents = async (newStds: Student[]) => {
    if (!newStds || newStds.length === 0) return;
    const targetClassId = newStds[0].classId || activeClassId;

    await studentMutations.batchInsertStudents(newStds);

    if (activeClassId) {
      SafeCache.invalidate(`class_data_${activeClassId}`);
      SafeCache.invalidate(`pub_share_att_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_grade_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_sav_share_${activeClassId}`);
    }
  };

  // Attendance Handlers
  const handleSaveAttendance = async (sessionData: AttendanceSession) => {
    const saved = await attendanceMutations.saveSession(sessionData);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === sessionData.classId);
    const clsStudents = students.filter((s) => s.classId === sessionData.classId);
    const updatedSessions = [saved, ...attendance.filter((s) => s.id !== saved.id)];

    // Sync to Public Share in Background
    syncPublicAttendanceShare({
      classRoom: cls,
      students: clsStudents,
      sessions: updatedSessions,
      teacher: teacher || undefined,
    }).catch((err: unknown) => console.warn('Sync public attendance notice:', err));

    // Auto-sync into Teaching Agenda
    try {
      const syncedAgenda = await syncAttendanceSessionToAgenda(
        saved,
        cls,
        teacher || undefined,
        clsStudents
      );
      if (syncedAgenda) {
        if (userId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.agendas(userId) });
        }
        syncPublicAgendasShare({
          agendas: [syncedAgenda, ...agendas.filter((a) => a.id !== syncedAgenda.id)],
          classRoom: cls,
          teacher: teacher || undefined,
        }).catch(() => {});
      }
    } catch (syncErr: unknown) {
      console.warn('Sinkronisasi otomatis agenda mengajar notice:', syncErr);
    }
  };

  const handleDeleteAttendance = async (sessionId: string) => {
    await attendanceMutations.deleteSession({ sessionId, targetClassId: activeClassId });
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    const clsStudents = students.filter((s) => s.classId === activeClassId);
    const updatedSessions = attendance.filter((s) => s.id !== sessionId);

    syncPublicAttendanceShare({
      classRoom: cls,
      students: clsStudents,
      sessions: updatedSessions,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  // Grades Handlers
  const handleSaveGrade = async (gradeData: StudentGrade) => {
    const saved = await gradesMutations.saveGrade(gradeData);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === gradeData.classId);
    let clsStudents = students.filter((s) => s.classId === gradeData.classId);
    const updatedGrades = [saved, ...grades.filter((g) => g.id !== saved.id)];

    syncPublicGradesShare({
      classRoom: cls,
      students: clsStudents,
      grades: updatedGrades,
      gradeColumns,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleSaveGradeCols = async (cols: GradeColumn[]) => {
    if (!activeClassId) return;
    await gradesMutations.saveGradeColumns({ columns: cols, targetClassId: activeClassId });
    SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    const clsStudents = students.filter((s) => s.classId === activeClassId);

    syncPublicGradesShare({
      classRoom: cls,
      students: clsStudents,
      grades,
      gradeColumns: cols,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  // Agendas Handlers
  const handleSaveAgenda = async (agendaData: TeachingAgenda) => {
    const saved = await journalsMutations.saveAgenda(agendaData);
    SafeCache.invalidate('all_agendas');

    const cls = classes.find((c) => c.id === agendaData.classId);
    const updatedAgendas = [saved, ...agendas.filter((a) => a.id !== saved.id)];
    syncPublicAgendasShare({
      agendas: updatedAgendas,
      classRoom: cls,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleBatchSaveAgendas = async (newAgendas: TeachingAgenda[]) => {
    await journalsMutations.batchSaveAgendas(newAgendas);
    SafeCache.invalidate('all_agendas');
    syncPublicAgendasShare({
      agendas: newAgendas,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    await journalsMutations.deleteAgenda(agendaId);
    SafeCache.invalidate('all_agendas');

    const updatedAgendas = agendas.filter((a) => a.id !== agendaId);
    syncPublicAgendasShare({
      agendas: updatedAgendas,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  // Savings Handlers
  const handleSaveSaving = async (txData: SavingTransaction) => {
    const saved = await financesMutations.saveTransaction(txData);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === txData.classId);
    const clsStudents = students.filter((s) => s.classId === txData.classId);
    const updatedSavings = [saved, ...savings.filter((s) => s.id !== saved.id)];

    syncPublicSavingsShare({
      classRoom: cls,
      students: clsStudents,
      transactions: updatedSavings,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleDeleteSaving = async (txId: string) => {
    await financesMutations.deleteTransaction({ txId, targetClassId: activeClassId });
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    const clsStudents = students.filter((s) => s.classId === activeClassId);
    const updatedSavings = savings.filter((s) => s.id !== txId);

    syncPublicSavingsShare({
      classRoom: cls,
      students: clsStudents,
      transactions: updatedSavings,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  // Download backup
  const handleDownloadBackup = () => {
    const jsonStr = exportDataToJsonBackup({
      teacher,
      classes,
      students,
      attendance,
      grades,
      gradeColumns,
      agendas,
      savings,
    });
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SMK_Muh_Bawang_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOutSupabase();
    } catch (err: unknown) {
      console.warn('Sign out notice:', err);
    }
    queryClient.clear();
    SafeCache.clear();

    try {
      if (typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('smk_saved_login_email');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            key !== 'smk_saved_login_email' &&
            (key.startsWith('smk_') ||
              key.startsWith('muhiba_') ||
              key.startsWith('cache_') ||
              key.startsWith('ui_') ||
              key.startsWith('pub_share_'))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        if (savedEmail) {
          localStorage.setItem('smk_saved_login_email', savedEmail);
        }
      }
    } catch (clearErr: unknown) {
      console.warn('Clear localStorage error on logout:', clearErr);
    }

    setSession(null);
  };

  // Resolved Active Class & Active Teacher
  const activeClass: ClassRoom = useMemo(() => {
    const found = classes.find((c) => c.id === activeClassId);
    if (found) return found;
    return {
      id: activeClassId || (classes[0]?.id ?? 'empty_cls'),
      namaKelas: classes[0]?.namaKelas || 'Belum Ada Kelas',
      mataPelajaran: classes[0]?.mataPelajaran || 'Silakan Buat Kelas',
      kkm: 75,
      jurusan: 'TKJ',
      createdAt: new Date().toISOString(),
    };
  }, [classes, activeClassId]);

  const activeTeacher: TeacherProfile = useMemo(() => {
    if (teacher) return teacher;
    return {
      id: session?.user?.id || 'guru_offline_id',
      namaGuru: session?.user?.user_metadata?.nama_guru || 'Guru SMK Muhammadiyah Bawang',
      nip: '',
      nbm: '',
      namaSekolah: 'SMK Muhammadiyah Bawang',
      mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
      tahunAjaran: '2025/2026',
      semester: 'Genap',
      email: session?.user?.email || 'guru@smkmuhbawang.sch.id',
      isLoggedIn: true,
    };
  }, [teacher, session]);

  return {
    session,
    isAuthChecking,
    userId,
    activeTab,
    setActiveTab,
    activeClassId,
    setActiveClassId,
    activeClass,
    activeTeacher,
    classes,
    students,
    attendance,
    grades,
    gradeColumns,
    agendas,
    savings,
    isLoadingData,
    isManualRefreshing,
    refreshSuccessToast,
    dataError,
    loadUserData,
    handleSelectClass,
    handleManualRefresh,
    handleSaveTeacherProfile,
    handleSaveClass,
    handleDeleteClass,
    handleSaveStudent,
    handleDeleteStudent,
    handleBatchAddStudents,
    handleSaveAttendance,
    handleDeleteAttendance,
    handleSaveGrade,
    handleSaveGradeCols,
    handleSaveAgenda,
    handleBatchSaveAgendas,
    handleDeleteAgenda,
    handleSaveSaving,
    handleDeleteSaving,
    handleDownloadBackup,
    handleLogout,
  };
}
