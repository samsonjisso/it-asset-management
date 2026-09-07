// Shared helpers for the "Import from Excel/CSV" feature used across
// PC/Device/Server/License Registration. Parsing and template
// generation are generic (spreadsheet in, plain string-keyed rows
// out); each page supplies its own column list and per-row
// validation/mapping logic (see ImportModal.tsx).
import * as XLSX from 'xlsx';

export interface ImportColumn {
  // Key used internally to look this column's value up in a raw row
  // once the header has been matched (see readRawValue below).
  key: string;
  // Header text written to the template and shown to the user.
  label: string;
  // Shown with a red asterisk in the template/legend - informational
  // only, since real requiredness (which may depend on other column
  // values, e.g. "required unless Never Expire is checked") is
  // enforced by each page's own validateRow function.
  required?: boolean;
  // Alternate header spellings that should also match this column
  // (e.g. "Asset Tag #", "Tag Number") so a slightly different sheet
  // still imports without the user having to rename columns.
  aliases?: string[];
  // Short guidance shown under the column in the legend, e.g. "Must
  // match an existing Department name exactly."
  hint?: string;
}

// A second sheet added to the template listing the valid values for a
// lookup-backed column (departments, floors, device types, etc.) so
// the person filling in the sheet knows exactly what will match.
export interface ImportReferenceSheet {
  sheetName: string;
  columnHeader: string;
  values: string[];
}

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Reads a spreadsheet (.xlsx/.xls/.csv) file into an array of raw rows
// keyed by the *original* header text found in the file (not by
// ImportColumn.key - see matchColumnsToHeaders/readRawValue for that
// translation). Blank trailing rows are dropped.
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
  const rows = raw
    .map((r) => {
      const row: Record<string, string> = {};
      for (const h of headers) row[h] = String(r[h] ?? '').trim();
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v.trim() !== ''));
  return { headers, rows };
}

// For a given raw row (keyed by original spreadsheet header text) and
// an ImportColumn, finds the value the user entered - matching the
// column's label or any alias against the row's headers
// case-/whitespace-insensitively, so column order and minor header
// spelling differences don't matter.
export function readRawValue(row: Record<string, string>, column: ImportColumn): string {
  const candidates = [column.label, ...(column.aliases ?? [])].map(normalizeHeader);
  for (const header of Object.keys(row)) {
    if (candidates.includes(normalizeHeader(header))) return row[header] ?? '';
  }
  return '';
}

// Builds and downloads a blank template workbook: one sheet with the
// column headers (Import), plus one reference sheet per lookup-backed
// column listing its valid values, so the person filling in the sheet
// can see exactly what departments/types/etc. already exist.
export function downloadImportTemplate(
  filename: string,
  columns: ImportColumn[],
  referenceSheets: ImportReferenceSheet[] = []
) {
  const wb = XLSX.utils.book_new();
  const headerRow = columns.map((c) => (c.required ? `${c.label} *` : c.label));
  const ws = XLSX.utils.aoa_to_sheet([headerRow]);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(14, c.label.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Import');

  for (const ref of referenceSheets) {
    if (ref.values.length === 0) continue;
    const refWs = XLSX.utils.aoa_to_sheet([[ref.columnHeader], ...ref.values.map((v) => [v])]);
    refWs['!cols'] = [{ wch: Math.max(14, ref.columnHeader.length + 2) }];
    // Sheet names are capped at 31 chars and can't contain []:*?/\
    const safeName = ref.sheetName.replace(/[[\]:*?/\\]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, refWs, safeName);
  }

  XLSX.writeFile(wb, filename);
}
