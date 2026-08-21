"use client";

import { useBackupExport } from './hooks/useBackupExport';
import { useBackupImport } from './hooks/useBackupImport';
import { BackupPageHeader } from './components/BackupPageHeader';
import { FullBackupCard } from './components/FullBackupCard';
import { TableExportGrid } from './components/TableExportGrid';
import { ImportSection } from './components/ImportSection';
import { BackupRecommendations } from './components/BackupRecommendations';

export function BackupPage() {
  const { exporting, exportAllCSV, exportTableCSV } = useBackupExport();
  const { importing, handleImport } = useBackupImport();

  return (
    <div className="space-y-6 max-w-4xl">
      <BackupPageHeader />
      <FullBackupCard exporting={exporting} onExport={exportAllCSV} />
      <TableExportGrid onExportTable={exportTableCSV} />
      <ImportSection importing={importing} onImport={handleImport} />
      <BackupRecommendations />
    </div>
  );
}
