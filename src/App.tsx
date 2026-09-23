import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Award,
  Users,
  BookMarked,
  Wallet,
  BarChart3,
  Sparkles,
  Layers,
  MessageSquare,
  MapPin,
  Cloud,
  RefreshCw,
  Settings,
  ChevronDown,
  GraduationCap,
  Bell,
  LogOut,
  ExternalLink,
} from 'lucide-react';

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

// Utils & Storage
import {
  getStoredTeacher,
  saveStoredTeacher,
  getStoredClasses,
  saveStoredClasses,
  getStoredStudents,
  saveStoredStudents,
  getStoredAttendance,
  saveStoredAttendance,
  getStoredGrades,
  saveStoredGrades,
  getStoredGradeColumns,
  saveStoredGradeColumns,
  getStoredAgendas,
  saveStoredAgendas,
  getStoredSavings,
  saveStoredSavings,
  syncAllToSupabase,
} from './utils/storage';
import { checkSupabaseConnection } from './services/supabase';

// Components
import { SchoolLogo } from './components/SchoolLogo';
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
import { ModulAjarGeneratorView } from './components/ModulAjarGeneratorView';
import { KisiKisiView } from './components/KisiKisiView';
import { ParentReportView } from './components/ParentReportView';
import { SchoolMapView } from './components/SchoolMapView';

type NavTab =
  | 'attendance'
  | 'grades'
  | 'students'
  | 'agendas'
  | 'savings'
  | 'statistics'
  | 'modul_ajar'
  | 'kisi_kisi'
  | 'parent_report'
  | 'school_map';

export default function App() {
  // 1. Check for Public Share parameters in URL
  const [publicShare, setPublicShare] = useState<{
    type: 'absen' | 'nilai' | 'tabungan';
    shareId: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('absen_share')) {
      return { type: 'absen', shareId: params.get('absen_share')! };
    }
    if (params.get('nilai_share')) {
      return { type: 'nilai', shareId: params.get('nilai_share')! };
    }
    if (params.get('tabungan_share')) {
      return { type: 'tabungan', shareId: params.get('tabungan_share')! };
    }
    return null;
  });

  // State
  const [teacher, setTeacher] = useState<TeacherProfile>(getStoredTeacher());
  const [classes, setClasses] = useState<ClassRoom[]>(getStoredClasses());
  const [students, setStudents] = useState<Student[]>(getStoredStudents());
  const [attendance, setAttendance] = useState<AttendanceSession[]>(getStoredAttendance());
  const [grades, setGrades] = useState<StudentGrade[]>(getStoredGrades());
  const [gradeColumns, setGradeColumns] = useState<GradeColumn[]>(getStoredGradeColumns());
  const [agendas, setAgendas] = useState<TeachingAgenda[]>(getStoredAgendas());
  const [savings, setSavings] = useState<SavingTransaction[]>(getStoredSavings());

  const [activeTab, setActiveTab] = useState<NavTab>('attendance');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: '',
  });

  // Active Class
  const activeClass =
    classes.find((c) => c.id === teacher.activeClassId) || classes[0] || {
      id: 'default_cls',
      namaKelas: 'X TKJ 1',
      mataPelajaran: 'Dasar Kejuruan TKJ',
      kkm: 75,
      jurusan: 'Teknik Komputer & Jaringan',
      createdAt: '2026-01-01',
    };

  // Recheck Supabase connection on mount
  useEffect(() => {
    checkSupabaseConnection().then(setCloudStatus);
  }, []);

  const refreshAllData = () => {
    setTeacher(getStoredTeacher());
    setClasses(getStoredClasses());
    setStudents(getStoredStudents());
    setAttendance(getStoredAttendance());
    setGrades(getStoredGrades());
    setGradeColumns(getStoredGradeColumns());
    setAgendas(getStoredAgendas());
    setSavings(getStoredSavings());
  };

  // Switch Active Class
  const handleSelectClass = (classId: string) => {
    const updated = { ...teacher, activeClassId: classId };
    setTeacher(updated);
    saveStoredTeacher(updated);
  };

  // Quick Cloud Sync
  const handleQuickSync = async () => {
    setIsSyncing(true);
    const res = await syncAllToSupabase();
    setIsSyncing(false);
    alert(res.message);
  };

  // Public Share Zero-Login Route
  if (publicShare) {
    return (
      <PublicSharePage
        type={publicShare.type}
        shareId={publicShare.shareId}
        onBackToApp={() => {
          // Clear query params
          window.history.replaceState({}, '', window.location.pathname);
          setPublicShare(null);
        }}
      />
    );
  }

  // Login Screen if not logged in
  if (!teacher.isLoggedIn) {
    return (
      <>
        <LoginView
          onLoginSuccess={(newProfile) => {
            const updated = {
              ...teacher,
              ...newProfile,
              isLoggedIn: true,
            };
            setTeacher(updated);
            saveStoredTeacher(updated);
          }}
          onOpenSettings={() => setIsCloudModalOpen(true)}
        />
        <CloudSupabaseModal
          isOpen={isCloudModalOpen}
          onClose={() => {
            setIsCloudModalOpen(false);
            checkSupabaseConnection().then(setCloudStatus);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* School Emblem & Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <SchoolLogo size={44} />
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
                  Sistem Presensi, Penilaian & Jurnal Guru
                </span>
              </div>
            </div>

            {/* Middle: Active Class Switcher */}
            <div className="flex items-center gap-2">
              <div className="relative">
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
            </div>

            {/* Right: Supabase Status & User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Cloud Status Pill & Sync Button */}
              <button
                onClick={handleQuickSync}
                disabled={isSyncing}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  cloudStatus.ok
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                }`}
                title="Klik untuk menyinkronkan data ke Supabase"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>
                  {isSyncing
                    ? 'Menyinkronkan...'
                    : cloudStatus.ok
                    ? 'Tersambung ke Supabase'
                    : 'Mode Browser-First'}
                </span>
              </button>

              {/* Supabase Settings Modal Trigger */}
              <button
                onClick={() => setIsCloudModalOpen(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                title="Pengaturan Supabase & SQL Schema"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Teacher Profile Avatar */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-100 transition border border-slate-200"
              >
                <div className="text-right hidden lg:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {teacher.namaGuru}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {teacher.nbm ? `NBM. ${teacher.nbm}` : teacher.nip}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {teacher.namaGuru.charAt(0)}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Subnavigation Bar (Scrollable Tabs) */}
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
                onClick={() => setActiveTab('modul_ajar')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'modul_ajar'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Prompt Modul Ajar (AI)
              </button>

              <button
                onClick={() => setActiveTab('kisi_kisi')}
                className={`px-3.5 py-2 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                  activeTab === 'kisi_kisi'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                Kisi-kisi & Soal
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
        {activeTab === 'attendance' && (
          <AttendanceView
            currentClass={activeClass}
            students={students}
            sessions={attendance}
            teacher={teacher}
            onSaveSession={(sess) => {
              const updated = [sess, ...attendance.filter((s) => s.id !== sess.id)];
              setAttendance(updated);
              saveStoredAttendance(updated);
            }}
            onDeleteSession={(sessionId) => {
              const updated = attendance.filter((s) => s.id !== sessionId);
              setAttendance(updated);
              saveStoredAttendance(updated);
            }}
          />
        )}

        {activeTab === 'grades' && (
          <GradesView
            currentClass={activeClass}
            students={students}
            grades={grades}
            gradeColumns={gradeColumns}
            teacher={teacher}
            onSaveGrade={(g) => {
              const updated = [g, ...grades.filter((item) => item.id !== g.id)];
              setGrades(updated);
              saveStoredGrades(updated);
            }}
            onSaveGradeColumns={(cols) => {
              setGradeColumns(cols);
              saveStoredGradeColumns(cols);
            }}
          />
        )}

        {activeTab === 'students' && (
          <StudentManagementView
            currentClass={activeClass}
            students={students}
            onSaveStudent={(std) => {
              const updated = [std, ...students.filter((s) => s.id !== std.id)];
              setStudents(updated);
              saveStoredStudents(updated);
            }}
            onDeleteStudent={(stdId) => {
              const updated = students.filter((s) => s.id !== stdId);
              setStudents(updated);
              saveStoredStudents(updated);
            }}
            onBatchAddStudents={(newStds) => {
              const updated = [...students, ...newStds];
              setStudents(updated);
              saveStoredStudents(updated);
            }}
          />
        )}

        {activeTab === 'agendas' && (
          <TeachingAgendaView
            currentClass={activeClass}
            agendas={agendas}
            teacher={teacher}
            onSaveAgenda={(ag) => {
              const updated = [ag, ...agendas.filter((item) => item.id !== ag.id)];
              setAgendas(updated);
              saveStoredAgendas(updated);
            }}
            onDeleteAgenda={(agId) => {
              const updated = agendas.filter((item) => item.id !== agId);
              setAgendas(updated);
              saveStoredAgendas(updated);
            }}
          />
        )}

        {activeTab === 'savings' && (
          <SavingsView
            currentClass={activeClass}
            students={students}
            savings={savings}
            teacher={teacher}
            onSaveTransaction={(tx) => {
              const updated = [tx, ...savings.filter((s) => s.id !== tx.id)];
              setSavings(updated);
              saveStoredSavings(updated);
            }}
            onDeleteTransaction={(txId) => {
              const updated = savings.filter((s) => s.id !== txId);
              setSavings(updated);
              saveStoredSavings(updated);
            }}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsView
            currentClass={activeClass}
            students={students}
            sessions={attendance}
            grades={grades}
            teacher={teacher}
          />
        )}

        {activeTab === 'modul_ajar' && (
          <ModulAjarGeneratorView currentClass={activeClass} teacher={teacher} />
        )}

        {activeTab === 'kisi_kisi' && (
          <KisiKisiView currentClass={activeClass} teacher={teacher} />
        )}

        {activeTab === 'parent_report' && (
          <ParentReportView
            currentClass={activeClass}
            students={students}
            sessions={attendance}
            grades={grades}
            teacher={teacher}
          />
        )}

        {activeTab === 'school_map' && <SchoolMapView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-700">
            Aplikasi Presensi & Nilai Siswa &bull; SMK Muhammadiyah Bawang, Batang, Jawa Tengah
          </p>
          <p className="text-[11px] text-slate-400">
            Didukung arsitektur Browser-First + Supabase Cloud (PostgreSQL, Realtime, Google OAuth). Tahun Ajaran 2025/2026.
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
        onSaveClass={(cls) => {
          const updated = [cls, ...classes.filter((c) => c.id !== cls.id)];
          setClasses(updated);
          saveStoredClasses(updated);
          handleSelectClass(cls.id);
        }}
        onDeleteClass={(clsId) => {
          const updated = classes.filter((c) => c.id !== clsId);
          setClasses(updated);
          saveStoredClasses(updated);
          if (teacher.activeClassId === clsId && updated[0]) {
            handleSelectClass(updated[0].id);
          }
        }}
      />

      <CloudSupabaseModal
        isOpen={isCloudModalOpen}
        onClose={() => {
          setIsCloudModalOpen(false);
          checkSupabaseConnection().then(setCloudStatus);
        }}
        onSyncComplete={refreshAllData}
      />

      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        teacher={teacher}
        onUpdateTeacher={(upd) => setTeacher(upd)}
        onLogout={() => {
          const loggedOut = { ...teacher, isLoggedIn: false };
          setTeacher(loggedOut);
          saveStoredTeacher(loggedOut);
        }}
        onDataRestored={refreshAllData}
      />
    </div>
  );
}
