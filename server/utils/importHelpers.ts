import { db } from "./db.js";
import { BOOLEAN_COLUMNS } from "./crudHelpers.js";
import type { Row } from "../types.js";

/** Column metadata used to drive the mapping UI and row validation. */
export interface ImportColumnMeta {
  name: string;
  dataType: string; // MySQL INFORMATION_SCHEMA.DATA_TYPE, e.g. "varchar", "int", "text"
  maxLength: number | null;
  /** True if the DB will reject a NULL and the column isn't auto-populated by the server. */
  required: boolean;
  /** True if the server fills this column itself (id, timestamps, generated asset_id, audit fields). */
  systemManaged: boolean;
}

/** Columns every table has that are always filled in by the server, never by the CSV. */
const BASE_SYSTEM_COLUMNS = new Set([
  "id",
  "created_at",
  "updated_at",
  "registered_by",
  "created_by",
  "password_hash",
]);

/**
 * Reads column metadata for a table straight from INFORMATION_SCHEMA, the
 * same source crudHelpers.getColumns uses for the generic CRUD routes.
 * `extraSystemColumns` lets a table mark additional columns (e.g. an
 * auto-generated asset_id) as server-managed rather than CSV-mappable.
 */
export async function getImportColumnMeta(
  table: string,
  extraSystemColumns: string[] = [],
): Promise<ImportColumnMeta[]> {
  const systemCols = new Set([...BASE_SYSTEM_COLUMNS, ...extraSystemColumns]);
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
       ORDER BY ORDINAL_POSITION`,
      [table],
    );
    return (rows as Row[]).map((r) => {
      const name = String(r.COLUMN_NAME);
      const isNullable = r.IS_NULLABLE === "YES";
      const hasDefault =
        r.COLUMN_DEFAULT !== null && r.COLUMN_DEFAULT !== undefined;
      const systemManaged = systemCols.has(name);
      return {
        name,
        dataType: String(r.DATA_TYPE),
        maxLength:
          r.CHARACTER_MAXIMUM_LENGTH === null
            ? null
            : Number(r.CHARACTER_MAXIMUM_LENGTH),
        required: !systemManaged && !isNullable && !hasDefault,
        systemManaged,
      };
    });
  } finally {
    connection.release();
  }
}

const INTEGER_TYPES = new Set([
  "int",
  "tinyint",
  "smallint",
  "mediumint",
  "bigint",
]);

/**
 * Converts a raw CSV cell (always a string, possibly empty) into the value
 * that should be bound into the SQL statement for the given column.
 * Throws a user-facing message on the first type mismatch found.
 */
export function coerceCellValue(raw: string, col: ImportColumnMeta): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (BOOLEAN_COLUMNS.has(col.name)) {
    const normalized = trimmed.toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) return 1;
    if (["0", "false", "no", "n"].includes(normalized)) return 0;
    throw new Error(`"${raw}" is not a valid true/false value for ${col.name}`);
  }

  if (INTEGER_TYPES.has(col.dataType)) {
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(`"${raw}" is not a whole number for ${col.name}`);
    }
    return Number(trimmed);
  }

  if (
    col.dataType === "decimal" ||
    col.dataType === "float" ||
    col.dataType === "double"
  ) {
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error(`"${raw}" is not a valid number for ${col.name}`);
    }
    return Number(trimmed);
  }

  if (col.maxLength !== null && trimmed.length > col.maxLength) {
    throw new Error(
      `${col.name} is too long (${trimmed.length} characters, max ${col.maxLength})`,
    );
  }

  return trimmed;
}

/** Result of mapping + validating a single CSV row against a target table. */
export interface RowValidationResult {
  /** Coerced values keyed by target DB column name, ready to bind into an INSERT. */
  row: Row;
  errors: string[];
}

/**
 * Applies a CSV-header -> DB-column mapping to one raw row, coerces every
 * mapped cell to the right JS type for its column, checks that every
 * required (NOT NULL, no default, not server-managed) column ended up
 * with a value, and finally runs the table's business-rule validator
 * (the same one the manual-entry REST endpoint uses) against the result.
 * Never throws - all problems are collected into `errors`.
 */
export function buildAndValidateRow(
  rawRow: Record<string, string>,
  mapping: Record<string, string | null>,
  columns: ImportColumnMeta[],
  validate?: (body: Row) => void,
): RowValidationResult {
  const errors: string[] = [];
  const mapped: Row = {};
  const columnByName = new Map(columns.map((c) => [c.name, c]));

  for (const [csvHeader, target] of Object.entries(mapping)) {
    if (!target) continue;
    const col = columnByName.get(target);
    if (!col || col.systemManaged) continue;
    const raw = rawRow[csvHeader] ?? "";
    try {
      const value = coerceCellValue(raw, col);
      if (value !== null) mapped[target] = value;
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  for (const col of columns) {
    if (col.required && mapped[col.name] === undefined) {
      errors.push(`${col.name} is required`);
    }
  }

  if (validate) {
    try {
      validate(mapped);
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  return { row: mapped, errors };
}
