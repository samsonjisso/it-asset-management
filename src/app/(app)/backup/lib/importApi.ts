import {
  ColumnMapping,
  ImportColumn,
  ImportPreviewResult,
  ImportRunResult,
  ImportableTable,
} from "../types";
import { authenticatedFetch } from "./authenticatedFetch";

async function importFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await authenticatedFetch(`/api/import${path}`, init);

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // The endpoint may return an empty response for some errors.
  }

  if (!res.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;

    throw new Error(message);
  }

  return body as T;
}

export function fetchImportableTables(): Promise<ImportableTable[]> {
  return importFetch("/tables");
}

export function fetchTableSchema(
  table: string,
): Promise<{ table: string; label: string; columns: ImportColumn[] }> {
  return importFetch(`/${encodeURIComponent(table)}/schema`);
}

export function previewImport(
  table: string,
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Promise<ImportPreviewResult> {
  return importFetch(`/${encodeURIComponent(table)}/preview`, {
    method: "POST",
    body: JSON.stringify({ rows, mapping }),
  });
}

export function runImport(
  table: string,
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Promise<ImportRunResult> {
  return importFetch(`/${encodeURIComponent(table)}`, {
    method: "POST",
    body: JSON.stringify({ rows, mapping }),
  });
}
