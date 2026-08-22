import { db } from "./db.js";
import type { Row } from "../types.js";

export const BOOLEAN_COLUMNS = new Set([
  "is_branch",
  "is_active",
  "alert_sent",
  "is_notified",
  "is_dismissed",
  "email_sent",
]);

export async function getColumns(table: string): Promise<string[]> {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION`,
      [table],
    );
    return (rows as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME);
  } finally {
    connection.release();
  }
}

export function rowToJson(
  row: Row | undefined,
  columns: string[],
): Row | undefined {
  if (!row) return row;
  const out: Row = { ...row };
  for (const col of columns) {
    if (BOOLEAN_COLUMNS.has(col) && col in out) out[col] = !!out[col];
  }
  delete out.password_hash;
  return out;
}

export async function attachIpRelations(
  row: Row | undefined,
): Promise<Row | undefined> {
  if (!row || !row.id) return row;
  const connection = await db.getConnection();
  try {
    const relationId = String(row.id);
    const [pc] = await connection.execute(
      "SELECT id, asset_id, hostname FROM pc_registrations WHERE ip_address_id = ?",
      [relationId],
    );
    const [devices] = await connection.execute(
      "SELECT id, asset_id, hostname, device_type FROM devices WHERE ip_address_id = ?",
      [relationId],
    );
    const [servers] = await connection.execute(
      "SELECT id, asset_id, hostname, server_type FROM servers WHERE ip_address_id = ?",
      [relationId],
    );
    row.related_assets = {
      pc: (pc as Row[])[0] ?? null,
      device: (devices as Row[])[0] ?? null,
      server: (servers as Row[])[0] ?? null,
    };
  } finally {
    connection.release();
  }
  return row;
}

export async function attachDepartment(
  row: Row | undefined,
): Promise<Row | undefined> {
  if (!row) return row;
  if (row.department_id) {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM departments WHERE id = ?",
        [row.department_id as string],
      );
      const dept = (rows as Row[])[0] as Row | undefined;
      row.department = dept ? { ...dept, is_branch: !!dept.is_branch } : null;
    } finally {
      connection.release();
    }
  } else {
    row.department = null;
  }
  return row;
}
