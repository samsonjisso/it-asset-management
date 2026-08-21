import { useState } from 'react';
import { useToast } from '@/components/Toast';

/**
 * Parses a raw backup CSV into non-empty, non-section-header lines.
 * Kept separate from the handler so it's independently testable.
 */
export function parseBackupLines(text: string): string[] {
  return text.split('\n').filter((line) => line.trim() && !line.startsWith('==='));
}

/**
 * Provides the file-input change handler for importing a backup CSV,
 * plus loading state for the import UI.
 *
 * Note: actual row-level import into Supabase is intentionally not
 * implemented yet — this currently validates the file and directs
 * users to per-table exports, matching prior behavior.
 */
export function useBackupImport() {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = parseBackupLines(text);
      if (lines.length < 2) {
        toast('Invalid backup file', 'error');
        return;
      }
      toast('Import feature: Please use individual table CSV exports for importing data', 'info');
    } catch (err: any) {
      toast(err.message ?? 'Import failed', 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return { importing, handleImport };
}
