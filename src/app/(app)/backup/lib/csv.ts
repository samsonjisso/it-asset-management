import { ParsedCSV, TableDataMap, TableRow } from '../types';

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

/**
 * Splits raw CSV text into rows of raw string cells, honoring quoted
 * fields (which may contain commas, newlines, and escaped "" quotes).
 * Kept separate from parseCSV so it's independently testable.
 */
export function parseCSVCells(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r') {
      // swallow; \n (or end of text) below closes the row
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  // Final cell/row (files don't always end with a trailing newline)
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/**
 * Parses arbitrary CSV text (any headers, any column order/count) into a
 * header list plus an array of row objects keyed by header. This is the
 * generalized reader behind the import wizard - unlike the old
 * backup-restore flow it makes no assumption about which columns exist.
 */
export function parseCSV(text: string): ParsedCSV {
  const cells = parseCSVCells(text);
  if (cells.length === 0) return { headers: [], rows: [] };

  const headers = cells[0].map((h) => h.trim());
  const rows = cells.slice(1).map((cellRow) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (cellRow[i] ?? '').trim();
    });
    return row;
  });

  return { headers, rows };
}
