import { useState } from "react";
import { useToast } from "@/components/Toast";
import { parseCSV } from "../lib/csv";
import {
  fetchImportableTables,
  fetchTableSchema,
  previewImport as previewImportApi,
  runImport as runImportApi,
} from "../lib/importApi";
import {
  ColumnMapping,
  ImportColumn,
  ImportPreviewResult,
  ImportRunResult,
  ImportWizardStep,
  ImportableTable,
  ParsedCSV,
} from "../types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Best-effort auto-mapping: matches a CSV header to a target column with the same normalized name. */
function guessMapping(
  headers: string[],
  columns: ImportColumn[],
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const header of headers) {
    const match = columns.find(
      (c) => !used.has(c.name) && normalize(c.name) === normalize(header),
    );
    if (match) {
      mapping[header] = match.name;
      used.add(match.name);
    } else {
      mapping[header] = null;
    }
  }
  return mapping;
}

export function useImportWizard(canWrite = false) {
  const { toast } = useToast();

  const [step, setStep] = useState<ImportWizardStep>("upload");
  const [tables, setTables] = useState<ImportableTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ImportColumn[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] =
    useState<ImportPreviewResult | null>(null);

  const [importing, setImporting] = useState(false);
  const [runResult, setRunResult] = useState<ImportRunResult | null>(null);

  const resetAll = () => {
    setStep("upload");
    setSelectedTable(null);
    setColumns([]);
    setFileName(null);
    setParsed(null);
    setMapping({});
    setPreviewResult(null);
    setRunResult(null);
  };

  const loadTables = async () => {
    if (!canWrite) return;
    setLoadingTables(true);
    try {
      const list = await fetchImportableTables();
      setTables(list);
    } catch (err: any) {
      toast(err.message ?? "Could not load import targets", "error");
    } finally {
      setLoadingTables(false);
    }
  };

  const selectTable = async (table: string) => {
    setSelectedTable(table);
    setLoadingSchema(true);
    try {
      const schema = await fetchTableSchema(table);
      setColumns(schema.columns);
      if (parsed) setMapping(guessMapping(parsed.headers, schema.columns));
    } catch (err: any) {
      toast(err.message ?? "Could not load column list", "error");
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const csv = parseCSV(text);
      if (csv.headers.length === 0 || csv.rows.length === 0) {
        toast("That file has no rows to import", "error");
        return;
      }
      setFileName(file.name);
      setParsed(csv);
      if (columns.length > 0) setMapping(guessMapping(csv.headers, columns));
    } catch (err: any) {
      toast(err.message ?? "Could not read that file", "error");
    }
  };

  const setColumnMapping = (csvHeader: string, target: string | null) => {
    setMapping((prev) => ({ ...prev, [csvHeader]: target }));
  };

  const goToMapping = () => {
    if (!selectedTable) {
      toast("Choose a table to import into first", "error");
      return;
    }
    if (!parsed) {
      toast("Choose a CSV file to import first", "error");
      return;
    }
    setStep("mapping");
  };

  const goToPreview = async () => {
    if (!selectedTable || !parsed) return;
    setPreviewing(true);
    try {
      const result = await previewImportApi(
        selectedTable,
        parsed.rows,
        mapping,
      );
      setPreviewResult(result);
      setStep("preview");
    } catch (err: any) {
      toast(err.message ?? "Could not validate the file", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!selectedTable || !parsed) return;
    setImporting(true);
    try {
      const result = await runImportApi(selectedTable, parsed.rows, mapping);
      setRunResult(result);
      setStep("result");
      if (result.imported > 0) {
        toast(
          `Imported ${result.imported} of ${result.totalRows} rows`,
          "success",
        );
      } else {
        toast("No rows were imported - see the summary for details", "warning");
      }
    } catch (err: any) {
      toast(err.message ?? "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const goBack = () => {
    if (step === "mapping") setStep("upload");
    else if (step === "preview") setStep("mapping");
  };

  return {
    step,
    tables,
    loadingTables,
    loadTables,
    selectedTable,
    selectTable,
    columns,
    loadingSchema,
    fileName,
    parsed,
    handleFile,
    mapping,
    setColumnMapping,
    goToMapping,
    previewing,
    previewResult,
    goToPreview,
    importing,
    runResult,
    confirmImport,
    goBack,
    resetAll,
  };
}
