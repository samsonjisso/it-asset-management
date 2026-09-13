import type { NextRequest } from "next/server";
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from "@/server/lib/http";
import { pool } from "@/server/lib/db";
import { requireAuth, requireRole } from "@/server/middlewares/withAuth";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  requireRole(auth, ["admin", "audit"]);

  const requestedPage = Number(req.nextUrl.searchParams.get("page") || 1);
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || 50);
  const page = Number.isFinite(requestedPage)
    ? Math.max(Math.trunc(requestedPage), 1)
    : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 100;
  const offset = (page - 1) * limit;
  const params: string[] = [];
  const filters: string[] = [];
  const table = req.nextUrl.searchParams.get("table")?.trim();
  const action = req.nextUrl.searchParams.get("action")?.trim();
  const actor = req.nextUrl.searchParams.get("actor")?.trim();
  const search = req.nextUrl.searchParams.get("search")?.trim();
  if (table) {
    filters.push("table_name = ?");
    params.push(table);
  }
  if (action) {
    filters.push("action = ?");
    params.push(action);
  }
  if (actor) {
    filters.push("actor_name LIKE ?");
    params.push(`%${actor}%`);
  }
  if (search) {
    filters.push("(record_label LIKE ? OR table_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [countRows] = await pool.query<any[]>(
    `SELECT COUNT(*) AS total FROM audit_log ${where}`,
    params,
  );
  const [rows] = await pool.query<any[]>(
    `SELECT id, action, table_name, record_id, record_label,
            before_data, after_data, actor_id, actor_name, created_at
       FROM audit_log
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return jsonOk(
    { data: rows, page, limit, total: Number(countRows[0]?.total || 0) },
    { headers: NO_STORE_HEADERS },
  );
});