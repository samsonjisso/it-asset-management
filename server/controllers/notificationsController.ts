import { pool } from "@/server/lib/db";
import { ApiError } from "@/server/lib/http";
import { AUDIT_VIEW_ROLES } from "@/server/lib/constants";
import { requireModule } from "@/server/middlewares/withAuth";
import type { AuthContext } from "@/server/lib/auth";

function toJson(row: any) {
  return { ...row, is_read: !!row.is_read };
}

function assertViewAccess(auth: AuthContext) {
  requireModule(auth, "notifications");
  if (!AUDIT_VIEW_ROLES.includes(auth.role))
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
}

export async function listNotifications(
  auth: AuthContext,
  searchParams: URLSearchParams,
) {
  assertViewAccess(auth);
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);
  const clauses: string[] = [];
  const params: any[] = [];
  if (searchParams.has("is_read")) {
    clauses.push("is_read = ?");
    params.push(searchParams.get("is_read") === "true" ? 1 : 0);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(limit);
  const [rows] = await pool.query<any[]>(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ?`,
    params,
  );
  return rows.map(toJson);
}

export async function unreadCount(auth: AuthContext) {
  assertViewAccess(auth);
  const [rows] = await pool.query<any[]>(
    "SELECT COUNT(*) as c FROM notifications WHERE is_read = 0",
  );
  return { count: rows[0].c };
}

export async function markRead(auth: AuthContext, id: string, isRead: boolean) {
  assertViewAccess(auth);
  const [result]: any = await pool.query(
    "UPDATE notifications SET is_read = ? WHERE id = ?",
    [isRead ? 1 : 0, id],
  );
  if (result.affectedRows === 0) throw new ApiError(404, "Not found");
  const [rows] = await pool.query<any[]>(
    "SELECT * FROM notifications WHERE id = ?",
    [id],
  );
  return toJson(rows[0]);
}

export async function markAllRead(auth: AuthContext) {
  assertViewAccess(auth);
  await pool.query("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
  return { ok: true };
}

export async function deleteNotification(auth: AuthContext, id: string) {
  requireModule(auth, "notifications");
  if (auth.role !== "admin")
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  const [result]: any = await pool.query(
    "DELETE FROM notifications WHERE id = ?",
    [id],
  );
  if (result.affectedRows === 0) throw new ApiError(404, "Not found");
  return { ok: true };
}
