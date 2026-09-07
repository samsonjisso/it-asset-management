import crypto from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { pool, withTransaction, nowSql } from '@/server/lib/db';
import { generateAssetId } from '@/server/lib/assetId';
import { ApiError } from '@/server/lib/http';
import { requireModule as requireModuleAccess, requireRole as requireRoleAccess } from '@/server/middlewares/withAuth';
import type { AuthContext } from '@/server/lib/auth';
import { BOOLEAN_COLUMNS, NOTIFY_SKIP_COLUMNS, TABLE_MODULE_MAP } from '@/server/lib/constants';

export type Row = Record<string, any>;

export interface CrudHookCtx {
  conn: PoolConnection;
  auth: AuthContext;
}

export type BeforeInsertHook = (body: Row, ctx: CrudHookCtx) => Promise<void> | void;
export type BeforeUpdateHook = (body: Row, ctx: CrudHookCtx, id: string) => Promise<void> | void;
export type BeforeDeleteHook = (
  row: Row,
  ctx: CrudHookCtx
) => Promise<{ status: number; message: string } | null> | { status: number; message: string } | null;
export type DecorateHook = (row: Row, conn: PoolConnection) => Promise<Row> | Row;

export interface NotifyConfig {
  type: string;
  label: (row: Row) => string;
  fieldLabels?: Record<string, string>;
}

export interface CrudTableConfig {
  table: string;
  insertRoles: string[];
  updateRoles: string[];
  deleteRoles: string[];
  /** Overrides TABLE_MODULE_MAP when set (used by device_owners, which has its own module key). */
  moduleKey?: string;
  withDepartment?: boolean;
  autoAssetId?: boolean;
  immutableCols?: string[];
  beforeInsert?: BeforeInsertHook;
  beforeUpdate?: BeforeUpdateHook;
  beforeDelete?: BeforeDeleteHook;
  decorate?: DecorateHook;
  notify?: NotifyConfig;
}

// ---------------------------------------------------------------------
// Column introspection (cached — the schema doesn't change at runtime)
// ---------------------------------------------------------------------

const columnCache = new Map<string, string[]>();

export async function getColumns(table: string): Promise<string[]> {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const [rows] = await pool.query<any[]>(
    'SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION',
    [table]
  );
  const cols = rows.map((r) => r.name as string);
  columnCache.set(table, cols);
  return cols;
}

function rowToJson(row: Row | undefined, columns: string[]): Row | null {
  if (!row) return null;
  const out: Row = { ...row };
  for (const col of columns) {
    if (BOOLEAN_COLUMNS.has(col) && col in out) out[col] = !!out[col];
  }
  delete out.password_hash;
  return out;
}

async function attachDepartment(row: Row | null): Promise<Row | null> {
  if (!row) return row;
  if (row.department_id) {
    const [rows] = await pool.query<any[]>('SELECT * FROM departments WHERE id = ?', [row.department_id]);
    const dept = rows[0];
    row.department = dept ? { ...dept, is_branch: !!dept.is_branch } : null;
  } else {
    row.department = null;
  }
  return row;
}

function moduleKeyFor(config: CrudTableConfig): string | undefined {
  return config.moduleKey || TABLE_MODULE_MAP[config.table];
}

function assertAccess(config: CrudTableConfig, auth: AuthContext): void {
  const moduleKey = moduleKeyFor(config);
  if (moduleKey) requireModuleAccess(auth, moduleKey);
}

// ---------------------------------------------------------------------
// Admin Change Notifications (ported from crud.js)
// ---------------------------------------------------------------------

function humanizeColumn(col: string, fieldLabels?: Record<string, string>): string {
  if (fieldLabels && fieldLabels[col]) return fieldLabels[col];
  return col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatNotifyValue(v: any): any {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (v === 0 || v === 1) return v;
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

export function describeChanges(
  updateCols: string[],
  beforeRow: Row | null,
  afterValues: any[],
  booleanColumns: Set<string>,
  fieldLabels?: Record<string, string>
): string | null {
  const changed: string[] = [];
  updateCols.forEach((col, i) => {
    if (NOTIFY_SKIP_COLUMNS.has(col)) return;
    const before = beforeRow ? beforeRow[col] : undefined;
    const after = afterValues[i];
    if (String(before ?? '') === String(after ?? '')) return;
    const fmt = (v: any) => (booleanColumns.has(col) ? (v ? 'Yes' : 'No') : formatNotifyValue(v));
    changed.push(`${humanizeColumn(col, fieldLabels)}: ${fmt(before)} → ${fmt(after)}`);
  });
  if (changed.length === 0) return null;
  const shown = changed.slice(0, 6);
  if (changed.length > shown.length) shown.push(`and ${changed.length - shown.length} more field(s)`);
  return shown.join('; ');
}

export async function recordNotification(
  conn: PoolConnection,
  opts: {
    action: 'update' | 'delete';
    tableName: string;
    recordType: string;
    recordId: string | null;
    recordLabel: string | null;
    summary: string;
    actor: AuthContext;
  }
): Promise<void> {
  try {
    await conn.query(
      `INSERT INTO notifications (id, action, table_name, record_type, record_id, record_label, summary, actor_id, actor_name, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        crypto.randomUUID(),
        opts.action,
        opts.tableName,
        opts.recordType,
        opts.recordId,
        opts.recordLabel,
        opts.summary,
        opts.actor.id,
        opts.actor.full_name || opts.actor.email || 'Unknown user',
        nowSql(),
      ]
    );
  } catch (err) {
    console.error('Failed to record notification:', err);
  }
}

// ---------------------------------------------------------------------
// List / Get
// ---------------------------------------------------------------------

const ALLOWED_QUERY_SUFFIXES = ['_gte', '_lte'];

export async function listRows(config: CrudTableConfig, auth: AuthContext, searchParams: URLSearchParams): Promise<Row[]> {
  assertAccess(config, auth);
  const columns = await getColumns(config.table);
  const clauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (key === 'order' || key === 'ascending' || key === 'limit') continue;
    const gteMatch = key.endsWith('_gte') && columns.includes(key.slice(0, -4));
    const lteMatch = key.endsWith('_lte') && columns.includes(key.slice(0, -4));
    if (gteMatch) {
      clauses.push(`${key.slice(0, -4)} >= ?`);
      params.push(value);
    } else if (lteMatch) {
      clauses.push(`${key.slice(0, -4)} <= ?`);
      params.push(value);
    } else if (columns.includes(key)) {
      if (value === 'true' || value === 'false') {
        clauses.push(`${key} = ?`);
        params.push(value === 'true' ? 1 : 0);
      } else {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }
  }

  let sql = `SELECT * FROM ${config.table}`;
  if (clauses.length) sql += ` WHERE ${clauses.join(' AND ')}`;
  const orderParam = searchParams.get('order');
  const orderCol = orderParam && columns.includes(orderParam) ? orderParam : null;
  if (orderCol) {
    const dir = searchParams.get('ascending') === 'false' ? 'DESC' : 'ASC';
    sql += ` ORDER BY \`${orderCol}\` ${dir}`;
  }
  const limitParam = Number(searchParams.get('limit'));
  if (Number.isFinite(limitParam) && limitParam > 0) {
    sql += ` LIMIT ${Math.min(limitParam, 1000)}`;
  }

  const [rawRows] = await pool.query<any[]>(sql, params);
  let rows: (Row | null)[] = rawRows.map((r) => rowToJson(r, columns));
  if (config.withDepartment) rows = await Promise.all(rows.map((r) => attachDepartment(r)));
  if (config.decorate) rows = await Promise.all(rows.map((r) => (r ? config.decorate!(r, pool as any) : r)));
  return rows.filter((r): r is Row => r !== null);
}

export async function getRowById(config: CrudTableConfig, auth: AuthContext, id: string): Promise<Row> {
  assertAccess(config, auth);
  const columns = await getColumns(config.table);
  const [rows] = await pool.query<any[]>(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
  let row = rowToJson(rows[0], columns);
  if (!row) throw new ApiError(404, 'Not found');
  if (config.withDepartment) row = await attachDepartment(row);
  if (config.decorate) row = await config.decorate(row!, pool as any);
  return row!;
}

// ---------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------

export async function createRow(config: CrudTableConfig, auth: AuthContext, body: Row): Promise<Row> {
  assertAccess(config, auth);
  requireRoleAccess(auth, config.insertRoles);
  const columns = await getColumns(config.table);
  const workingBody: Row = { ...body };

  const result = await withTransaction(async (conn) => {
    if (config.beforeInsert) {
      try {
        await config.beforeInsert(workingBody, { conn, auth });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError((err as any)?.status || 400, (err as Error).message);
      }
    }

    const id = crypto.randomUUID();
    const ts = nowSql();
    const insertCols = columns.filter(
      (c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && c !== 'asset_id' && c in workingBody
    );

    let generatedAssetId: string | null = null;
    if (config.autoAssetId && columns.includes('asset_id')) {
      generatedAssetId = await generateAssetId(conn, config.table, workingBody);
      if (generatedAssetId) insertCols.push('asset_id');
    }

    const timestampCols = ['created_at', 'updated_at'].filter((c) => columns.includes(c));
    const allCols = ['id', ...insertCols, ...timestampCols];
    const values = allCols.map((c) => {
      if (c === 'id') return id;
      if (c === 'created_at' || c === 'updated_at') return ts;
      if (c === 'asset_id') return generatedAssetId;
      let v = workingBody[c];
      if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
      if (v !== null && typeof v === 'object') v = JSON.stringify(v);
      return v === undefined ? null : v;
    });
    const placeholders = allCols.map(() => '?').join(', ');

    try {
      await conn.query(
        `INSERT INTO ${config.table} (${allCols.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
        values
      );
    } catch (err: any) {
      throw new ApiError(400, err?.sqlMessage || err?.message || 'Insert failed');
    }

    const [rows] = await conn.query<any[]>(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
    return rowToJson(rows[0], columns);
  });

  let json = result;
  if (config.withDepartment) json = await attachDepartment(json);
  if (config.decorate && json) json = await config.decorate(json, pool as any);
  return json!;
}

// ---------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------

export async function updateRow(config: CrudTableConfig, auth: AuthContext, id: string, body: Row): Promise<Row> {
  assertAccess(config, auth);
  requireRoleAccess(auth, config.updateRoles);
  const columns = await getColumns(config.table);
  const workingBody: Row = { ...body };

  const { json } = await withTransaction(async (conn) => {
    if (config.beforeUpdate) {
      try {
        await config.beforeUpdate(workingBody, { conn, auth }, id);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError((err as any)?.status || 400, (err as Error).message);
      }
    }

    const locked = new Set(['asset_id', ...(config.immutableCols || [])]);
    const updateCols = columns.filter((c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && !locked.has(c) && c in workingBody);
    if (updateCols.length === 0 && !columns.includes('updated_at')) {
      throw new ApiError(400, 'No valid fields to update');
    }

    const beforeRow = config.notify
      ? rowToJson((await conn.query<any[]>(`SELECT * FROM ${config.table} WHERE id = ?`, [id]))[0][0], columns)
      : null;

    const setCols = [...updateCols];
    const values = updateCols.map((c) => {
      let v = workingBody[c];
      if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
      if (v !== null && typeof v === 'object') v = JSON.stringify(v);
      return v === undefined ? null : v;
    });
    if (columns.includes('updated_at')) {
      setCols.push('updated_at');
      values.push(nowSql());
    }
    const setSql = setCols.map((c) => `\`${c}\` = ?`).join(', ');

    let changedRows: number;
    try {
      const [result]: any = await conn.query(`UPDATE ${config.table} SET ${setSql} WHERE id = ?`, [...values, id]);
      changedRows = result.affectedRows;
    } catch (err: any) {
      throw new ApiError(400, err?.sqlMessage || err?.message || 'Update failed');
    }
    if (changedRows === 0) throw new ApiError(404, 'Not found');

    const [rows] = await conn.query<any[]>(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
    const updated = rowToJson(rows[0], columns)!;

    let summary: string | null = null;
    if (config.notify && beforeRow) {
      summary = describeChanges(updateCols, beforeRow, values, BOOLEAN_COLUMNS, config.notify.fieldLabels);
      if (summary) {
        await recordNotification(conn, {
          action: 'update',
          tableName: config.table,
          recordType: config.notify.type,
          recordId: id,
          recordLabel: config.notify.label(updated),
          summary,
          actor: auth,
        });
      }
    }

    return { json: updated };
  });

  let out = json;
  if (config.withDepartment) out = await attachDepartment(out);
  if (config.decorate && out) out = await config.decorate(out, pool as any);
  return out!;
}

// ---------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------

export async function deleteRow(config: CrudTableConfig, auth: AuthContext, id: string): Promise<void> {
  assertAccess(config, auth);
  requireRoleAccess(auth, config.deleteRoles);
  const columns = await getColumns(config.table);

  await withTransaction(async (conn) => {
    const needsExisting = !!config.beforeDelete || !!config.notify;
    let existing: Row | null = null;
    if (needsExisting) {
      const [rows] = await conn.query<any[]>(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
      existing = rowToJson(rows[0], columns);
    }
    if (config.beforeDelete && existing) {
      const err = await config.beforeDelete(existing, { conn, auth });
      if (err) throw new ApiError(err.status, err.message);
    }
    const [result]: any = await conn.query(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
    if (result.affectedRows === 0) throw new ApiError(404, 'Not found');
    if (config.notify && existing) {
      await recordNotification(conn, {
        action: 'delete',
        tableName: config.table,
        recordType: config.notify.type,
        recordId: id,
        recordLabel: config.notify.label(existing),
        summary: 'Record deleted',
        actor: auth,
      });
    }
  });
}
