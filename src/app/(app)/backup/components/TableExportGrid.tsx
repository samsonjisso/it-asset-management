import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/FormControls';
import { BACKUP_TABLES } from '../constants';

interface TableExportGridProps {
  onExportTable: (tableName: string, label: string) => void;
}

export function TableExportGrid({ onExportTable }: TableExportGridProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-[#343494] mb-4">Export Individual Tables</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BACKUP_TABLES.map((table) => (
          <div
            key={table.name}
            className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-[#343494]" />
              <span className="font-medium text-gray-700 text-sm">{table.label}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onExportTable(table.name, table.label)}>
              <Download size={14} /> Export
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
