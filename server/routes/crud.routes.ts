import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import { getColumns } from "../utils/crudHelpers.js";
import {
  listHandler,
  getOneHandler,
} from "../controllers/crudRead.controller.js";
import {
  createHandler,
  updateHandler,
  removeHandler,
} from "../controllers/crudWrite.controller.js";
import type { CrudContext, CrudRouterOptions } from "../types.js";

/**
 * Creates a REST router for a table, mirroring the subset of the
 * Supabase query builder the frontend relies on: list with eq/gte/lte
 * filters + ordering, get by id, insert, update, delete.
 *
 * This is the same factory that used to live in crud.ts - only the
 * route-handler bodies moved out, into controllers/crudRead.controller.ts
 * and controllers/crudWrite.controller.ts. The `columnsState` object
 * replaces the original `let columns: string[]` closure: it's populated
 * once, asynchronously, right after the router is created, and read by
 * every handler at request time exactly as before.
 */
export function createCrudRouter(table: string, opts: CrudRouterOptions = {}) {
  const {
    insertRoles = ["admin", "manager", "register_user"],
    updateRoles = ["admin", "manager", "register_user"],
    deleteRoles = ["admin", "manager"],
  } = opts;

  const router = Router();
  const columnsState = { columns: [] as string[] };

  // Initialize columns
  getColumns(table).then((cols) => {
    columnsState.columns = cols;
  });

  const ctx: CrudContext = { table, opts, columnsState };

  router.use(requireAuth);

  router.get("/", listHandler(ctx));
  router.get("/:id", getOneHandler(ctx));
  router.post("/", requireRole(...insertRoles), createHandler(ctx));
  router.patch("/:id", requireRole(...updateRoles), updateHandler(ctx));
  router.delete("/:id", requireRole(...deleteRoles), removeHandler(ctx));

  return router;
}
