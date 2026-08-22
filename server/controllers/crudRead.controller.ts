import type { Request, Response } from "express";
import { db } from "../utils/db.js";
import {
  rowToJson,
  attachDepartment,
  attachIpRelations,
} from "../utils/crudHelpers.js";
import type { CrudContext, Row } from "../types.js";

/**
 * GET / - list rows for a table, with eq/gte/lte filters + ordering,
 * mirroring the subset of the Supabase query builder the frontend relies
 * on. Logic is unchanged from the original createCrudRouter's inline
 * handler; only the surrounding router wiring moved to routes/crud.routes.ts.
 */
export function listHandler({ table, opts, columnsState }: CrudContext) {
  const { withDepartment = false, withIpRelations = false } = opts;

  return async (req: Request, res: Response) => {
    try {
      const columns = columnsState.columns;
      const clauses: string[] = [];
      const params: unknown[] = [];

      for (const [key, value] of Object.entries(req.query)) {
        if (key === "order" || key === "ascending") continue;
        if (key.endsWith("_gte") && columns.includes(key.slice(0, -4))) {
          clauses.push(`${key.slice(0, -4)} >= ?`);
          params.push(value);
        } else if (key.endsWith("_lte") && columns.includes(key.slice(0, -4))) {
          clauses.push(`${key.slice(0, -4)} <= ?`);
          params.push(value);
        } else if (columns.includes(key)) {
          if (value === "true" || value === "false") {
            clauses.push(`${key} = ?`);
            params.push(value === "true" ? 1 : 0);
          } else {
            clauses.push(`${key} = ?`);
            params.push(value);
          }
        }
      }

      let sql = `SELECT * FROM ${table}`;
      if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
      const orderCol =
        typeof req.query.order === "string" && columns.includes(req.query.order)
          ? req.query.order
          : null;
      if (orderCol) {
        const dir = req.query.ascending === "false" ? "DESC" : "ASC";
        sql += ` ORDER BY ${orderCol} ${dir}`;
      }

      const connection = await db.getConnection();
      try {
        const [rows] = await connection.execute(sql, params as any[]);
        let jsonRows = (rows as Row[]).map((r) => rowToJson(r, columns) as Row);
        if (withDepartment) {
          jsonRows = await Promise.all(
            jsonRows.map((r) => attachDepartment(r) as Promise<Row>),
          );
        }
        if (withIpRelations) {
          jsonRows = await Promise.all(
            jsonRows.map((r) => attachIpRelations(r) as Promise<Row>),
          );
        }
        res.json(jsonRows);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}

/** GET /:id - fetch a single row by id. */
export function getOneHandler({ table, opts, columnsState }: CrudContext) {
  const { withDepartment = false, withIpRelations = false } = opts;

  return async (req: Request, res: Response) => {
    try {
      const connection = await db.getConnection();
      try {
        const [rows] = await connection.execute(
          `SELECT * FROM ${table} WHERE id = ?`,
          [req.params.id],
        );
        const row = (rows as Row[])[0];
        if (!row) return res.status(404).json({ error: "Not found" });
        let json: Row | undefined = rowToJson(row, columnsState.columns);
        if (withDepartment) json = await attachDepartment(json);
        if (withIpRelations) json = await attachIpRelations(json);
        res.json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
