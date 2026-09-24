import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Award,
  Users,
  BookMarked,
  Wallet,
  BarChart3,
  MessageSquare,
  MapPin,
  Cloud,
  RefreshCw,
  Settings,
  ChevronDown,
  GraduationCap,
  AlertCircle,
  LogOut,
  FileCheck,
} from 'lucide-react';

// Supabase Services
import {
  getAuthSession,
  getSafeSupabaseClient,
  signOutSupabase,
  checkSupabaseConnection,
} from './services/supabase';
import {
  getTeacherProfile,
  createOrUpdateTeacherProfile,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  batchInsertStudents,
  getAttendanceSessions,
  saveAttendanceSession,
  deleteAttendanceSession,
  getStudentGrades,
  saveStudentGrade,
  getGradeColumns,
  saveGradeColumns,
  getTeachingAgendas,
  saveTeachingAgenda,
  deleteTeachingAgenda,
  getSavingTransactions,
  saveSavingTransaction,
  deleteSavingTransaction,
} from './services/data';

// Types
import {
  TeacherProfile,
  ClassRoom,
  Student,
  AttendanceSession,
  StudentGrade,
  GradeColumn,
  TeachingAgenda,
  SavingTransaction,
} from './types';
import { UiStatePersistence, SafeCache } from './utils/storageCache';
import { exportDataToJsonBackup } from './utils/storage';

// Components
import { LoginView } from './components/LoginView';
import { ClassManagementModal } from './components/ClassManagementModal';
import { CloudSupabaseModal } from './components/CloudSupabaseModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { PublicSharePage } from './components/PublicSharePage';
import { AttendanceView } from './components/AttendanceView';
import { GradesView } from './components/GradesView';
import { StudentManagementView } from './components/StudentManagementView';
import { TeachingAgendaView } from './components/TeachingAgendaView';
import { SavingsView } from './components/SavingsView';
import { StatisticsView } from './components/StatisticsView';
import { ParentReportView } from './components/ParentReportView';
import { SchoolMapView } from './components/SchoolMapView';
import { MonthlyAttendanceRecapView } from './components/MonthlyAttendanceRecapView';
import { ThemeToggle } from './components/ThemeToggle';

type NavTab =
  | 'attendance'
  | 'recap'
  | 'grades'
  | 'students'
  | 'agendas'
  | 'savings'
  | 'statistics'
  | 'parent_report'
  | 'school_map';

function parsePublicShareFromUrl(): {
  type: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  shareId: string;
} | null {
  if (typeof window === 'undefined') return null;

  const checkParams = (params: URLSearchParams) => {
    if (params.get('nilai_share')) {
      return { type: 'nilai' as const, shareId: params.get('nilai_share')! };
    }
    if (params.get('absen_share')) {
      return { type: 'absen' as const, shareId: params.get('absen_share')! };
    }
    if (params.get('tabungan_share')) {
      return { type: 'tabungan' as const, shareId: params.get('tabungan_share')! };
    }
    if (params.get('agenda_share')) {
      return { type: 'agenda' as const, shareId: params.get('agenda_share')! };
    }
    // Generic fallback for links like ?share=... or ?share_id=...
    const genericShare = params.get('share') || params.get('share_id');
    if (genericShare) {
      let detectedType: 'absen' | 'nilai' | 'tabungan' | 'agenda' = 'nilai';
      if (genericShare.startsWith('att_') || genericShare.includes('absen')) detectedType = 'absen';
      else if (genericShare.startsWith('sav_') || genericShare.includes('tabungan')) detectedType = 'tabungan';
      else if (genericShare.startsWith('age_') || genericShare.includes('agenda')) detectedType = 'agenda';
      return { type: detectedType, shareId: genericShare };
    }
    return null;
  };

  // 1. Search in window.location.search
  const fromSearch = checkParams(new URLSearchParams(window.location.search));
  if (fromSearch) return fromSearch;

  // 2. Search in window.location.hash if present
  if (window.location.hash && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
    const fromHash = checkParams(new URLSearchParams(hashQuery));
    if (fromHash) return fromHash;
  }

  return null;
}

export default function App() {
  // 1. Check for Public Share parameters in URL (accessible without auth)
  const [publicShare, setPublicShare] = useState<{
    type: 'absen' | 'nilai' | 'tabungan' | 'agenda';
    shareId: string;
  } | null>(() => parsePublicShareFromUrl());

  // Listen for navigation or URL query updates
  useEffect(() => {
    const handleUrlChange = () => {
      const parsed = parsePublicShareFromUrl();
      if (parsed) {
        setPublicShare(parsed);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // 2. Auth Session State (Source of Truth)
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 3. Database State from Supabase
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [activeClassId, setActiveClassIdState] = useState<string>(() =>
    UiStatePersistence.get('activeClassId', '')
  );
  const setActiveClassId = (clsId: string) => {
    setActiveClassIdState(clsId);
    UiStatePersistence.set('activeClassId', clsId);
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [gradeColumns, setGradeColumns] = useState<GradeColumn[]>([]);
  const [agendas, setAgendas] = useState<TeachingAgenda[]>([]);
  const [savings, setSavings] = useState<SavingTransaction[]>([]);

  // 4. UI States with safe persistence
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<NavTab>(() =>
    UiStatePersistence.get<NavTab>('activeTab', 'attendance')
  );
  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    UiStatePersistence.set('activeTab', tab);
  };

  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load all user data from Supabase
  const loadUserData = useCallback(async (targetClassId?: string) => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      // 1. Fetch / initialize teacher profile
      let profile = await getTeacherProfile();
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

      // 2. Fetch classes (live from Supabase)
      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
      SafeCache.set('all_classes', loadedClasses);

      // Determine active class
      let currentClassId = targetClassId || activeClassId || profile.activeClassId || '';
      if (!currentClassId && loadedClasses.length > 0) {
        currentClassId = loadedClasses[0].id;
      }
      if (currentClassId) {
        setActiveClassId(currentClassId);
      }

      // 3. Fetch all teaching agendas (Decoupled from active class: User requirement 1, 2, 3)
      const loadedAgendas = await getTeachingAgendas();
      setAgendas(loadedAgendas);
      SafeCache.set('all_agendas', loadedAgendas);

      // 4. Fetch class-specific records
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

        setStudents(loadedStudents);
        setAttendance(loadedAttendance);
        setGrades(loadedGrades);
        setGradeColumns(loadedGradeCols);
        setSavings(loadedSavings);

        SafeCache.set(`class_data_${currentClassId}`, {
          students: loadedStudents,
          attendance: loadedAttendance,
          grades: loadedGrades,
          gradeColumns: loadedGradeCols,
          savings: loadedSavings,
        });
      } else {
        setStudents([]);
        setAttendance([]);
        setGrades([]);
        setGradeColumns([]);
        setSavings([]);
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

  // Check auth session on startup & subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentSession = await getAuthSession();
        if (isMounted) {
          setSession(currentSession);
          setIsAuthChecking(false);
          if (currentSession) {
            loadUserData();
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

    // Supabase Auth State Change Listener
    const supabase = getSafeSupabaseClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setIsAuthChecking(false);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          if (newSession) {
            loadUserData();
          }
        } else if (event === 'SIGNED_OUT') {
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
  }, [loadUserData]);

  // Handle active class change with cache-first and background sync
  const handleSelectClass = async (clsId: string) => {
    setActiveClassId(clsId);
    if (teacher) {
      const updated = { ...teacher, activeClassId: clsId };
      setTeacher(updated);
      createOrUpdateTeacherProfile({ activeClassId: clsId }).catch(console.error);
    }

    // Check safe cache first for instant switch without UI blocking
    const cached = SafeCache.get<any>(`class_data_${clsId}`);
    if (cached) {
      setStudents(cached.students || []);
      setAttendance(cached.attendance || []);
      setGrades(cached.grades || []);
      setGradeColumns(cached.gradeColumns || []);
      setSavings(cached.savings || []);
    } else {
      setIsLoadingData(true);
    }

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

      setStudents(loadedStudents);
      setAttendance(loadedAttendance);
      setGrades(loadedGrades);
      setGradeColumns(loadedGradeCols);
      setSavings(loadedSavings);

      SafeCache.set(`class_data_${clsId}`, {
        students: loadedStudents,
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

  // 1. Classes Handlers
  const handleSaveClass = async (cls: ClassRoom) => {
    const exists = classes.some((c) => c.id === cls.id);
    if (exists) {
      const updated = await updateClass(cls);
      setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await createClass(cls);
      setClasses((prev) => [...prev, created]);
      if (!activeClassId) {
        handleSelectClass(created.id);
      }
    }
    SafeCache.invalidate('all_classes');
  };

  const handleDeleteClass = async (clsId: string) => {
    await deleteClass(clsId);
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

  // 2. Students Handlers
  const handleSaveStudent = async (std: Student) => {
    const exists = students.some((s) => s.id === std.id);
    if (exists) {
      const updated = await updateStudent(std);
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await createStudent(std);
      setStudents((prev) => [...prev, created]);
    }
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  const handleDeleteStudent = async (stdId: string) => {
    await deleteStudent(stdId);
    setStudents((prev) => prev.filter((s) => s.id !== stdId));
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  const handleBatchAddStudents = async (newStds: Student[]) => {
    await batchInsertStudents(newStds);
    if (activeClassId) {
      const fresh = await getStudents(activeClassId);
      setStudents(fresh);
      SafeCache.invalidate(`class_data_${activeClassId}`);
    }
  };

  // 3. Attendance Handlers
  const handleSaveAttendance = async (sessionData: AttendanceSession) => {
    const saved = await saveAttendanceSession(sessionData);
    setAttendance((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  const handleDeleteAttendance = async (sessionId: string) => {
    await deleteAttendanceSession(sessionId);
    setAttendance((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  // 4. Grades Handlers
  const handleSaveGrade = async (gradeData: StudentGrade) => {
    const saved = await saveStudentGrade(gradeData);
    setGrades((prev) => [saved, ...prev.filter((g) => g.id !== saved.id)]);
    if (activeClassId) SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  const handleSaveGradeCols = async (cols: GradeColumn[]) => {
    if (!activeClassId) return;
    await saveGradeColumns(cols, activeClassId);
    setGradeColumns(cols);
    SafeCache.invalidate(`class_data_${activeClassId}`);
  };

  // 5. Teaching Agenda Handlers (Decoupled from active class)
  const handleSaveAgenda = async (agendaData: TeachingAgenda) => {
    const saved = await saveTeachingAgenda(agendaData);
    setAgendas((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
    SafeCache.invalidate('all_agendas');
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    await deleteTeachingAgenda(agendaId);
    setAgendas((prev) => prev.filter((a) => a.id !== agendaId));
    SafeCache.invalidate('all_agendas');
  };

  // 6. Savings Handlers
  const handleSaveSaving = async (txData: SavingTransaction) => {
    const saved = await saveSavingTransaction(txData);
    setSavings((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
  };

  const handleDeleteSaving = async (txId: string) => {
    await deleteSavingTransaction(txId);
    setSavings((prev) => prev.filter((s) => s.id !== txId));
  };

  // Download JSON backup
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

  // Public Share Zero-Login Route
  if (publicShare) {
    return (
      <PublicSharePage
        type={publicShare.type}
        shareId={publicShare.shareId}
      />
    );
  }

  // Loading Session on startup
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-indigo-300 animate-spin" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Memeriksa sesi Supabase Auth...
          </p>
        </div>
      </div>
    );
  }

  // Not Logged In -> Login Screen (Supabase Auth Only)
  if (!session) {
    return (
      <LoginView
        onLoginSuccess={() => loadUserData()}
      />
    );
  }

  // Active Class Entity
  const activeClass: ClassRoom = classes.find((c) => c.id === activeClassId) || {
    id: activeClassId || 'empty_cls',
    namaKelas: classes.length > 0 ? classes[0].namaKelas : 'Belum Ada Kelas',
    mataPelajaran: classes.length > 0 ? classes[0].mataPelajaran : 'Silakan Buat Kelas',
    kkm: 75,
    jurusan: 'TKJ',
    createdAt: new Date().toISOString(),
  };

  const activeTeacher: TeacherProfile = teacher || {
    id: session.user.id,
    namaGuru: session.user.user_metadata?.nama_guru || 'Guru SMK Muhammadiyah Bawang',
    nip: '',
    nbm: '',
    namaSekolah: 'SMK Muhammadiyah Bawang',
    mataPelajaranUtama: 'Konsentrasi Keahlian TKJ',
    tahunAjaran: '2025/2026',
    semester: 'Genap',
    email: session.user.email,
    isLoggedIn: true,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="hidden md:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base">
                    SMK Muhammadiyah Bawang
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                    2026
                  </span>
                </div>
                <span className="text-xs text-indigo-600 font-medium">
                  Sistem Presensi, Penilaian & Jurnal Guru (Supabase Cloud)
                </span>
              </div>
            </div>

            {/* Active Class Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsClassModalOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs sm:text-sm font-bold transition border border-indigo-200/60 shadow-xs"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  Kelas: {activeClass.namaKelas}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            </div>

            {/* Controls, Theme Toggle & Teacher Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />

              <button
                onClick={() => setIsCloudModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                title="Tersambung ke Cloud PostgreSQL Supabase"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud PostgreSQL</span>
              </button>

              <button
                onClick={() => setIsCloudModalOpen(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                title="Status Supabase"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-100 transition border border-slate-200"
              >
                <div className="text-right hidden lg:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {activeTeacher.namaGuru}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeTeacher.email}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {activeTeacher.namaGuru.charAt(0)}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Subnavigation Bar */}
        <div className="border-t border-slate-200/80 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none text-xs font-semibold">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                Presensi Siswa
              </button>

              <button
                onClick={() => setActiveTab('recap')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'recap'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Rekap Absensi
              </button>

              <button
                onClick={() => setActiveTab('grades')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'grades'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                Penilaian & KKM
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'students'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Data Peserta Didik
              </button>

              <button
                onClick={() => setActiveTab('agendas')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'agendas'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <BookMarked className="w-4 h-4" />
                Buku Jurnal Guru
              </button>

              <button
                onClick={() => setActiveTab('savings')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'savings'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Tabungan & Kas
              </button>

              <button
                onClick={() => setActiveTab('statistics')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'statistics'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Statistik & Resume
              </button>

              <button
                onClick={() => setActiveTab('parent_report')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'parent_report'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Laporan WhatsApp Wali
              </button>

              <button
                onClick={() => setActiveTab('school_map')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'school_map'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Peta Kampus
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Error state if Supabase connection fails */}
        {dataError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Gagal memuat data dari Supabase</p>
                <p className="text-slate-600">{dataError}</p>
              </div>
            </div>
            <button
              onClick={() => loadUserData(activeClassId)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading Spinner for data fetching */}
        {isLoadingData && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="text-xs font-semibold">Mengambil data dari PostgreSQL Supabase...</span>
          </div>
        )}

        {!isLoadingData && (
          <>
            {classes.length === 0 && (
              <div className="mb-6 p-6 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base">Selamat Datang di Sistem Absensi & Nilai!</h3>
                  <p className="text-xs text-indigo-700 mt-1">
                    Anda belum memiliki kelas yang terdaftar di akun ini. Silakan buat kelas pertama Anda untuk mulai mengelola presensi dan nilai siswa.
                  </p>
                </div>
                <button
                  onClick={() => setIsClassModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shrink-0 shadow-md"
                >
                  + Tambah Kelas Pertama
                </button>
              </div>
            )}

            {activeTab === 'attendance' && (
              <AttendanceView
                currentClass={activeClass}
                students={students}
                sessions={attendance}
                teacher={activeTeacher}
                onSaveSession={handleSaveAttendance}
                onDeleteSession={handleDeleteAttendance}
              />
            )}

            {activeTab === 'recap' && (
              <MonthlyAttendanceRecapView
                currentClass={activeClass}
                classes={classes}
                students={students}
                sessions={attendance}
                teacher={activeTeacher}
              />
            )}

            {activeTab === 'grades' && (
              <GradesView
                currentClass={activeClass}
                students={students}
                grades={grades}
                gradeColumns={gradeColumns}
                teacher={activeTeacher}
                onSaveGrade={handleSaveGrade}
                onSaveGradeColumns={handleSaveGradeCols}
              />
            )}

            {activeTab === 'students' && (
              <StudentManagementView
                currentClass={activeClass}
                students={students}
                teacher={activeTeacher}
                classes={classes}
                onSaveStudent={handleSaveStudent}
                onDeleteStudent={handleDeleteStudent}
                onBatchAddStudents={handleBatchAddStudents}
              />
            )}

            {activeTab === 'agendas' && (
              <TeachingAgendaView
                classes={classes}
                agendas={agendas}
                teacher={activeTeacher}
                currentClass={activeClass}
                onSaveAgenda={handleSaveAgenda}
                onDeleteAgenda={handleDeleteAgenda}
              />
            )}

            {activeTab === 'savings' && (
              <SavingsView
                currentClass={activeClass}
                students={students}
                savings={savings}
                teacher={activeTeacher}
                onSaveTransaction={handleSaveSaving}
                onDeleteTransaction={handleDeleteSaving}
              />
            )}

            {activeTab === 'statistics' && (
              <StatisticsView
                currentClass={activeClass}
                students={students}
                sessions={attendance}
                grades={grades}
                teacher={activeTeacher}
              />
            )}

            {activeTab === 'parent_report' && (
              <ParentReportView
                currentClass={activeClass}
                students={students}
                sessions={attendance}
                grades={grades}
                teacher={activeTeacher}
              />
            )}

            {activeTab === 'school_map' && <SchoolMapView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Aplikasi Presensi & Nilai Siswa &bull; SMK Muhammadiyah Bawang, Batang, Jawa Tengah &bull; developed by @hndx07
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Didukung Backend 100% PostgreSQL & Auth Supabase dengan Row Level Security. Tahun Ajaran 2025/2026.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ClassManagementModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={classes}
        activeClassId={activeClass.id}
        onSelectClass={handleSelectClass}
        onSaveClass={handleSaveClass}
        onDeleteClass={handleDeleteClass}
      />

      <CloudSupabaseModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onSyncComplete={() => loadUserData(activeClassId)}
      />

      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        teacher={activeTeacher}
        onUpdateTeacher={(upd) => setTeacher(upd)}
        onLogout={() => {
          signOutSupabase();
          setSession(null);
        }}
        onDataMigrated={() => loadUserData(activeClassId)}
        onDownloadBackup={handleDownloadBackup}
      />
    </div>
  );
}
