import type { Request, Response } from "express";
import crypto from "node:crypto";
import { db, nowIso } from "../utils/db.js";
import { BOOLEAN_COLUMNS } from "../utils/crudHelpers.js";
import { reserveAssetId } from "../utils/assetId.js";
import { IMPORT_TABLES, getImportTable } from "../utils/importTables.js";
import {
  buildAndValidateRow,
  getImportColumnMeta,
  type ImportColumnMeta,
} from "../utils/importHelpers.js";
import type { Row } from "../types.js";

/** Hard ceiling on rows accepted per preview/import call, to keep a single request bounded. */
const MAX_IMPORT_ROWS = 20000;
/** How many mapped/validated rows are echoed back in the preview response body. */
const PREVIEW_SAMPLE_SIZE = 50;
/** How many per-row errors are echoed back after a live import run. */
const MAX_REPORTED_ERRORS = 200;

async function loadColumns(table: string): Promise<ImportColumnMeta[]> {
  const cfg = getImportTable(table);
  const extra = cfg?.autoAssetId ? ["asset_id"] : [];
  return getImportColumnMeta(table, extra);
}

function friendlyLabel(columnName: string): string {
  return columnName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** GET /api/import/tables - tables the current user is allowed to import into. */
export async function listImportableTables(req: Request, res: Response) {
  const role = req.auth!.role;
  const tables = IMPORT_TABLES.filter((t) => t.insertRoles.includes(role)).map(
    (t) => ({ name: t.name, label: t.label }),
  );
  res.json(tables);
}

/** GET /api/import/:table/schema - mappable columns for the mapping-wizard UI. */
export async function getTableSchema(req: Request, res: Response) {
  try {
    const table = String(req.params.table);
    const cfg = getImportTable(table);
    if (!cfg) return res.status(404).json({ error: "Unknown import target" });

    const columns = await loadColumns(table);
    const mappable = columns
      .filter((c) => !c.systemManaged)
      .map((c) => ({
        name: c.name,
        label: friendlyLabel(c.name),
        required: c.required,
        dataType: c.dataType,
      }));
    res.json({ table, label: cfg.label, columns: mappable });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

interface ImportRequestBody {
  rows?: Record<string, string>[];
  mapping?: Record<string, string | null>;
}

function readRowsAndMapping(req: Request, res: Response): ImportRequestBody | null {
  const body = (req.body ?? {}) as ImportRequestBody;
  if (!Array.isArray(body.rows) || !body.mapping || typeof body.mapping !== "object") {
    res.status(400).json({ error: "Request must include rows[] and a column mapping." });
    return null;
  }
  if (body.rows.length === 0) {
    res.status(400).json({ error: "The file has no data rows to import." });
    return null;
  }
  if (body.rows.length > MAX_IMPORT_ROWS) {
    res.status(400).json({
      error: `This file has ${body.rows.length} rows, which is over the ${MAX_IMPORT_ROWS} row limit per import. Split it into smaller files.`,
    });
    return null;
  }
  return body;
}

/** POST /api/import/:table/preview - validates every row and maps it, without writing anything. */
export async function previewImport(req: Request, res: Response) {
  try {
    const table = String(req.params.table);
    const cfg = getImportTable(table);
    if (!cfg) return res.status(404).json({ error: "Unknown import target" });

    const parsed = readRowsAndMapping(req, res);
    if (!parsed) return;
    const { rows, mapping } = parsed as Required<ImportRequestBody>;

    const columns = await loadColumns(table);
    const requiredColumns = columns.filter((c) => c.required).map((c) => c.name);
    const mappedTargets = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const missingRequiredColumns = requiredColumns.filter((c) => !mappedTargets.has(c));

    let validCount = 0;
    let invalidCount = 0;
    const sample: Array<{ rowNumber: number; data: Row; errors: string[] }> = [];

    rows.forEach((rawRow, idx) => {
      const { row, errors } = buildAndValidateRow(rawRow, mapping, columns, cfg.validate);
      if (errors.length === 0) validCount += 1;
      else invalidCount += 1;
      if (sample.length < PREVIEW_SAMPLE_SIZE) {
        sample.push({ rowNumber: idx + 1, data: row, errors });
      }
    });

    res.json({
      table,
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      missingRequiredColumns,
      sample,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** Inserts one already-validated, coerced row and returns its new id. Mirrors crudWrite.createHandler. */
async function insertRow(
  table: string,
  columns: ImportColumnMeta[],
  cfg: NonNullable<ReturnType<typeof getImportTable>>,
  mappedRow: Row,
): Promise<void> {
  const columnNames = columns.map((c) => c.name);
  const id = crypto.randomUUID();
  const ts = nowIso();

  const insertCols = columnNames.filter(
    (c) => c !== "id" && c !== "created_at" && c !== "updated_at" && c in mappedRow,
  );
  const timestampCols = ["created_at", "updated_at"].filter((c) => columnNames.includes(c));
  if (cfg.autoAssetId && columnNames.includes("asset_id") && !insertCols.includes("asset_id")) {
    insertCols.push("asset_id");
  }
  const allCols = ["id", ...insertCols, ...timestampCols];
  const values: unknown[] = allCols.map((c) => {
    if (c === "id") return id;
    if (c === "created_at" || c === "updated_at") return ts;
    let v = mappedRow[c];
    if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
    return v === undefined ? null : v;
  });
  const placeholders = allCols.map(() => "?").join(", ");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (cfg.autoAssetId && columnNames.includes("asset_id") && !mappedRow.asset_id) {
      const generated = await reserveAssetId(connection, table, mappedRow);
      if (generated) {
        const idx = allCols.indexOf("asset_id");
        if (idx >= 0) values[idx] = generated;
      }
    }
    await connection.execute(
      `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`,
      values as any[],
    );
    if (cfg.afterInsert) await cfg.afterInsert(connection, id, mappedRow);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** POST /api/import/:table - validates and inserts every row, row by row, collecting a summary. */
export async function runImport(req: Request, res: Response) {
  try {
    const table = String(req.params.table);
    const cfg = getImportTable(table);
    if (!cfg) return res.status(404).json({ error: "Unknown import target" });

    const parsed = readRowsAndMapping(req, res);
    if (!parsed) return;
    const { rows, mapping } = parsed as Required<ImportRequestBody>;

    const columns = await loadColumns(table);
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;
    let skipped = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const { row, errors: rowErrors } = buildAndValidateRow(
        rows[idx],
        mapping,
        columns,
        cfg.validate,
      );
      if (rowErrors.length > 0) {
        skipped += 1;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({ row: idx + 1, message: rowErrors.join("; ") });
        }
        continue;
      }
      try {
        await insertRow(table, columns, cfg, row);
        imported += 1;
      } catch (err) {
        skipped += 1;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({ row: idx + 1, message: (err as Error).message });
        }
      }
    }

    res.json({
      table,
      totalRows: rows.length,
      imported,
      skipped,
      errors,
      truncatedErrors: skipped > errors.length,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
