import { TableDataMap, TableRow } from '../types';

/**
 * Escapes and formats a single cell value for CSV output.
 */
function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  return `"${String(val).replace(/"/g, '""')}"`;
}

/**
 * Converts an array of rows into a CSV string, including a header row
 * derived from the keys of the first row.
 */
export function rowsToCSV(rows: TableRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => formatCell(row[h])).join(',')),
  ];
  return lines.join('\n');
}

/**
 * Builds a single combined CSV with a labeled section per table,
 * used for the "full backup" export.
 */
export function buildCombinedCSV(dataByLabel: TableDataMap): string {
  let csvContent = '';
  for (const [label, rows] of Object.entries(dataByLabel)) {
    csvContent += `\n=== ${label} ===\n`;
    if (rows.length === 0) {
      csvContent += 'No data\n';
      continue;
    }
    csvContent += rowsToCSV(rows) + '\n';
  }
  return csvContent;
}

/**
 * Triggers a browser download of the given CSV content.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a dated filename, e.g. "assets_backup_2026-08-21.csv".
 */
export function dateStampedFilename(prefix: string): string {
  return `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
}
