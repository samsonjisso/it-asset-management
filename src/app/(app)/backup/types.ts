export interface BackupTable {
  name: string;
  label: string;
}

export type TableRow = Record<string, any>;

export interface TableDataMap {
  [label: string]: TableRow[];
}

// --- Generalized CSV import wizard -----------------------------------

/** A parsed CSV file: header row + the data rows, all values as strings. */
export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/** A table the backend will accept an import into. */
export interface ImportableTable {
  name: string;
  label: string;
}

/** One target-table column, as returned by GET /api/import/:table/schema. */
export interface ImportColumn {
  name: string;
  label: string;
  required: boolean;
  dataType: string;
}

/** CSV header -> target column name, or null for "don't import this column". */
export type ColumnMapping = Record<string, string | null>;

export interface ImportPreviewRow {
  rowNumber: number;
  data: TableRow;
  errors: string[];
}

export interface ImportPreviewResult {
  table: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  missingRequiredColumns: string[];
  sample: ImportPreviewRow[];
}

export interface ImportRunError {
  row: number;
  message: string;
}

export interface ImportRunResult {
  table: string;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: ImportRunError[];
  truncatedErrors: boolean;
}

export type ImportWizardStep = "upload" | "mapping" | "preview" | "result";
