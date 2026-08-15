import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { db, nowIso } from './db.js';
import { requireAuth, requireRole, type UserRole } from './auth.js';

export type Row = Record<string, unknown>;

const BOOLEAN_COLUMNS = new Set([
  'is_branch',
  'is_active',
  'alert_sent',
  'is_notified',
  'is_dismissed',
  'email_sent',
]);

async function getColumns(table: string): Promise<string[]> {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION`,
      [table]
    );
    return (rows as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME);
  } finally {
    connection.release();
  }
}

function rowToJson(row: Row | undefined, columns: string[]): Row | undefined {
  if (!row) return row;
  const out: Row = { ...row };
  for (const col of columns) {
    if (BOOLEAN_COLUMNS.has(col) && col in out) out[col] = !!out[col];
  }
  delete out.password_hash;
  return out;
}

async function attachDepartment(row: Row | undefined): Promise<Row | undefined> {
  if (!row) return row;
  if (row.department_id) {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM departments WHERE id = ?', [
        row.department_id as string,
      ]);
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

export interface CrudRouterOptions {
  insertRoles?: UserRole[];
  updateRoles?: UserRole[];
  deleteRoles?: UserRole[];
  withDepartment?: boolean;
}

/**
 * Creates a REST router for a table, mirroring the subset of the
 * Supabase query builder the frontend relies on: list with eq/gte/lte
 * filters + ordering, get by id, insert, update, delete.
 */
export function createCrudRouter(table: string, opts: CrudRouterOptions = {}) {
  const {
    insertRoles = ['admin', 'manager', 'register_user'],
    updateRoles = ['admin', 'manager', 'register_user'],
    deleteRoles = ['admin', 'manager'],
    withDepartment = false,
  } = opts;

  const router = Router();
  let columns: string[] = [];

  // Initialize columns
  getColumns(table).then((cols) => {
    columns = cols;
  });

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const clauses: string[] = [];
      const params: unknown[] = [];

      for (const [key, value] of Object.entries(req.query)) {
        if (key === 'order' || key === 'ascending') continue;
        if (key.endsWith('_gte') && columns.includes(key.slice(0, -4))) {
          clauses.push(`${key.slice(0, -4)} >= ?`);
          params.push(value);
        } else if (key.endsWith('_lte') && columns.includes(key.slice(0, -4))) {
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

      let sql = `SELECT * FROM ${table}`;
      if (clauses.length) sql += ` WHERE ${clauses.join(' AND ')}`;
      const orderCol =
        typeof req.query.order === 'string' && columns.includes(req.query.order) ? req.query.order : null;
      if (orderCol) {
        const dir = req.query.ascending === 'false' ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${orderCol} ${dir}`;
      }

      const connection = await db.getConnection();
      try {
        const [rows] = await connection.execute(sql, params as any[]);
        let jsonRows = (rows as Row[]).map((r) => rowToJson(r, columns) as Row);
        if (withDepartment) {
          jsonRows = await Promise.all(jsonRows.map((r) => attachDepartment(r) as Promise<Row>));
        }
        res.json(jsonRows);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const connection = await db.getConnection();
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
        const row = (rows as Row[])[0];
        if (!row) return res.status(404).json({ error: 'Not found' });
        let json: Row | undefined = rowToJson(row, columns);
        if (withDepartment) json = await attachDepartment(json);
        res.json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/', requireRole(...insertRoles), async (req: Request, res: Response) => {
    try {
      const body: Row = req.body || {};
      const id = crypto.randomUUID();
      const ts = nowIso();
      const insertCols = columns.filter(
        (c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && c in body
      );
      const timestampCols = ['created_at', 'updated_at'].filter((c) => columns.includes(c));
      const allCols = ['id', ...insertCols, ...timestampCols];
      const values: any[] = allCols.map((c) => {
        if (c === 'id') return id;
        if (c === 'created_at' || c === 'updated_at') return ts;
        let v = body[c];
        if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
        return v === undefined ? null : v;
      });
      const placeholders = allCols.map(() => '?').join(', ');
      const connection = await db.getConnection();
      try {
        await connection.execute(
          `INSERT INTO ${table} (${allCols.join(', ')}) VALUES (${placeholders})`,
          values as any[]
        );
        const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        const row = (rows as Row[])[0];
        let json: Row | undefined = rowToJson(row, columns);
        if (withDepartment) json = await attachDepartment(json);
        res.status(201).json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.patch('/:id', requireRole(...updateRoles), async (req: Request, res: Response) => {
    try {
      const body: Row = req.body || {};
      const updateCols = columns.filter(
        (c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && c in body
      );
      if (updateCols.length === 0 && !columns.includes('updated_at')) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      const setCols = [...updateCols];
      const values: any[] = updateCols.map((c) => {
        let v = body[c];
        if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
        return v === undefined ? null : v;
      });
      if (columns.includes('updated_at')) {
        setCols.push('updated_at');
        values.push(nowIso());
      }
      values.push(req.params.id);
      const setSql = setCols.map((c) => `${c} = ?`).join(', ');
      const connection = await db.getConnection();
      try {
        const result = await connection.execute(
          `UPDATE ${table} SET ${setSql} WHERE id = ?`,
          values as any[]
        );
        if ((result[0] as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
        const row = (rows as Row[])[0];
        let json: Row | undefined = rowToJson(row, columns);
        if (withDepartment) json = await attachDepartment(json);
        res.json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.delete('/:id', requireRole(...deleteRoles), async (req: Request, res: Response) => {
    try {
      const connection = await db.getConnection();
      try {
        const result = await connection.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
        if ((result[0] as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
