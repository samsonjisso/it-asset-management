import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../utils/auth.js";
import { getImportTable } from "../utils/importTables.js";
import {
  listImportableTables,
  getTableSchema,
  previewImport,
  runImport,
} from "../controllers/import.controller.js";

/**
 * Unlike createCrudRouter (one router instance per fixed table), the
 * import routes take the table as a URL param, so the allowed-roles check
 * has to look the table up per request rather than being baked into the
 * router at mount time.
 */
function requireImportRole(req: Request, res: Response, next: NextFunction) {
  const cfg = getImportTable(String(req.params.table));
  if (!cfg) return res.status(404).json({ error: "Unknown import target" });
  if (!req.auth || !cfg.insertRoles.includes(req.auth.role)) {
    return res
      .status(403)
      .json({ error: "You do not have permission to import into this table." });
  }
  next();
}

const router = Router();

router.use(requireAuth);

router.get("/tables", listImportableTables);
router.get("/:table/schema", requireImportRole, getTableSchema);
router.post("/:table/preview", requireImportRole, previewImport);
router.post("/:table", requireImportRole, runImport);

export default router;
