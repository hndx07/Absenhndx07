import React from 'react';
import { BookMarked } from 'lucide-react';
import { TeachingAgendaViewProps } from './types';
import { useTeachingAgendaState } from './hooks/useTeachingAgendaState';
import { AgendaHeader } from './AgendaHeader';
import { AgendaFilters } from './AgendaFilters';
import { AgendaTable } from './AgendaTable';
import { AgendaCards } from './AgendaCards';
import { AgendaFormModal } from './AgendaFormModal';
import { AgendaPrintPreviewModal, AgendaPrintDocument } from './AgendaPrintPreviewModal';
import { AgendaUploadExcelModal } from './AgendaUploadExcelModal';
import { AgendaShareModal } from './AgendaShareModal';

export const TeachingAgendaView: React.FC<TeachingAgendaViewProps> = (props) => {
  const { classes, teacher, onDeleteAgenda } = props;
  const state = useTeachingAgendaState(props);

  return (
    <div>
      {/* Tampilan Laman Web Interaktif - Sembunyikan Total Saat Print */}
      <div className="space-y-6 no-print">
        {/* Top Header & Quick Metrics */}
        <AgendaHeader
          teacher={teacher}
          classes={classes}
          filterClassId={state.filterClassId}
          selectedClassObj={state.selectedClassObj}
          stats={state.stats}
          syncStatusMsg={state.syncStatusMsg}
          lastSyncTime={state.lastSyncTime}
          isSavingAll={state.isSavingAll}
          hasFilteredAgendas={state.filteredAgendas.length > 0}
          onOpenPrintPreview={() => state.setIsPreviewPdfOpen(true)}
          onExportPDF={state.handleExportPDF}
          onExportExcel={state.handleExportExcel}
          onExportWord={state.handleExportWord}
          onOpenUploadExcel={() => {
            state.setUploadTargetClassId(
              state.filterClassId !== 'all' ? state.filterClassId : (classes[0]?.id || '')
            );
            state.setParsedImportRows([]);
            state.setImportFileName('');
            state.setUploadError(null);
            state.setIsUploadExcelOpen(true);
          }}
          onOpenShare={state.handleOpenShare}
          onSyncAll={state.handleSyncAllAgendas}
          onOpenAdd={state.handleOpenAdd}
        />

        {/* Filter & Search Bar */}
        <AgendaFilters
          classes={classes}
          filterClassId={state.filterClassId}
          filterMonth={state.filterMonth}
          filterSemester={state.filterSemester}
          searchQuery={state.searchQuery}
          viewMode={state.viewMode}
          filteredCount={state.filteredAgendas.length}
          totalCount={props.agendas.length}
          selectedClassObj={state.selectedClassObj}
          onFilterClassChange={state.handleFilterClassChange}
          onFilterMonthChange={state.handleFilterMonthChange}
          onFilterSemesterChange={state.handleFilterSemesterChange}
          onSearchChange={state.setSearchQuery}
          onViewModeChange={state.setViewMode}
        />

        {/* Agenda Entries Display */}
        {state.filteredAgendas.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
            <BookMarked className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Tidak ada catatan agenda mengajar yang sesuai filter.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Klik "Catat Agenda Baru" untuk menambahkan kegiatan pembelajaran atau ubah kriteria filter di atas.
            </p>
          </div>
        ) : state.viewMode === 'table' ? (
          <AgendaTable
            filteredAgendas={state.filteredAgendas}
            classesMap={state.classesMap}
            classSubjectMap={state.classSubjectMap}
            teacher={teacher}
            lastSyncTime={state.lastSyncTime}
            isSavingAll={state.isSavingAll}
            onOpenEdit={state.handleOpenEdit}
            onDeleteAgenda={onDeleteAgenda}
            onSyncAll={state.handleSyncAllAgendas}
          />
        ) : (
          <AgendaCards
            filteredAgendas={state.filteredAgendas}
            classesMap={state.classesMap}
            classSubjectMap={state.classSubjectMap}
            teacher={teacher}
            onOpenEdit={state.handleOpenEdit}
            onDeleteAgenda={onDeleteAgenda}
          />
        )}
      </div>

      {/* Dokumen Siap Cetak Kertas Khusus Print Langsung (Ctrl+P saat modal tidak dibuka) */}
      {!state.isPreviewPdfOpen && (
        <div className="hidden print:block print-document bg-white text-black p-0 m-0 w-full">
          <AgendaPrintDocument
            teacher={teacher}
            filterClassId={state.filterClassId}
            selectedClassObj={state.selectedClassObj}
            filteredAgendas={state.filteredAgendas}
            classesMap={state.classesMap}
          />
        </div>
      )}

      {/* Modal Add / Edit Agenda */}
      <AgendaFormModal
        isModalOpen={state.isModalOpen}
        editingAgenda={state.editingAgenda}
        classes={classes}
        teacher={teacher}
        isSaving={state.isSaving}
        onClose={() => state.setIsModalOpen(false)}
        onSubmit={state.handleSubmit}
        setEditingAgenda={state.setEditingAgenda}
        isTimeSectionExpanded={state.isTimeSectionExpanded}
        setIsTimeSectionExpanded={state.setIsTimeSectionExpanded}
        parseTimeRange={state.parseTimeRange}
        handleStartTimeChange={state.handleStartTimeChange}
        handleEndTimeChange={state.handleEndTimeChange}
        handleTogglePeriod={state.handleTogglePeriod}
        handleQuickSelectPeriods={state.handleQuickSelectPeriods}
        isPeriodsActive={state.isPeriodsActive}
        isPeriodsExpanded={state.isPeriodsExpanded}
        setIsPeriodsExpanded={state.setIsPeriodsExpanded}
        selectedPeriods={state.selectedPeriods}
        targetClassStudents={state.targetClassStudents}
        attendanceBreakdown={state.attendanceBreakdown}
        handleSyncFromAttendance={state.handleSyncFromAttendance}
        handleSetAllPresentInAgenda={state.handleSetAllPresentInAgenda}
      />

      {/* Modal Preview PDF Agenda Mengajar */}
      <AgendaPrintPreviewModal
        isOpen={state.isPreviewPdfOpen}
        onClose={() => state.setIsPreviewPdfOpen(false)}
        teacher={teacher}
        filterClassId={state.filterClassId}
        selectedClassObj={state.selectedClassObj}
        filteredAgendas={state.filteredAgendas}
        classesMap={state.classesMap}
        onExportPDF={state.handleExportPDF}
      />

      {/* Modal Unggah / Impor Excel Agenda Mengajar */}
      <AgendaUploadExcelModal
        isOpen={state.isUploadExcelOpen}
        onClose={() => state.setIsUploadExcelOpen(false)}
        classes={classes}
        teacher={teacher}
        uploadTargetClassId={state.uploadTargetClassId}
        setUploadTargetClassId={state.setUploadTargetClassId}
        importFileName={state.importFileName}
        uploadError={state.uploadError}
        isDragOver={state.isDragOver}
        setIsDragOver={state.setIsDragOver}
        isParsingExcel={state.isParsingExcel}
        isSavingImport={state.isSavingImport}
        parsedImportRows={state.parsedImportRows}
        selectedImportIndices={state.selectedImportIndices}
        handleExcelFileUpload={state.handleExcelFileUpload}
        downloadAgendaTemplateExcel={state.handleDownloadTemplate}
        selectAllValidImportRows={state.selectAllValidImportRows}
        deselectAllImportRows={state.deselectAllImportRows}
        toggleImportRow={state.toggleImportRow}
        handleExecuteImport={state.handleExecuteImport}
      />

      {/* Share Modal */}
      <AgendaShareModal
        isOpen={state.shareModalOpen}
        onClose={() => state.setShareModalOpen(false)}
        shareLink={state.shareLink}
        shareQrUrl={state.shareQrUrl}
        copiedLink={state.copiedLink}
        copyShareLink={state.copyShareLink}
      />
    </div>
  );
};

export default TeachingAgendaView;
