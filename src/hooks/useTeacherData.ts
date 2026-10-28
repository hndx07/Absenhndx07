import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAuthSession,
  getSafeSupabaseClient,
  signOutSupabase,
} from '../services/supabase';
import {
  getTeacherProfile,
  createOrUpdateTeacherProfile,
  getClasses,
  getStudents,
  getAttendanceSessions,
  getStudentGrades,
  getGradeColumns,
  getTeachingAgendas,
  getSavingTransactions,
  syncAttendanceSessionToAgenda,
  syncPublicAttendanceShare,
  syncPublicGradesShare,
  syncPublicAgendasShare,
  syncPublicSavingsShare,
  getExistingShareIdsForClass,
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
  const [session, setSession] = useState<any>(null);
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

  // 3. UI states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshSuccessToast, setRefreshSuccessToast] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // 4. Local reactive state mirrors for immediate responsiveness
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [gradeColumns, setGradeColumns] = useState<GradeColumn[]>([]);
  const [agendas, setAgendas] = useState<TeachingAgenda[]>([]);
  const [savings, setSavings] = useState<SavingTransaction[]>([]);

  // 5. TanStack Queries with Lazy Loading Strategy:
  // - Profile & Classes: Loaded at startup
  const profileQuery = useTeacherProfileQuery({
    userId,
    enabled: Boolean(session),
  });

  const classesQuery = useClassesQuery({
    userId,
    enabled: Boolean(session),
  });

  // - Students: Loaded when activeClassId is selected
  const studentsQuery = useStudentsQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId),
  });

  // - Attendance: Lazy loaded when tab is relevant
  const isAttendanceTabActive = ['attendance', 'recap', 'agendas', 'statistics', 'parent_report'].includes(activeTab);
  const attendanceQuery = useAttendanceQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isAttendanceTabActive),
  });

  // - Grades & Grade Columns: Lazy loaded when tab is relevant
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

  // - Agendas/Journals: Lazy loaded when tab is relevant
  const isAgendasTabActive = ['agendas', 'attendance'].includes(activeTab);
  const journalsQuery = useJournalsQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && isAgendasTabActive),
  });

  // - Finances/Savings: Lazy loaded when tab is relevant
  const isSavingsTabActive = ['savings', 'statistics'].includes(activeTab);
  const financesQuery = useFinancesQuery({
    userId,
    classId: activeClassId,
    enabled: Boolean(session && activeClassId && isSavingsTabActive),
  });

  // Mutations
  const profileMutation = useTeacherProfileMutation(userId);
  const classMutations = useClassMutations(userId);
  const studentMutations = useStudentMutations(userId, activeClassId);
  const attendanceMutations = useAttendanceMutations(userId, activeClassId);
  const gradesMutations = useGradesMutations(userId, activeClassId);
  const journalsMutations = useJournalsMutations(userId);
  const financesMutations = useFinancesMutations(userId, activeClassId);

  // Sync Query Data to Reactive State
  useEffect(() => {
    if (profileQuery.data) {
      setTeacher(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (classesQuery.data && classesQuery.data.length > 0) {
      setClasses(classesQuery.data);
      if (!activeClassId) {
        const saved = UiStatePersistence.get('activeClassId', '') || teacher?.activeClassId;
        const matched = classesQuery.data.find((c) => c.id === saved) || classesQuery.data[0];
        if (matched) {
          setActiveClassId(matched.id);
        }
      }
    }
  }, [classesQuery.data, activeClassId, teacher?.activeClassId]);

  useEffect(() => {
    if (studentsQuery.data && studentsQuery.data.length > 0) {
      const sequenced = resequenceStudentsAlphabetically(studentsQuery.data, activeClassId);
      setStudents(sequenced);
    }
  }, [studentsQuery.data, activeClassId]);

  useEffect(() => {
    if (attendanceQuery.data) {
      setAttendance(attendanceQuery.data);
    }
  }, [attendanceQuery.data]);

  useEffect(() => {
    if (gradesQuery.data) {
      setGrades(gradesQuery.data);
    }
  }, [gradesQuery.data]);

  useEffect(() => {
    if (gradeColumnsQuery.data) {
      setGradeColumns(gradeColumnsQuery.data);
    }
  }, [gradeColumnsQuery.data]);

  useEffect(() => {
    if (journalsQuery.data) {
      setAgendas(journalsQuery.data);
    }
  }, [journalsQuery.data]);

  useEffect(() => {
    if (financesQuery.data) {
      setSavings(financesQuery.data);
    }
  }, [financesQuery.data]);

  // Comprehensive Cache-First + Background Revalidation loader
  const loadUserData = useCallback(async (targetClassId?: string, force = false) => {
    setDataError(null);

    const cachedTeacher = !force ? SafeCache.get<TeacherProfile>('teacher_profile') : null;
    const cachedClasses = !force ? SafeCache.get<ClassRoom[]>('all_classes') : null;
    const cachedAgendas = !force ? SafeCache.get<TeachingAgenda[]>('all_agendas') : null;

    if (cachedTeacher) setTeacher(cachedTeacher);
    if (cachedClasses && cachedClasses.length > 0) setClasses(cachedClasses);
    if (cachedAgendas) setAgendas(cachedAgendas);

    let currentClassId = targetClassId || activeClassId || cachedTeacher?.activeClassId || '';
    if (!currentClassId && cachedClasses && cachedClasses.length > 0) {
      currentClassId = cachedClasses[0].id;
    }
    if (currentClassId && currentClassId !== activeClassId) {
      setActiveClassId(currentClassId);
    }

    const cachedClassData =
      !force && currentClassId ? SafeCache.get<any>(`class_data_${currentClassId}`) : null;

    if (cachedClassData) {
      setStudents(cachedClassData.students || []);
      setAttendance(cachedClassData.attendance || []);
      setGrades(cachedClassData.grades || []);
      setGradeColumns(cachedClassData.gradeColumns || []);
      setSavings(cachedClassData.savings || []);
    }

    if (!force && cachedTeacher && cachedClasses && cachedAgendas && (cachedClassData || !currentClassId)) {
      return;
    }

    setIsLoadingData(true);

    try {
      let profile = await getTeacherProfile(force);
      if (!profile) {
        profile = await createOrUpdateTeacherProfile({
          namaGuru: 'Guru SMK Muhammadiyah Bawang',
          namaSekolah: 'SMK Muhammadiyah Bawang',
          mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
          tahunAjaran: '2025/2026',
          semester: 'Genap',
        });
      }
      setTeacher(profile);
      SafeCache.set('teacher_profile', profile);

      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
      SafeCache.set('all_classes', loadedClasses);

      if (!currentClassId && profile.activeClassId) {
        currentClassId = profile.activeClassId;
      }
      if (!currentClassId && loadedClasses.length > 0) {
        currentClassId = loadedClasses[0].id;
      }
      if (currentClassId && currentClassId !== activeClassId) {
        setActiveClassId(currentClassId);
      }

      const loadedAgendas = await getTeachingAgendas();
      setAgendas(loadedAgendas);
      SafeCache.set('all_agendas', loadedAgendas);

      if (currentClassId) {
        const [
          loadedStudents,
          loadedAttendance,
          loadedGrades,
          loadedGradeCols,
          loadedSavings,
        ] = await Promise.all([
          getStudents(currentClassId),
          getAttendanceSessions(currentClassId),
          getStudentGrades(currentClassId),
          getGradeColumns(currentClassId),
          getSavingTransactions(currentClassId),
        ]);

        const sequencedStudents = resequenceStudentsAlphabetically(loadedStudents, currentClassId);
        setStudents(sequencedStudents);
        setAttendance(loadedAttendance);
        setGrades(loadedGrades);
        setGradeColumns(loadedGradeCols);
        setSavings(loadedSavings);

        SafeCache.set(`class_data_${currentClassId}`, {
          students: sequencedStudents,
          attendance: loadedAttendance,
          grades: loadedGrades,
          gradeColumns: loadedGradeCols,
          savings: loadedSavings,
        });

        // Sync to Public Shares if authorized
        const activeClsObj = loadedClasses.find((c) => c.id === currentClassId);
        if (activeClsObj) {
          getExistingShareIdsForClass(currentClassId).then((existingShareIds) => {
            if (existingShareIds.has(`att_share_${currentClassId}`)) {
              syncPublicAttendanceShare({
                classRoom: activeClsObj,
                students: sequencedStudents,
                sessions: loadedAttendance,
                teacher: profile || undefined,
              }).catch(() => {});
            }

            if (
              existingShareIds.has(`grade_share_${currentClassId}`) ||
              existingShareIds.has(`nilai_share_${currentClassId}`)
            ) {
              syncPublicGradesShare({
                classRoom: activeClsObj,
                students: sequencedStudents,
                grades: loadedGrades,
                gradeColumns: loadedGradeCols,
                teacher: profile || undefined,
              }).catch(() => {});
            }

            if (
              existingShareIds.has(`sav_share_${currentClassId}`) ||
              existingShareIds.has(`tabungan_share_${currentClassId}`)
            ) {
              syncPublicSavingsShare({
                classRoom: activeClsObj,
                students: sequencedStudents,
                transactions: loadedSavings,
                teacher: profile || undefined,
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Error loading data from Supabase:', err);
      setDataError(
        err?.message ||
          'Tidak dapat terhubung ke server PostgreSQL Supabase. Periksa koneksi internet Anda.'
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [activeClassId]);

  // Auth initialization
  const loadUserDataRef = useRef(loadUserData);
  loadUserDataRef.current = loadUserData;

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentSession = await getAuthSession();
        if (isMounted) {
          setSession(currentSession);
          setIsAuthChecking(false);
          if (currentSession) {
            loadUserDataRef.current();
          }
        }
      } catch (err) {
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
            loadUserDataRef.current();
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
          setTeacher(null);
          setClasses([]);
          setStudents([]);
          setAttendance([]);
          setGrades([]);
          setAgendas([]);
          setSavings([]);
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
  const handleSelectClass = async (clsId: string) => {
    setActiveClassId(clsId);
    if (teacher) {
      const updated = { ...teacher, activeClassId: clsId };
      setTeacher(updated);
      createOrUpdateTeacherProfile({ activeClassId: clsId }).catch(console.error);
    }

    const cached = SafeCache.get<any>(`class_data_${clsId}`);
    if (cached) {
      setStudents(cached.students || []);
      setAttendance(cached.attendance || []);
      setGrades(cached.grades || []);
      setGradeColumns(cached.gradeColumns || []);
      setSavings(cached.savings || []);
      return;
    }

    setIsLoadingData(true);
    try {
      const [
        loadedStudents,
        loadedAttendance,
        loadedGrades,
        loadedGradeCols,
        loadedSavings,
      ] = await Promise.all([
        getStudents(clsId),
        getAttendanceSessions(clsId),
        getStudentGrades(clsId),
        getGradeColumns(clsId),
        getSavingTransactions(clsId),
      ]);

      const sequencedStudents = resequenceStudentsAlphabetically(loadedStudents, clsId);
      setStudents(sequencedStudents);
      setAttendance(loadedAttendance);
      setGrades(loadedGrades);
      setGradeColumns(loadedGradeCols);
      setSavings(loadedSavings);

      SafeCache.set(`class_data_${clsId}`, {
        students: sequencedStudents,
        attendance: loadedAttendance,
        grades: loadedGrades,
        gradeColumns: loadedGradeCols,
        savings: loadedSavings,
      });
    } catch (e: any) {
      console.error('Error switching class data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Manual Refresh
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.classes(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.agendas(userId) });
        if (activeClassId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.students(userId, activeClassId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.attendance(userId, activeClassId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.grades(userId, activeClassId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.savings(userId, activeClassId) });
        }
      }
      await loadUserData(activeClassId, true);
      setRefreshSuccessToast('Data diperbarui dari cloud Supabase');
      setTimeout(() => setRefreshSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Gagal memuat ulang data: ${err?.message || 'Koneksi error'}`);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Profile Save
  const handleSaveTeacherProfile = async (formData: TeacherProfile): Promise<void> => {
    try {
      const saved = await profileMutation.saveProfile(formData);
      const refreshed = await getTeacherProfile(true);
      const finalTeacher = refreshed || saved;
      setTeacher(finalTeacher);
      SafeCache.set('teacher_profile', finalTeacher);
      try {
        localStorage.setItem('muhiba_teacher_profile', JSON.stringify(finalTeacher));
      } catch {}
    } catch (err: any) {
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
      setClasses((prev) => prev.map((c) => (c.id === result.id ? result : c)));
    } else {
      result = await classMutations.createClass(cls);
      setClasses((prev) => [...prev, result]);
      if (!activeClassId) {
        handleSelectClass(result.id);
      }
    }
    SafeCache.invalidate('all_classes');
  };

  const handleDeleteClass = async (clsId: string) => {
    await classMutations.deleteClass(clsId);
    const updated = classes.filter((c) => c.id !== clsId);
    setClasses(updated);
    SafeCache.invalidate(`class_data_${clsId}`);
    SafeCache.invalidate('all_classes');

    if (activeClassId === clsId) {
      if (updated.length > 0) {
        handleSelectClass(updated[0].id);
      } else {
        setActiveClassId('');
        setStudents([]);
        setAttendance([]);
        setGrades([]);
      }
    }
  };

  // Students Handlers
  const handleSaveStudent = async (std: Student) => {
    const targetClassId = std.classId;
    const exists = students.some((s) => s.id === std.id);
    const updatedList = exists
      ? students.map((s) => (s.id === std.id ? std : s))
      : [...students, std];

    const resequencedAll = resequenceStudentsAlphabetically(updatedList, targetClassId);
    setStudents(resequencedAll);

    const savedTarget = resequencedAll.find((s) => s.id === std.id) || std;
    if (exists) {
      await studentMutations.updateStudent(savedTarget);
    } else {
      await studentMutations.createStudent(savedTarget);
    }

    const classOnly = resequencedAll.filter((s) => s.classId === targetClassId);
    try {
      await studentMutations.batchInsertStudents(classOnly);
    } catch (e) {
      console.warn('Sync resequence student to cloud notice:', e);
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

    const remaining = students.filter((s) => s.id !== stdId);
    const resequencedAll = resequenceStudentsAlphabetically(remaining, targetClassId);
    setStudents(resequencedAll);

    await studentMutations.deleteStudent({ studentId: stdId, targetClassId });

    const classRemaining = resequencedAll.filter((s) => s.classId === targetClassId);
    if (classRemaining.length > 0) {
      try {
        await studentMutations.batchInsertStudents(classRemaining);
      } catch (err) {
        console.warn('Batch resequence after delete notice:', err);
      }
    }

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

    const existingOther = students.filter((s) => s.classId !== targetClassId);
    const existingClass = students.filter((s) => s.classId === targetClassId);

    const updateMap = new Map<string, Student>();
    const toAdd: Student[] = [];

    newStds.forEach((std) => {
      const lowerName = std.nama.trim().toLowerCase();
      const existingMatch = existingClass.find(
        (s) => s.id === std.id || s.nama.trim().toLowerCase() === lowerName
      );
      if (existingMatch) {
        const merged: Student = {
          ...existingMatch,
          ...std,
          id: existingMatch.id,
          classId: existingMatch.classId,
          nisn: std.nisn !== undefined && std.nisn !== '' ? std.nisn : existingMatch.nisn,
          noHpOrangTua:
            std.noHpOrangTua !== undefined && std.noHpOrangTua !== ''
              ? std.noHpOrangTua
              : existingMatch.noHpOrangTua,
          catatanUmum:
            std.catatanUmum !== undefined && std.catatanUmum !== ''
              ? std.catatanUmum
              : existingMatch.catatanUmum,
          updated_at: new Date().toISOString(),
        };
        updateMap.set(existingMatch.id, merged);
      } else {
        toAdd.push(std);
      }
    });

    const mergedExistingClass = existingClass.map((s) => updateMap.get(s.id) || s);
    const combinedClass = [...mergedExistingClass, ...toAdd];

    const resequencedClass = resequenceStudentsAlphabetically(combinedClass, targetClassId)
      .filter((s) => s.classId === targetClassId);

    setStudents([...existingOther, ...resequencedClass]);

    if (activeClassId) {
      SafeCache.invalidate(`class_data_${activeClassId}`);
      SafeCache.invalidate(`pub_share_att_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_grade_share_${activeClassId}`);
      SafeCache.invalidate(`pub_share_sav_share_${activeClassId}`);
    }

    try {
      await studentMutations.batchInsertStudents(resequencedClass);
      if (activeClassId) {
        const fresh = await getStudents(activeClassId);
        if (fresh && fresh.length > 0) {
          setStudents((prev) => {
            const others = prev.filter((p) => p.classId !== activeClassId);
            return [...others, ...fresh];
          });
        }
      }
    } catch (err) {
      console.warn('Supabase batch insert notification:', err);
    }
  };

  // Attendance Handlers
  const handleSaveAttendance = async (sessionData: AttendanceSession) => {
    const saved = await attendanceMutations.saveSession(sessionData);
    const updatedSessions = [saved, ...attendance.filter((s) => s.id !== saved.id)];
    setAttendance(updatedSessions);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === sessionData.classId);
    const clsStudents = students.filter((s) => s.classId === sessionData.classId);

    syncPublicAttendanceShare({
      classRoom: cls,
      students: clsStudents,
      sessions: updatedSessions,
      teacher: teacher || undefined,
    }).catch((err) => console.warn('Sync public attendance notice:', err));

    try {
      const syncedAgenda = await syncAttendanceSessionToAgenda(
        saved,
        cls,
        teacher || undefined,
        clsStudents
      );
      if (syncedAgenda) {
        const nextAgendas = [syncedAgenda, ...agendas.filter((a) => a.id !== syncedAgenda.id)];
        setAgendas(nextAgendas);
        SafeCache.invalidate('all_agendas');
        syncPublicAgendasShare({
          agendas: nextAgendas,
          classRoom: cls,
          teacher: teacher || undefined,
        }).catch(() => {});
      }
    } catch (syncErr) {
      console.warn('Sinkronisasi otomatis agenda mengajar notice:', syncErr);
    }
  };

  const handleDeleteAttendance = async (sessionId: string) => {
    await attendanceMutations.deleteSession({ sessionId, targetClassId: activeClassId });
    const updatedSessions = attendance.filter((s) => s.id !== sessionId);
    setAttendance(updatedSessions);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    const clsStudents = students.filter((s) => s.classId === activeClassId);
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
    let updatedGrades: StudentGrade[] = [];
    setGrades((prev) => {
      updatedGrades = [saved, ...prev.filter((g) => g.id !== saved.id)];
      return updatedGrades;
    });
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === gradeData.classId);
    let clsStudents = students.filter((s) => s.classId === gradeData.classId);
    if (clsStudents.length === 0) {
      clsStudents = await getStudents(gradeData.classId).catch(() => []);
    }

    syncPublicGradesShare({
      classRoom: cls,
      students: clsStudents,
      grades: updatedGrades.length > 0 ? updatedGrades : [saved, ...grades.filter((g) => g.id !== saved.id)],
      gradeColumns,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleSaveGradeCols = async (cols: GradeColumn[]) => {
    if (!activeClassId) return;
    await gradesMutations.saveGradeColumns({ columns: cols, targetClassId: activeClassId });
    setGradeColumns(cols);
    SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    let clsStudents = students.filter((s) => s.classId === activeClassId);
    if (clsStudents.length === 0) {
      clsStudents = await getStudents(activeClassId).catch(() => []);
    }
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
    const updatedAgendas = [saved, ...agendas.filter((a) => a.id !== saved.id)];
    setAgendas(updatedAgendas);
    SafeCache.invalidate('all_agendas');

    const cls = classes.find((c) => c.id === agendaData.classId);
    syncPublicAgendasShare({
      agendas: updatedAgendas,
      classRoom: cls,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleBatchSaveAgendas = async (newAgendas: TeachingAgenda[]) => {
    await journalsMutations.batchSaveAgendas(newAgendas);
    const updatedAgendas = await getTeachingAgendas();
    setAgendas(updatedAgendas);
    SafeCache.invalidate('all_agendas');

    syncPublicAgendasShare({
      agendas: updatedAgendas,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    await journalsMutations.deleteAgenda(agendaId);
    const updatedAgendas = agendas.filter((a) => a.id !== agendaId);
    setAgendas(updatedAgendas);
    SafeCache.invalidate('all_agendas');

    syncPublicAgendasShare({
      agendas: updatedAgendas,
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  // Savings Handlers
  const handleSaveSaving = async (txData: SavingTransaction) => {
    const saved = await financesMutations.saveTransaction(txData);
    let updatedSavings: SavingTransaction[] = [];
    setSavings((prev) => {
      updatedSavings = [saved, ...prev.filter((s) => s.id !== saved.id)];
      return updatedSavings;
    });
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === txData.classId);
    let clsStudents = students.filter((s) => s.classId === txData.classId);
    if (clsStudents.length === 0 && activeClassId) {
      clsStudents = await getStudents(activeClassId).catch(() => []);
    }
    syncPublicSavingsShare({
      classRoom: cls,
      students: clsStudents,
      transactions: updatedSavings.length > 0 ? updatedSavings : [saved, ...savings.filter((s) => s.id !== saved.id)],
      teacher: teacher || undefined,
    }).catch(() => {});
  };

  const handleDeleteSaving = async (txId: string) => {
    await financesMutations.deleteTransaction({ txId, targetClassId: activeClassId });
    let updatedSavings: SavingTransaction[] = [];
    setSavings((prev) => {
      updatedSavings = prev.filter((s) => s.id !== txId);
      return updatedSavings;
    });
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);

    const cls = classes.find((c) => c.id === activeClassId);
    let clsStudents = students.filter((s) => s.classId === activeClassId);
    if (clsStudents.length === 0 && activeClassId) {
      clsStudents = await getStudents(activeClassId).catch(() => []);
    }
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
    } catch (err) {
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
    } catch (clearErr) {
      console.warn('Clear localStorage error on logout:', clearErr);
    }

    setSession(null);
    setTeacher(null);
    setClasses([]);
    setStudents([]);
    setAttendance([]);
    setGrades([]);
    setAgendas([]);
    setSavings([]);
  };

  // Resolved Active Class & Active Teacher
  const activeClass: ClassRoom = classes.find((c) => c.id === activeClassId) || {
    id: activeClassId || 'empty_cls',
    namaKelas: classes.length > 0 ? classes[0].namaKelas : 'Belum Ada Kelas',
    mataPelajaran: classes.length > 0 ? classes[0].mataPelajaran : 'Silakan Buat Kelas',
    kkm: 75,
    jurusan: 'TKJ',
    createdAt: new Date().toISOString(),
  };

  const activeTeacher: TeacherProfile = teacher || {
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
