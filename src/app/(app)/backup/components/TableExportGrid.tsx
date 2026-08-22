import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/FormControls';
import { BACKUP_TABLES } from '../constants';
import { useBackupExport } from '../hooks/useBackupExport';

export function TableExportGrid() {
  const { exportingTable, exportTableCSV } = useBackupExport();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[#343494]">
        Export Individual Tables
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BACKUP_TABLES.map((table) => (
          <div
            key={table.name}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-[#343494]" />
              <span className="text-sm font-medium text-gray-700">
                {table.label}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTableCSV(table.name, table.label)}
              disabled={exportingTable !== null}
            >
              <Download size={14} />
              {exportingTable === table.name ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
