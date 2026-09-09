"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Modal } from "./Modal";
import { Button } from "./FormControls";
import {
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

export interface ImportColumn {
  /** Internal key this column maps to in the raw row object passed to validateRow. */
  key: string;
  /** Column header shown in the downloadable template and preview table. */
  label: string;
  /** Purely informational — shown with a "*" in the template/preview. Actual
   * enforcement happens inside validateRow, since requiredness is often
   * conditional (e.g. Floor is only required for non-branch departments). */
  required?: boolean;
  /** Optional short example value shown in a second template row. */
  example?: string;
}

export interface ImportRowResult {
  /** Fields to display in the preview table for this row (subset of columns is fine). */
  preview: Record<string, string>;
  /** Present when the row failed validation — row is shown as an error and is never imported. */
  error?: string;
  /** The payload to send to importRow() when this row is valid. */
  values?: Record<string, unknown>;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** e.g. "Import PCs from Excel / CSV" */
  title: string;
  subtitle?: string;
  columns: ImportColumn[];
  /** Base filename (no extension) for the downloadable template, e.g. "pc_import_template". */
  templateFilename: string;
  /** Given the raw string values keyed by column.key (as read from the file), return
   * validation result + the payload to insert if valid. */
  validateRow: (raw: Record<string, string>) => ImportRowResult;
  /** Insert one validated row. Return an error message string on failure (e.g. a
   * duplicate rejected by the server), or null/undefined on success. */
  importRow: (
    values: Record<string, unknown>,
  ) => Promise<string | null | undefined>;
  /** Called after an import batch finishes (at least one row succeeded), so the
   * page can refresh its table. */
  onImported: () => void;
}

type ParsedRow = {
  rowNum: number;
  preview: Record<string, string>;
  error?: string;
  values?: Record<string, unknown>;
  status: "pending" | "imported" | "failed";
  importError?: string;
};

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function ImportModal({
  open,
  onClose,
  title,
  subtitle,
  columns,
  templateFilename,
  validateRow,
  importRow,
  onImported,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setImportDone(false);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const headerRow = columns.map((c) => c.label + (c.required ? " *" : ""));
    const exampleRow = columns.map((c) => c.example ?? "");
    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    ws["!cols"] = columns.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${templateFilename}.xlsx`);
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setImportDone(false);
    setFileName(file.name);
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        setParseError("The file appears to be empty.");
        setRows([]);
        setParsing(false);
        return;
      }
      const ws = wb.Sheets[firstSheetName];
      const aoa = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false,
      }) as unknown[][];
      if (!aoa.length) {
        setParseError("The file appears to be empty.");
        setRows([]);
        setParsing(false);
        return;
      }
      const headerCells = (aoa[0] as unknown[]).map((h) => String(h ?? ""));
      const normalizedHeaders = headerCells.map((h) =>
        normalizeHeader(h.replace(/\*$/, "")),
      );
      const colIndexByKey = new Map<string, number>();
      for (const col of columns) {
        const target = normalizeHeader(col.label);
        const idx = normalizedHeaders.findIndex((h) => h === target);
        if (idx !== -1) colIndexByKey.set(col.key, idx);
      }
      const dataRows = aoa
        .slice(1)
        .filter(
          (r) =>
            Array.isArray(r) &&
            r.some((cell) => String(cell ?? "").trim() !== ""),
        );
      const parsed: ParsedRow[] = dataRows.map((r, i) => {
        const raw: Record<string, string> = {};
        for (const col of columns) {
          const idx = colIndexByKey.get(col.key);
          raw[col.key] =
            idx !== undefined ? String((r as unknown[])[idx] ?? "").trim() : "";
        }
        const result = validateRow(raw);
        return {
          rowNum: i + 2, // +1 for header row, +1 for 1-based
          preview: result.preview,
          error: result.error,
          values: result.values,
          status: "pending",
        };
      });
      setRows(parsed);
    } catch {
      setParseError(
        "Could not read this file. Please upload a valid .xlsx, .xls, or .csv file exported from the template.",
      );
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  const runImport = async () => {
    setImporting(true);
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (!row || row.error || !row.values) continue;
      const err = await importRow(row.values);
      next[i] = err
        ? { ...row, status: "failed", importError: err }
        : { ...row, status: "imported" };
      setRows([...next]);
    }
    setImporting(false);
    setImportDone(true);
    if (next.some((r) => r.status === "imported")) onImported();
  };

  const importedCount = rows.filter((r) => r.status === "imported").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;

  // Show at most a handful of preview columns so the table stays readable.
  const previewKeys = columns.slice(0, 5).map((c) => c.key);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      size="xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Download the template, fill in your existing assets, then upload it
            here. Fields marked with <span className="font-semibold">*</span>{" "}
            are required.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
          >
            <Download size={16} /> Download Template
          </Button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileInputChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-400 rounded-xl py-8 text-gray-500 dark:text-gray-400 hover:border-brand-600 hover:text-brand-600 hover:bg-brand-50/40 transition-colors"
          >
            <Upload size={22} />
            <span className="text-sm font-medium">
              {fileName ?? "Click to upload a .xlsx, .xls, or .csv file"}
            </span>
            {!fileName && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Use the downloaded template for the expected columns
              </span>
            )}
          </button>
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Reading file…
          </div>
        )}

        {parseError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {parseError}
          </div>
        )}

        {!parsing && rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                <CheckCircle2 size={16} /> {validRows.length} valid
              </span>
              {errorRows.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle size={16} /> {errorRows.length} with errors (won't be
                  imported)
                </span>
              )}
              {importDone && (
                <span className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-300 font-medium">
                  <FileSpreadsheet size={16} /> Imported {importedCount}
                  {failedCount > 0 ? `, ${failedCount} failed` : ""}
                </span>
              )}
            </div>

            <div className="border border-brand-600 rounded-lg overflow-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-14">
                      Row
                    </th>
                    {columns
                      .filter((c) => previewKeys.includes(c.key))
                      .map((c) => (
                        <th
                          key={c.key}
                          className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400"
                        >
                          {c.label}
                        </th>
                      ))}
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={
                        r.error
                          ? "bg-red-50/50"
                          : r.status === "failed"
                            ? "bg-amber-50/50"
                            : ""
                      }
                    >
                      <td className="px-3 py-2 text-gray-400 dark:text-gray-500">
                        {r.rowNum}
                      </td>
                      {columns
                        .filter((c) => previewKeys.includes(c.key))
                        .map((c) => (
                          <td
                            key={c.key}
                            className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[10rem] truncate"
                            title={r.preview[c.key]}
                          >
                            {r.preview[c.key] || "—"}
                          </td>
                        ))}
                      <td className="px-3 py-2">
                        {r.status === "imported" && (
                          <span className="text-green-700 inline-flex items-center gap-1">
                            <CheckCircle2 size={14} /> Imported
                          </span>
                        )}
                        {r.status === "failed" && (
                          <span
                            className="text-red-600 inline-flex items-center gap-1"
                            title={r.importError}
                          >
                            <XCircle size={14} /> {r.importError}
                          </span>
                        )}
                        {r.status === "pending" && r.error && (
                          <span className="text-red-600" title={r.error}>
                            {r.error}
                          </span>
                        )}
                        {r.status === "pending" && !r.error && (
                          <span className="text-gray-400 dark:text-gray-500">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={runImport}
                disabled={validRows.length === 0 || importing || importDone}
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Importing…
                  </>
                ) : (
                  `Import ${validRows.length} row${validRows.length === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
