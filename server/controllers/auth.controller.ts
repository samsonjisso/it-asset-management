import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db, nowIso } from "../utils/db.js";
import { signToken } from "../utils/auth.js";
import type { UserRole } from "../types.js";

interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: number;
  must_change_password?: number;
  created_at: string;
  updated_at: string;
}

export function toPublicProfile(row: ProfileRow | undefined) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return {
    ...rest,
    is_active: !!rest.is_active,
    must_change_password: !!rest.must_change_password,
  };
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM profiles WHERE email = ?",
        [email],
      );
      const row = (rows as ProfileRow[])[0];
      if (!row || !bcrypt.compareSync(password, row.password_hash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!row.is_active) {
        return res
          .status(403)
          .json({
            error:
              "Your account has been disabled. Contact your administrator.",
          });
      }
      const token = signToken({ id: row.id, email: row.email, role: row.role });
      const profile = toPublicProfile(row)!;
      res.json({
        token,
        user: { id: profile.id, email: profile.email },
        profile,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function session(req: Request, res: Response) {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM profiles WHERE id = ?",
        [req.auth!.id],
      );
      const row = (rows as ProfileRow[])[0];
      if (!row)
        return res.status(401).json({ error: "Account no longer exists" });
      const profile = toPublicProfile(row)!;
      res.json({ user: { id: profile.id, email: profile.email }, profile });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }
    const hash = bcrypt.hashSync(password, 10);
    const connection = await db.getConnection();
    try {
      await connection.execute(
        "UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?",
        [hash, nowIso(), req.auth!.id],
      );
      res.json({ ok: true });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
