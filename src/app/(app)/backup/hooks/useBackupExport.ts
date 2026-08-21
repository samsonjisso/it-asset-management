import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { BACKUP_TABLES } from '../constants';
import { TableDataMap } from '../types';
import { buildCombinedCSV, rowsToCSV, downloadCSV, dateStampedFilename } from '../lib/csv';

/**
 * Provides export handlers for the full backup and individual tables,
 * plus loading state for the full-backup button.
 */
export function useBackupExport() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportAllCSV = async () => {
    setExporting(true);
    try {
      const dataByLabel: TableDataMap = {};
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table.name).select('*');
        if (error) throw error;
        dataByLabel[table.label] = data ?? [];
      }

      const csvContent = buildCombinedCSV(dataByLabel);
      downloadCSV(csvContent, dateStampedFilename('GBB_IT_Asset_Backup'));
      toast('Full backup exported successfully', 'success');
    } catch (err: any) {
      toast(err.message ?? 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportTableCSV = async (tableName: string, label: string) => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (!data || data.length === 0) {
      toast(`No data in ${label}`, 'warning');
      return;
    }
    const csv = rowsToCSV(data);
    downloadCSV(csv, dateStampedFilename(`${tableName}_backup`));
    toast(`${label} exported`, 'success');
  };

  return { exporting, exportAllCSV, exportTableCSV };
}
