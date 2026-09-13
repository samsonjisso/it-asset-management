import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { pool, nowSql } from "@/server/lib/db";
import type { AuthContext } from "@/server/lib/auth";

// Keep this list explicit: only application tables are included, never
// information_schema or arbitrary tables in the configured database.
export const BACKUP_TABLES = [
  "profiles", "audit_log", "departments", "license_types", "license_subtypes",
  "device_types", "device_owners", "server_owners", "vendors", "server_types",
  "server_environments", "os_releases", "host_locations", "floors",
  "access_switches", "access_switch_ips", "patch_levels", "ip_subnets",
  "asset_models", "reminder_types", "pc_form_fields", "ip_form_fields",
  "ip_addresses", "licenses", "pc_registrations", "devices", "servers",
  "reminders", "notifications", "assets", "asset_id_counters",
] as const;

export interface BackupDocument {
  format: "gbb-mariadb-backup";
  version: 1;
  created_at: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function createBackup(): Promise<BackupDocument> {
  const tables: BackupDocument["tables"] = {};
  for (const table of BACKUP_TABLES) {
    const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
      `SELECT * FROM \`${table}\``,
    );
    tables[table] = rows;
  }
  return {
    format: "gbb-mariadb-backup",
    version: 1,
    created_at: new Date().toISOString(),
    tables,
  };
}

function validateBackup(value: unknown): asserts value is BackupDocument {
  if (!value || typeof value !== "object") throw new Error("Invalid backup file");
  const backup = value as Partial<BackupDocument>;
  if (backup.format !== "gbb-mariadb-backup" || backup.version !== 1) {
    throw new Error("Unsupported backup format or version");
  }
  if (!backup.tables || typeof backup.tables !== "object") {
    throw new Error("Backup does not contain table data");
  }
  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== "object")) {
      throw new Error(`Invalid data for table ${table}`);
    }
  }
}

export async function restoreBackup(value: unknown): Promise<void> {
  validateBackup(value);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of [...BACKUP_TABLES].reverse()) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
    for (const table of BACKUP_TABLES) {
      const [columnRows] = await connection.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name = ?`,
        [table],
      );
      const allowedColumns = new Set(
        columnRows.map((row) => String(row.COLUMN_NAME)),
      );
      const rows = value.tables[table] || [];
      for (const rawRow of rows) {
        const row = rawRow as Record<string, unknown>;
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        if (columns.some((column) => !allowedColumns.has(column))) {
          throw new Error(`Invalid column in table ${table}`);
        }
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((column) => {
          const item = row[column];
          return item !== null && typeof item === "object"
            ? JSON.stringify(item)
            : item;
        });
        await connection.query(
          `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${placeholders})`,
          values,
        );
      }
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {
      // The connection is released immediately below.
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function recordRestoreAudit(
  auth: AuthContext,
  result: "succeeded" | "failed",
  detail?: string,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log
        (id, action, table_name, record_id, record_label, after_data, actor_id, actor_name, created_at)
       VALUES (?, 'backup_restore', 'database', NULL, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        `Database restore ${result}`,
        JSON.stringify({ result, detail: detail?.slice(0, 500) || null }),
        auth.id,
        auth.full_name || auth.email || "Unknown user",
        nowSql(),
      ],
    );
  } catch (error) {
    console.error("Failed to record restore audit event:", error);
  }
}

export function backupFilename(): string {
  return `gbb-mariadb-${nowSql().replace(/[: ]/g, "-")}-${crypto.randomUUID().slice(0, 8)}.json`;
}