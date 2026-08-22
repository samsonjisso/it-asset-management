'use client';

import { useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useImportWizard } from '../../hooks/useImportWizard';
import { WizardSteps } from './WizardSteps';
import { UploadStep } from './UploadStep';
import { MappingStep } from './MappingStep';
import { PreviewStep } from './PreviewStep';
import { ResultStep } from './ResultStep';

interface ImportWizardProps {
  canWrite: boolean;
}

export function ImportWizard({ canWrite }: ImportWizardProps) {
  const wizard = useImportWizard(canWrite);

  useEffect(() => {
    if (canWrite) void wizard.loadTables();
    // loadTables is intentionally called only when write permission changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite]);

  const displayColumns = wizard.columns.filter((column) =>
    Object.values(wizard.mapping).includes(column.name),
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#343494]">
        <Upload size={20} /> Import Data
      </h3>

      {!canWrite ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          You have read-only access. Import and restore operations require write permission.
        </p>
      ) : (
        <>
          <WizardSteps current={wizard.step} />

          {wizard.step === 'upload' && (
            <UploadStep
              tables={wizard.tables}
              loadingTables={wizard.loadingTables}
              selectedTable={wizard.selectedTable}
              onSelectTable={wizard.selectTable}
              fileName={wizard.fileName}
              rowCount={wizard.parsed?.rows.length ?? 0}
              onFile={wizard.handleFile}
              onNext={wizard.goToMapping}
              loadingSchema={wizard.loadingSchema}
            />
          )}

          {wizard.step === 'mapping' && wizard.parsed && (
            <MappingStep
              headers={wizard.parsed.headers}
              sampleRow={wizard.parsed.rows[0]}
              columns={wizard.columns}
              mapping={wizard.mapping}
              onChange={wizard.setColumnMapping}
              onBack={wizard.goBack}
              onNext={wizard.goToPreview}
              previewing={wizard.previewing}
            />
          )}

          {wizard.step === 'preview' && wizard.previewResult && (
            <PreviewStep
              result={wizard.previewResult}
              displayColumns={displayColumns}
              onBack={wizard.goBack}
              onConfirm={wizard.confirmImport}
              importing={wizard.importing}
            />
          )}

          {wizard.step === 'result' && wizard.runResult && (
            <ResultStep result={wizard.runResult} onReset={wizard.resetAll} />
          )}
        </>
      )}
    </div>
  );
}
