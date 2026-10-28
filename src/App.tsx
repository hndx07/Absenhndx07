import React, { useState, useEffect, Suspense } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './lib/queryClient';

// Types & Custom Hooks
import { NavTab } from './components/layout/types';
import { useTeacherData } from './hooks/useTeacherData';
import { getPublicShareRefFromLocation, PublicShareRef } from './utils/publicShareUrl';

// Layout Components
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppFooter } from './components/layout/AppFooter';

// UI Utility Components
import { LoginView } from './components/LoginView';
import { SmoothScrollToTop } from './components/SmoothScrollToTop';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { ExcelDownloadToast } from './components/ExcelDownloadToast';

// Lazy Loaded Domain Views & Modals (Code Splitting)
const AttendanceView = React.lazy(() =>
  import('./components/AttendanceView').then((m) => ({ default: m.AttendanceView }))
);
const PublicSharePage = React.lazy(() =>
  import('./components/PublicSharePage').then((m) => ({ default: m.PublicSharePage }))
);
const MonthlyAttendanceRecapView = React.lazy(() =>
  import('./components/MonthlyAttendanceRecapView').then((m) => ({ default: m.MonthlyAttendanceRecapView }))
);
const GradesView = React.lazy(() =>
  import('./components/GradesView').then((m) => ({ default: m.GradesView }))
);
const StudentManagementView = React.lazy(() =>
  import('./components/StudentManagementView').then((m) => ({ default: m.StudentManagementView }))
);
const TeachingAgendaView = React.lazy(() =>
  import('./components/TeachingAgendaView').then((m) => ({ default: m.TeachingAgendaView }))
);
const SavingsView = React.lazy(() =>
  import('./components/SavingsView').then((m) => ({ default: m.SavingsView }))
);
const StatisticsView = React.lazy(() =>
  import('./components/StatisticsView').then((m) => ({ default: m.StatisticsView }))
);
const ParentReportView = React.lazy(() =>
  import('./components/ParentReportView').then((m) => ({ default: m.ParentReportView }))
);
const SchoolMapView = React.lazy(() =>
  import('./components/SchoolMapView').then((m) => ({ default: m.SchoolMapView }))
);
const ClassManagementModal = React.lazy(() =>
  import('./components/ClassManagementModal').then((m) => ({ default: m.ClassManagementModal }))
);
const TeacherProfileModal = React.lazy(() =>
  import('./components/TeacherProfileModal').then((m) => ({ default: m.TeacherProfileModal }))
);

/**
 * AppContent serves strictly as an orchestrator:
 * connects global layout, tabs, modals, and reactive server-state.
 */
function AppContent() {
  // 1. Public Share Zero-Login Route Detection
  const [publicShare, setPublicShare] = useState<PublicShareRef | null>(() =>
    getPublicShareRefFromLocation()
  );

  useEffect(() => {
    const handleUrlChange = () => {
      setPublicShare(getPublicShareRefFromLocation());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // 2. Data & Business Logic via TanStack Query Orchestrator Hook
  const {
    session,
    isAuthChecking,
    activeTab,
    setActiveTab,
    activeClassId,
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
  } = useTeacherData();

  // 3. Modal & Navigation States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  // Strict Public Share Bypass (No teacher state or login requirement)
  if (publicShare) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
            <div className="flex flex-col items-center gap-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#009B62]/30 border border-emerald-400/40 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-emerald-300 animate-spin" />
              </div>
              <p className="text-sm font-semibold tracking-wide text-slate-300">
                Memuat portal publik SMK Muhammadiyah Bawang...
              </p>
            </div>
          </div>
        }
      >
        <PublicSharePage type={publicShare.type} shareId={publicShare.shareId} />
      </Suspense>
    );
  }

  // Startup Session Verification
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

  // Unauthenticated -> Login View
  if (!session) {
    return <LoginView onLoginSuccess={() => loadUserData()} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white relative">
      <ScrollProgressBar />

      {/* Top Application Header */}
      <AppHeader
        activeClass={activeClass}
        onToggleSideNav={() => setIsSideNavOpen((prev) => !prev)}
        onOpenClassModal={() => setIsClassModalOpen(true)}
      />

      {/* Mobile Sidebar Drawer */}
      {isSideNavOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setIsSideNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <AppSidebar
              isDrawer
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              activeClass={activeClass}
              onOpenClassModal={() => setIsClassModalOpen(true)}
              teacher={activeTeacher}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onLogout={handleLogout}
              onManualRefresh={handleManualRefresh}
              onDownloadBackup={handleDownloadBackup}
              isRefreshing={isManualRefreshing || isLoadingData}
              onCloseDrawer={() => setIsSideNavOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Layout: Desktop Sidebar & Tab Router */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto gap-4 items-start px-2 sm:px-4">
        {/* Desktop Sticky Sidebar */}
        <div className="hidden lg:block shrink-0">
          <AppSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activeClass={activeClass}
            onOpenClassModal={() => setIsClassModalOpen(true)}
            teacher={activeTeacher}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onLogout={handleLogout}
            onManualRefresh={handleManualRefresh}
            onDownloadBackup={handleDownloadBackup}
            isRefreshing={isManualRefreshing || isLoadingData}
          />
        </div>

        {/* Main Tab Content */}
        <main className="flex-1 min-w-0 py-6">
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
                      Anda belum memiliki kelas yang terdaftar di akun ini. Silakan buat kelas pertama Anda untuk mulai mengelola presensi dan nilai murid.
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

              <Suspense
                fallback={
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs font-semibold">Memuat tampilan...</span>
                  </div>
                }
              >
                {activeTab === 'attendance' && (
                  <AttendanceView
                    currentClass={activeClass}
                    students={students}
                    sessions={attendance}
                    teacher={activeTeacher}
                    agendas={agendas}
                    onNavigateToAgenda={() => setActiveTab('agendas')}
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
                    students={students}
                    sessions={attendance}
                    onSaveAgenda={handleSaveAgenda}
                    onDeleteAgenda={handleDeleteAgenda}
                    onBatchSaveAgendas={handleBatchSaveAgendas}
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
                    activeClass={activeClass}
                    currentClass={activeClass}
                    students={students}
                    sessions={attendance}
                    grades={grades}
                    savings={savings}
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
              </Suspense>
            </>
          )}
        </main>
      </div>

      <AppFooter />

      {/* Modals */}
      <Suspense fallback={null}>
        {isClassModalOpen && (
          <ClassManagementModal
            isOpen={isClassModalOpen}
            onClose={() => setIsClassModalOpen(false)}
            classes={classes}
            activeClassId={activeClass.id}
            onSelectClass={handleSelectClass}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
          />
        )}

        {isProfileModalOpen && (
          <TeacherProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            teacher={activeTeacher}
            onSaveTeacher={handleSaveTeacherProfile}
            onUpdateTeacher={handleSaveTeacherProfile}
            onLogout={handleLogout}
            onDataMigrated={() => loadUserData(activeClassId, true)}
            onDownloadBackup={handleDownloadBackup}
          />
        )}
      </Suspense>

      {/* Floating Notifications & Controls */}
      {refreshSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#009B62] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-100" />
          <span>{refreshSuccessToast}</span>
        </div>
      )}

      <SmoothScrollToTop showPercent threshold={200} />
      <ExcelDownloadToast />
    </div>
  );
}

/**
 * Root Application Component for Teachers.
 * Wraps teacher views with TanStack QueryClientProvider while ensuring
 * public share paths remain unburdened and independent.
 */
export default function App() {
  const [client] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      <AppContent />
    </QueryClientProvider>
  );
}
