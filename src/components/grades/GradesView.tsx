import React from 'react';
import { GradesViewProps } from './types';
import { useGradesViewState } from './hooks/useGradesViewState';
import { GradesHeader } from './GradesHeader';
import { GradesToolbar } from './GradesToolbar';
import { GradesTable } from './GradesTable';
import { GradesImportModal } from './GradesImportModal';
import { GradesColumnSettingsModal } from './GradesColumnSettingsModal';
import { GradesShareModal } from './GradesShareModal';
import { GradesPrintModal } from './GradesPrintModal';

export const GradesView: React.FC<GradesViewProps> = (props) => {
  const {
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
  } = useGradesViewState(props);

  return (
    <div className="space-y-6">
      {/* Header Banner & Quick Metrics */}
      <GradesHeader
        currentClass={props.currentClass}
        teacher={props.teacher}
        classStudents={classStudents}
        localGrades={localGrades}
        gradeColumns={props.gradeColumns}
        syncStatus={syncStatus}
        pendingSavesCount={Object.keys(pendingSaves).length}
        activeColumnsCount={activeColumnsCount}
        averageClassScore={averageClassScore}
        passedCount={passedCount}
        studentsWithScoresCount={studentsWithScores.length}
        passedPercentage={passedPercentage}
        onSaveAllNow={handleSaveAllNow}
        onOpenColumnEditor={() => {
          setEditingColumns([...props.gradeColumns]);
          setIsColumnEditorOpen(true);
        }}
        onApplyMerdekaDescriptionsAll={handleApplyMerdekaDescriptionsAll}
        onOpenImport={() => {
          setIsImportOpen(true);
        }}
        onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
        onOpenShare={handleOpenShare}
        onChangeActiveColumnsCount={setActiveColumnsCount}
      />

      {/* Filter and Search Bar with Sort Controls */}
      <GradesToolbar
        searchTerm={searchTerm}
        sortOrder={sortOrder}
        filteredCount={filteredStudents.length}
        totalCount={classStudents.length}
        scoresCount={studentsWithScores.length}
        onSearchChange={setSearchTerm}
        onSortChange={setSortOrder}
      />

      {/* Grades Matrix Table */}
      <GradesTable
        filteredStudents={filteredStudents}
        gradeColumns={props.gradeColumns}
        activeColumnsCount={activeColumnsCount}
        localGrades={localGrades}
        rawInputs={rawInputs}
        currentClass={props.currentClass}
        columnSummary={columnSummary}
        sortOrder={sortOrder}
        syncStatus={syncStatus}
        pendingSavesCount={Object.keys(pendingSaves).length}
        averageClassScore={averageClassScore}
        passedCount={passedCount}
        studentsWithScoresCount={studentsWithScores.length}
        onSortChange={setSortOrder}
        onScoreChange={handleScoreChange}
        onScoreBlur={handleScoreBlur}
        onNoteChange={handleNoteChange}
        onApplySingleMerdeka={handleApplySingleMerdeka}
        calculateFinalScore={calculateFinalScore}
        onSaveAllNow={handleSaveAllNow}
      />

      {/* Modal Import Excel */}
      <GradesImportModal
        isOpen={isImportOpen}
        currentClass={props.currentClass}
        classStudents={classStudents}
        gradeColumns={props.gradeColumns}
        teacher={props.teacher}
        importFileName={importFileName}
        isDragging={isDragging}
        parsedGradeRows={parsedGradeRows}
        rawGradeData={rawGradeData}
        overwriteMode={overwriteMode}
        isUploadingToCloud={isUploadingToCloud}
        fileInputRef={fileInputRef}
        onClose={() => setIsImportOpen(false)}
        onFileDrop={handleFileDrop}
        setIsDragging={setIsDragging}
        onOverwriteModeChange={handleOverwriteModeChange}
        onCommitImport={handleCommitGradeImport}
      />

      {/* Modal Custom Kolom TP */}
      <GradesColumnSettingsModal
        isOpen={isColumnEditorOpen}
        activeColumnsCount={activeColumnsCount}
        editingColumns={editingColumns}
        onClose={() => setIsColumnEditorOpen(false)}
        onSave={handleSaveColumns}
        setEditingColumns={setEditingColumns}
      />

      {/* Modal Share Publik */}
      <GradesShareModal
        isOpen={shareModalOpen}
        shareQrUrl={shareQrUrl}
        shareLink={shareLink}
        copiedLink={copiedLink}
        onCopyLink={copyShareLink}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Modal Dokumen Siap Cetak Leger Nilai */}
      <GradesPrintModal
        isOpen={isPrintPreviewOpen}
        currentClass={props.currentClass}
        teacher={props.teacher}
        classStudents={classStudents}
        localGrades={localGrades}
        gradeColumns={props.gradeColumns}
        activeColumnsCount={activeColumnsCount}
        onClose={() => setIsPrintPreviewOpen(false)}
        onSaveAllNow={handleSaveAllNow}
      />
    </div>
  );
};

export default GradesView;
