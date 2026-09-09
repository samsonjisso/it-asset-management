import bcrypt from "bcryptjs";
import { pool, nowSql, withTransaction } from "@/server/lib/db";
import {
  isOwner,
  parsePermissions,
  type AuthContext,
  type ProfileRow,
} from "@/server/lib/auth";
import { ApiError } from "@/server/lib/http";
import {
  AUDIT_VIEW_ROLES,
  ALL_ROLES,
  MODULE_KEYS,
} from "@/server/lib/constants";
import { describeChanges, recordNotification } from "./crudEngine";

const PROFILE_FIELD_LABELS: Record<string, string> = {
  full_name: "Name",
  is_active: "Active",
  must_change_password: "Must Change Password",
  permissions: "Module Access",
};
const PROFILE_BOOLEAN_COLUMNS = new Set(["is_active", "must_change_password"]);

function toPublicProfile(row: ProfileRow | undefined) {
  if (!row) return null;
  const { password_hash, failed_login_attempts, locked_until, ...rest } = row;
  return {
    ...rest,
    is_active: !!rest.is_active,
    must_change_password: !!rest.must_change_password,
    is_owner: !!rest.is_owner,
    permissions: parsePermissions(rest.permissions),
  };
}

/** Minimal, non-sensitive directory (id/name/email of active users only). */
export async function listDirectory() {
  const [rows] = await pool.query<any[]>(
    "SELECT id, full_name, email FROM profiles WHERE is_active = 1 ORDER BY full_name",
  );
  return rows;
}

export async function listProfiles(auth: AuthContext) {
  if (!AUDIT_VIEW_ROLES.includes(auth.role))
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  if (auth.permissions && !auth.permissions.includes("users"))
    throw new ApiError(403, "You do not have access to this module");
  const [rows] = await pool.query<any[]>(
    "SELECT * FROM profiles ORDER BY created_at ASC",
  );
  return rows.map(toPublicProfile);
}

export async function getProfile(auth: AuthContext, id: string) {
  const isSelf = auth.id === id;
  if (!isSelf && !AUDIT_VIEW_ROLES.includes(auth.role))
    throw new ApiError(403, "You do not have permission to view this user");
  const [rows] = await pool.query<any[]>(
    "SELECT * FROM profiles WHERE id = ?",
    [id],
  );
  if (!rows[0]) throw new ApiError(404, "Not found");
  return toPublicProfile(rows[0]);
}

export async function updateProfile(
  auth: AuthContext,
  id: string,
  body: Record<string, any>,
) {
  const isSelf = auth.id === id;
  const isAdmin = auth.role === "admin";
  if (!isSelf && !isAdmin)
    throw new ApiError(403, "You do not have permission to update this user");

  if ("role" in body && !(ALL_ROLES as readonly string[]).includes(body.role))
    throw new ApiError(400, "Invalid role");
  if (
    "permissions" in body &&
    body.permissions !== null &&
    !Array.isArray(body.permissions)
  ) {
    throw new ApiError(400, "Permissions must be a list of module keys");
  }
  if ("email" in body) {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ApiError(400, "Please enter a valid email address");
    const [existing] = await pool.query<any[]>(
      "SELECT id FROM profiles WHERE email = ? AND id != ?",
      [email, id],
    );
    if (existing[0])
      throw new ApiError(409, "A user with this email already exists");
    body.email = email;
  }
  if (isSelf && isAdmin) {
    if ("role" in body && body.role !== "admin")
      throw new ApiError(400, "You cannot change your own role");
    if ("is_active" in body && !body.is_active)
      throw new ApiError(400, "You cannot disable your own account");
    if ("permissions" in body)
      throw new ApiError(400, "You cannot restrict your own module access");
  }
  if (!isSelf && isAdmin && (await isOwner(id))) {
    if ("role" in body && body.role !== "admin")
      throw new ApiError(400, "The owner’s role cannot be changed");
    if ("is_active" in body && !body.is_active)
      throw new ApiError(400, "The owner account cannot be disabled");
    if (
      "permissions" in body &&
      body.permissions !== null &&
      (!Array.isArray(body.permissions) || body.permissions.length > 0)
    ) {
      throw new ApiError(400, "The owner’s module access cannot be restricted");
    }
  }

  const allowedForSelf = ["full_name", "phone"];
  const allowedForAdmin = [
    "full_name",
    "phone",
    "role",
    "is_active",
    "must_change_password",
    "permissions",
    "email",
  ];
  const allowed = isAdmin ? allowedForAdmin : allowedForSelf;
  const notifyThisChange = isAdmin && !isSelf;

  return withTransaction(async (conn) => {
    const beforeRow = notifyThisChange
      ? (
          await conn.query<any[]>("SELECT * FROM profiles WHERE id = ?", [id])
        )[0][0]
      : null;

    const setCols: string[] = [];
    const values: any[] = [];
    for (const col of allowed) {
      if (col in body) {
        let v = body[col];
        if (col === "is_active" || col === "must_change_password")
          v = v ? 1 : 0;
        else if (col === "permissions") {
          const cleaned = Array.isArray(v)
            ? [
                ...new Set(
                  v.filter((m: string) =>
                    (MODULE_KEYS as readonly string[]).includes(m),
                  ),
                ),
              ]
            : null;
          v = cleaned && cleaned.length > 0 ? JSON.stringify(cleaned) : null;
        }
        setCols.push(`\`${col}\` = ?`);
        values.push(v);
      }
    }
    setCols.push("updated_at = ?");
    values.push(nowSql());

    const [result]: any = await conn.query(
      `UPDATE profiles SET ${setCols.join(", ")} WHERE id = ?`,
      [...values, id],
    );
    if (result.affectedRows === 0) throw new ApiError(404, "Not found");

    const [rows] = await conn.query<any[]>(
      "SELECT * FROM profiles WHERE id = ?",
      [id],
    );
    const row = rows[0];

    if (notifyThisChange && beforeRow) {
      const updatedCols = allowed.filter((c) => c in body);
      const afterValues = updatedCols.map((c, i) => values[i]);
      const summary = describeChanges(
        updatedCols,
        beforeRow,
        afterValues,
        PROFILE_BOOLEAN_COLUMNS,
        PROFILE_FIELD_LABELS,
      );
      if (summary) {
        await recordNotification(conn, {
          action: "update",
          tableName: "profiles",
          recordType: "User",
          recordId: id,
          recordLabel: row.full_name || row.email,
          summary,
          actor: auth,
        });
      }
    }
    return toPublicProfile(row);
  });
}

export async function deleteProfile(auth: AuthContext, id: string) {
  if (auth.role !== "admin")
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  if (auth.id === id)
    throw new ApiError(400, "You cannot delete your own account");
  if (await isOwner(id))
    throw new ApiError(400, "The owner account cannot be deleted");

  await withTransaction(async (conn) => {
    const [rows] = await conn.query<any[]>(
      "SELECT * FROM profiles WHERE id = ?",
      [id],
    );
    const existing = rows[0];
    const [result]: any = await conn.query(
      "DELETE FROM profiles WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) throw new ApiError(404, "Not found");
    if (existing) {
      await recordNotification(conn, {
        action: "delete",
        tableName: "profiles",
        recordType: "User",
        recordId: id,
        recordLabel: existing.full_name || existing.email,
        summary: "Record deleted",
        actor: auth,
      });
    }
  });
  return { ok: true };
}

export async function transferOwnership(
  auth: AuthContext,
  targetId: string,
  password: string,
) {
  if (auth.role !== "admin")
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  if (auth.permissions && !auth.permissions.includes("users"))
    throw new ApiError(403, "You do not have access to this module");
  if (!(await isOwner(auth.id)))
    throw new ApiError(403, "Only the current owner can transfer ownership");
  if (targetId === auth.id)
    throw new ApiError(400, "You are already the owner");

  const [meRows] = await pool.query<any[]>(
    "SELECT password_hash FROM profiles WHERE id = ?",
    [auth.id],
  );
  const me = meRows[0];
  if (!password || !me || !bcrypt.compareSync(password, me.password_hash))
    throw new ApiError(400, "Incorrect password");

  const [targetRows] = await pool.query<any[]>(
    "SELECT * FROM profiles WHERE id = ?",
    [targetId],
  );
  const target = targetRows[0];
  if (!target) throw new ApiError(404, "Not found");
  if (target.role !== "admin" || !target.is_active)
    throw new ApiError(
      400,
      "Ownership can only be transferred to an active admin",
    );

  await withTransaction(async (conn) => {
    await conn.query("UPDATE profiles SET is_owner = 0 WHERE is_owner = 1");
    await conn.query(
      "UPDATE profiles SET is_owner = 1, updated_at = ? WHERE id = ?",
      [nowSql(), targetId],
    );
    await recordNotification(conn, {
      action: "update",
      tableName: "profiles",
      recordType: "User",
      recordId: targetId,
      recordLabel: target.full_name || target.email,
      summary: `Ownership transferred from ${auth.full_name} to ${target.full_name || target.email}`,
      actor: auth,
    });
  });

  const [rows] = await pool.query<any[]>(
    "SELECT * FROM profiles WHERE id = ?",
    [targetId],
  );
  return toPublicProfile(rows[0]);
}
