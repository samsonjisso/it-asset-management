import type { Request, Response } from "express";
import crypto from "node:crypto";
import { db, nowIso } from "../utils/db.js";
import {
  rowToJson,
  attachDepartment,
  attachIpRelations,
  BOOLEAN_COLUMNS,
} from "../utils/crudHelpers.js";
import { reserveAssetId } from "../utils/assetId.js";
import type { CrudContext, Row } from "../types.js";
import { slugifyCode } from "../utils/slugifyCode.js";

/** POST / - insert a row, optionally auto-generating asset_id and running afterInsert. */
export function createHandler({ table, opts, columnsState }: CrudContext) {
  const {
    withDepartment = false,
    withIpRelations = false,
    autoAssetId = false,
    autoCode = false,
    afterInsert,
  } = opts;

  return async (req: Request, res: Response) => {
    try {
      const columns = columnsState.columns;
      const body: Row = req.body || {};
      const id = crypto.randomUUID();
      const ts = nowIso();
      const insertCols = columns.filter(
        (c) =>
          c !== "id" && c !== "created_at" && c !== "updated_at" && c in body,
      );
      const timestampCols = ["created_at", "updated_at"].filter((c) =>
        columns.includes(c),
      );
      if (
        autoAssetId &&
        columns.includes("asset_id") &&
        !insertCols.includes("asset_id")
      )
        insertCols.push("asset_id");

      if (autoCode && columns.includes("code") && !insertCols.includes("code"))
        insertCols.push("code");

      const allCols = ["id", ...insertCols, ...timestampCols];
      const values: any[] = allCols.map((c) => {
        if (c === "id") return id;
        if (c === "created_at" || c === "updated_at") return ts;
        let v = body[c];
        if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
        if (c === "code" && (v === undefined || v === null || v === "")) {
          v = slugifyCode(String(body.label ?? "")); // NEW
        }
        return v === undefined ? null : v;
      });
      const placeholders = allCols.map(() => "?").join(", ");
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        if (autoAssetId && columns.includes("asset_id") && !body.asset_id) {
          const generated = await reserveAssetId(connection, table, body);
          if (generated) {
            const idx = allCols.indexOf("asset_id");
            if (idx >= 0) values[idx] = generated;
          }
        }
        await connection.execute(
          `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`,
          values as any[],
        );
        if (afterInsert) await afterInsert(connection, id, body);
        await connection.commit();
        const [rows] = await connection.execute(
          `SELECT * FROM ${table} WHERE id = ?`,
          [id],
        );
        const row = (rows as Row[])[0];
        let json: Row | undefined = rowToJson(row, columns);
        if (withDepartment) json = await attachDepartment(json);
        if (withIpRelations) json = await attachIpRelations(json);
        res.status(201).json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };
}

/** PATCH /:id - partial update, running afterUpdate on success. */
export function updateHandler({ table, opts, columnsState }: CrudContext) {
  const { withDepartment = false, withIpRelations = false, afterUpdate } = opts;

  return async (req: Request, res: Response) => {
    try {
      const columns = columnsState.columns;
      const body: Row = req.body || {};
      const updateCols = columns.filter(
        (c) =>
          c !== "id" && c !== "created_at" && c !== "updated_at" && c in body,
      );
      if (updateCols.length === 0 && !columns.includes("updated_at")) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const setCols = [...updateCols];
      const values: any[] = updateCols.map((c) => {
        let v = body[c];
        if (BOOLEAN_COLUMNS.has(c)) v = v ? 1 : 0;
        return v === undefined ? null : v;
      });
      if (columns.includes("updated_at")) {
        setCols.push("updated_at");
        values.push(nowIso());
      }
      values.push(req.params.id);
      const setSql = setCols.map((c) => `${c} = ?`).join(", ");
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const result = await connection.execute(
          `UPDATE ${table} SET ${setSql} WHERE id = ?`,
          values as any[],
        );
        if ((result[0] as any).affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({ error: "Not found" });
        }
        if (afterUpdate)
          await afterUpdate(connection, String(req.params.id), body);
        await connection.commit();
        const [rows] = await connection.execute(
          `SELECT * FROM ${table} WHERE id = ?`,
          [req.params.id],
        );
        const row = (rows as Row[])[0];
        let json: Row | undefined = rowToJson(row, columns);
        if (withDepartment) json = await attachDepartment(json);
        if (withIpRelations) json = await attachIpRelations(json);
        res.json(json);
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };
}

/** DELETE /:id - remove a row, running afterDelete on success. */
export function removeHandler({ table, opts }: CrudContext) {
  const { afterDelete } = opts;

  return async (req: Request, res: Response) => {
    try {
      const connection = await db.getConnection();
      try {
        const result = await connection.execute(
          `DELETE FROM ${table} WHERE id = ?`,
          [req.params.id],
        );
        if ((result[0] as any).affectedRows === 0)
          return res.status(404).json({ error: "Not found" });
        if (afterDelete) await afterDelete(connection, String(req.params.id));
        res.json({ ok: true });
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
