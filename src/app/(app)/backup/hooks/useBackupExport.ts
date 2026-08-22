import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { BACKUP_TABLES } from '../constants';
import { TableDataMap } from '../types';
import {
  buildCombinedCSV,
  rowsToCSV,
  downloadCSV,
  dateStampedFilename,
} from '../lib/csv';

export function useBackupExport() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const exportAllCSV = async () => {
    setExporting(true);

    try {
      const dataByLabel: TableDataMap = {};

      for (const table of BACKUP_TABLES) {
        console.log(`[Backup] Exporting table: ${table.name}`);

        const { data, error } = await supabase
          .from(table.name)
          .select('*');

        if (error) {
          console.error(
            `[Backup] Failed to export ${table.name}:`,
            error,
          );

          throw new Error(
            `Failed to export ${table.label}: ${error.message}`,
          );
        }

        dataByLabel[table.label] = data ?? [];
      }

      const csvContent = buildCombinedCSV(dataByLabel);

      downloadCSV(
        csvContent,
        dateStampedFilename('GBB_IT_Asset_Backup'),
      );

      toast('Full backup exported successfully', 'success');
    } catch (error) {
      console.error('[Backup] Full export failed:', error);

      toast(
        error instanceof Error
          ? error.message
          : 'Full backup export failed',
        'error',
      );
    } finally {
      setExporting(false);
    }
  };

  const exportTableCSV = async (
    tableName: string,
    label: string,
  ) => {
    setExportingTable(tableName);

    try {
      console.log(`[Backup] Exporting table: ${tableName}`);

      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error(
          `[Backup] Failed to export ${tableName}:`,
          error,
        );

        throw new Error(
          `Failed to export ${label}: ${error.message}`,
        );
      }

      if (!data || data.length === 0) {
        toast(`No data in ${label}`, 'warning');
        return;
      }

      const csv = rowsToCSV(data);

      downloadCSV(
        csv,
        dateStampedFilename(`${tableName}_backup`),
      );

      toast(`${label} exported successfully`, 'success');
    } catch (error) {
      console.error(
        `[Backup] Table export failed (${tableName}):`,
        error,
      );

      toast(
        error instanceof Error
          ? error.message
          : `Failed to export ${label}`,
        'error',
      );
    } finally {
      setExportingTable(null);
    }
  };

  return {
    exporting,
    exportingTable,
    exportAllCSV,
    exportTableCSV,
  };
}