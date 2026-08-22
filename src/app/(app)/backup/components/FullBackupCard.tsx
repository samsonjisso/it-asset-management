import { Download } from 'lucide-react';
import { Button } from '@/components/FormControls';
import { useBackupExport } from '../hooks/useBackupExport';

export function FullBackupCard() {
  const { exporting, exportAllCSV } = useBackupExport();

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#343494] to-[#4e4ec1] p-6 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
          <Download size={24} />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold">Full System Backup</h3>
          <p className="mt-1 text-sm text-white/80">
            Download a complete backup of all IT asset data as a single CSV file.
          </p>

          <Button
            variant="gold"
            size="md"
            className="mt-4"
            onClick={exportAllCSV}
            disabled={exporting}
          >
            {exporting ? (
              'Exporting...'
            ) : (
              <>
                <Download size={16} /> Download Full Backup
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
