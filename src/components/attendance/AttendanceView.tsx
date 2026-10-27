import React from 'react';
import { AttendanceViewProps } from './types';
import { useAttendanceViewState } from './hooks/useAttendanceViewState';
import { AttendanceHeader } from './AttendanceHeader';
import { AttendanceSessionSelector } from './AttendanceSessionSelector';
import { AttendanceSessionCard } from './AttendanceSessionCard';
import { AttendanceWaPreviewCard } from './AttendanceWaPreviewCard';
import { AttendanceStudentTable } from './AttendanceStudentTable';
import { AttendanceCreateModal } from './AttendanceCreateModal';
import { AttendanceEditModal } from './AttendanceEditModal';
import { AttendanceShareModal } from './AttendanceShareModal';
import { AttendanceWaModal } from './AttendanceWaModal';
import { AttendanceFloatingSave } from './AttendanceFloatingSave';

export const AttendanceView: React.FC<AttendanceViewProps> = (props) => {
  const {
    classStudents,
    classSessions,
    setActiveSessionId,
    currentSession,
    syncedAgenda,
    isMeetingsPanelOpen,
    setIsMeetingsPanelOpen,
    isNewModalOpen,
    setIsNewModalOpen,
    newSelectedPeriods,
    isNewTimeSectionExpanded,
    setIsNewTimeSectionExpanded,
    isNewPeriodsExpanded,
    setIsNewPeriodsExpanded,
    newSessionData,
    setNewSessionData,
    editingSessionData,
    setEditingSessionData,
    isEditModalOpen,
    setIsEditModalOpen,
    editSelectedPeriods,
    isEditTimeSectionExpanded,
    setIsEditTimeSectionExpanded,
    isEditPeriodsExpanded,
    setIsEditPeriodsExpanded,
    filterQuery,
    setFilterQuery,
    sortOrder,
    setSortOrder,
    shareModalOpen,
    setShareModalOpen,
    shareQrUrl,
    shareLink,
    copiedLink,
    isWaReportModalOpen,
    setIsWaReportModalOpen,
    waReportMode,
    setWaReportMode,
    selectedStudentForWa,
    setSelectedStudentForWa,
    waReportText,
    setWaReportText,
    waCopied,
    isWaPreviewExpanded,
    setIsWaPreviewExpanded,
    waInlineCopied,
    setWaInlineCopied,
    isSavingToCloud,
    lastSavedTime,
    hasUnsavedChanges,
    saveSuccessMsg,
    countH,
    countS,
    countI,
    countA,
    countD,
    attendanceRate,
    filteredStudents,
    handleSaveToCloud,
    handleUpdateRecord,
    handleSetAllPresent,
    handleOpenCreateSessionModal,
    handleStartTimeChangeNew,
    handleEndTimeChangeNew,
    isPeriodActiveNew,
    handleQuickSelectPeriodsNew,
    handleTogglePeriodNew,
    handleCreateSession,
    handleStartEditSession,
    handleStartTimeChangeEdit,
    handleEndTimeChangeEdit,
    isPeriodActiveEdit,
    handleQuickSelectPeriodsEdit,
    handleTogglePeriodEdit,
    handleSaveEditedSession,
    handleDeleteSessionConfirm,
    generateGroupWaReportText,
    generatePersonalWaReportText,
    handleOpenWaReport,
    handleCopyWaReport,
    handleSendToWhatsApp,
    handleOpenShare,
    copyShareLink,
    handleExportExcel,
    handleExportPdf,
  } = useAttendanceViewState(props);

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Session Switcher */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <AttendanceHeader
          currentClass={props.currentClass}
          teacher={props.teacher}
          currentSession={currentSession}
          isSavingToCloud={isSavingToCloud}
          hasUnsavedChanges={hasUnsavedChanges}
          saveSuccessMsg={saveSuccessMsg}
          lastSavedTime={lastSavedTime}
          onSaveToCloud={() => handleSaveToCloud()}
          onOpenCreateSession={handleOpenCreateSessionModal}
          onOpenShare={handleOpenShare}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />

        <AttendanceSessionSelector
          classSessions={classSessions}
          currentSession={currentSession}
          isMeetingsPanelOpen={isMeetingsPanelOpen}
          onToggleMeetingsPanel={() => setIsMeetingsPanelOpen(!isMeetingsPanelOpen)}
          onCloseMeetingsPanel={() => setIsMeetingsPanelOpen(false)}
          onSelectSession={(id) => setActiveSessionId(id)}
          onStartEditSession={handleStartEditSession}
          onDeleteSession={handleDeleteSessionConfirm}
          onOpenCreateSession={handleOpenCreateSessionModal}
        />
      </div>

      {/* Active Session Info & Metrics Card */}
      {currentSession && (
        <AttendanceSessionCard
          currentSession={currentSession}
          syncedAgenda={syncedAgenda}
          totalStudents={classStudents.length}
          attendanceRate={attendanceRate}
          countH={countH}
          countS={countS}
          countI={countI}
          countA={countA}
          countD={countD}
          isSavingToCloud={isSavingToCloud}
          onNavigateToAgenda={props.onNavigateToAgenda}
          onSetAllPresent={handleSetAllPresent}
          onSaveToCloud={() => handleSaveToCloud()}
          onOpenWaReport={() => handleOpenWaReport('group')}
          onStartEditSession={() => handleStartEditSession(currentSession)}
          onDeleteSession={() => handleDeleteSessionConfirm(currentSession)}
        />
      )}

      {/* Pratinjau Teks WhatsApp Laporan Orang Tua (Pada Bagian Input Absen) */}
      {currentSession && (
        <AttendanceWaPreviewCard
          currentSession={currentSession}
          isWaPreviewExpanded={isWaPreviewExpanded}
          waInlineCopied={waInlineCopied}
          onToggleWaPreview={() => setIsWaPreviewExpanded(!isWaPreviewExpanded)}
          onCopyGroupWaReport={() => {
            const txt = generateGroupWaReportText(currentSession);
            handleCopyWaReport(txt);
            setWaInlineCopied(true);
            setTimeout(() => setWaInlineCopied(false), 2000);
          }}
          onOpenWaReportModal={() => handleOpenWaReport('group')}
          generateGroupWaReportText={generateGroupWaReportText}
        />
      )}

      {/* Attendance Grid per Student */}
      {currentSession && (
        <AttendanceStudentTable
          currentSession={currentSession}
          filteredStudents={filteredStudents}
          filterQuery={filterQuery}
          sortOrder={sortOrder}
          isSavingToCloud={isSavingToCloud}
          lastSavedTime={lastSavedTime}
          onFilterChange={setFilterQuery}
          onSortChange={setSortOrder}
          onUpdateRecord={handleUpdateRecord}
          onOpenPersonalWa={(std) => handleOpenWaReport('personal', std)}
          onSaveToCloud={() => handleSaveToCloud()}
        />
      )}

      {/* Floating Unsaved Changes Notification */}
      <AttendanceFloatingSave
        hasUnsavedChanges={hasUnsavedChanges}
        isSavingToCloud={isSavingToCloud}
        onSaveToCloud={() => handleSaveToCloud()}
      />

      {/* Modal Create Session with Full Teaching Agenda Inputs & Direct Sync */}
      <AttendanceCreateModal
        isOpen={isNewModalOpen}
        currentClass={props.currentClass}
        teacher={props.teacher}
        newSessionData={newSessionData}
        newSelectedPeriods={newSelectedPeriods}
        isNewTimeSectionExpanded={isNewTimeSectionExpanded}
        isNewPeriodsExpanded={isNewPeriodsExpanded}
        isSavingToCloud={isSavingToCloud}
        agendas={props.agendas}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateSession}
        setNewSessionData={setNewSessionData}
        setIsNewTimeSectionExpanded={setIsNewTimeSectionExpanded}
        setIsNewPeriodsExpanded={setIsNewPeriodsExpanded}
        onStartTimeChange={handleStartTimeChangeNew}
        onEndTimeChange={handleEndTimeChangeNew}
        onQuickSelectPeriods={handleQuickSelectPeriodsNew}
        onTogglePeriod={handleTogglePeriodNew}
        isPeriodActive={isPeriodActiveNew}
      />

      {/* Modal Edit Sesi Pertemuan Absen yang Sudah Dibuat dengan Sinkronisasi Agenda */}
      <AttendanceEditModal
        isOpen={isEditModalOpen}
        editingSessionData={editingSessionData}
        editSelectedPeriods={editSelectedPeriods}
        isEditTimeSectionExpanded={isEditTimeSectionExpanded}
        isEditPeriodsExpanded={isEditPeriodsExpanded}
        isSavingToCloud={isSavingToCloud}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSessionData(null);
        }}
        onSubmit={handleSaveEditedSession}
        onDelete={() => {
          if (editingSessionData) {
            handleDeleteSessionConfirm(editingSessionData);
            setIsEditModalOpen(false);
            setEditingSessionData(null);
          }
        }}
        setEditingSessionData={setEditingSessionData}
        setIsEditTimeSectionExpanded={setIsEditTimeSectionExpanded}
        setIsEditPeriodsExpanded={setIsEditPeriodsExpanded}
        onStartTimeChange={handleStartTimeChangeEdit}
        onEndTimeChange={handleEndTimeChangeEdit}
        onQuickSelectPeriods={handleQuickSelectPeriodsEdit}
        onTogglePeriod={handleTogglePeriodEdit}
        isPeriodActive={isPeriodActiveEdit}
      />

      {/* Modal Share Public Link */}
      <AttendanceShareModal
        isOpen={shareModalOpen}
        shareQrUrl={shareQrUrl}
        shareLink={shareLink}
        copiedLink={copiedLink}
        onCopyLink={copyShareLink}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Modal Dialog WhatsApp Report with Full Preview & Mode Switcher */}
      <AttendanceWaModal
        isOpen={isWaReportModalOpen}
        currentSession={currentSession || null}
        currentClass={props.currentClass}
        teacher={props.teacher}
        classStudents={classStudents}
        waReportMode={waReportMode}
        selectedStudentForWa={selectedStudentForWa}
        waReportText={waReportText}
        waCopied={waCopied}
        onClose={() => setIsWaReportModalOpen(false)}
        onSwitchMode={(mode) => {
          setWaReportMode(mode);
          if (currentSession) {
            if (mode === 'group') {
              setWaReportText(generateGroupWaReportText(currentSession));
            } else {
              const targetStd = selectedStudentForWa || classStudents[0];
              if (targetStd) {
                setSelectedStudentForWa(targetStd);
                setWaReportText(generatePersonalWaReportText(targetStd, currentSession));
              }
            }
          }
          waCopied && handleCopyWaReport('');
        }}
        onSelectStudent={(std) => {
          setSelectedStudentForWa(std);
          if (currentSession) {
            setWaReportText(generatePersonalWaReportText(std, currentSession));
          }
        }}
        onCopy={() => handleCopyWaReport()}
        onSendWa={() => {
          if (waReportMode === 'personal' && selectedStudentForWa?.noHpOrangTua) {
            handleSendToWhatsApp(waReportText, selectedStudentForWa.noHpOrangTua);
          } else {
            handleSendToWhatsApp(waReportText);
          }
        }}
      />
    </div>
  );
};

export default AttendanceView;
