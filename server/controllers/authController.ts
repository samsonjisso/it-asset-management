import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, nowSql } from '@/server/lib/db';
import {
  signToken,
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
  passwordComplexityError,
  parsePermissions,
  type AuthContext,
  type ProfileRow,
} from '@/server/lib/auth';
import { ApiError } from '@/server/lib/http';
import { requireModule, requireRole } from '@/server/middlewares/withAuth';
import { MODULE_KEYS, ALL_ROLES } from '@/server/lib/constants';
import type { z } from 'zod';
import type { loginSchema, changePasswordSchema, createUserSchema, resetPasswordSchema } from '@/server/validators/auth.schema';

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

function normalizePermissionsInput(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new ApiError(400, 'Permissions must be a list of module keys');
  const cleaned = [...new Set(value.filter((v) => (MODULE_KEYS as readonly string[]).includes(v)))];
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

// Simple in-memory IP-based rate limit (layer 1 — see LOGIN_LOCKOUT for
// the per-account layer). A serverless/multi-instance deployment should
// replace this with a shared store (Redis) behind the same interface;
// for a single-instance `next start` deployment this matches the
// original express-rate-limit behavior closely enough.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 20;

export function checkLoginRateLimit(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > LOGIN_LIMIT) {
    throw new ApiError(429, 'Too many login attempts. Please try again later.');
  }
}

export async function login(input: z.infer<typeof loginSchema>) {
  const email = input.email.trim().toLowerCase();
  const [rows] = await pool.query<any[]>('SELECT * FROM profiles WHERE email = ?', [email]);
  const row: ProfileRow | undefined = rows[0];

  if (row && isAccountLocked(row)) {
    const minutesLeft = Math.max(1, Math.ceil((new Date(row.locked_until!).getTime() - Date.now()) / 60000));
    throw new ApiError(429, `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`);
  }
  if (!row || !bcrypt.compareSync(input.password, row.password_hash)) {
    if (row) await recordFailedLogin(row);
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!row.is_active) {
    throw new ApiError(403, 'Your account has been disabled. Contact your administrator.');
  }
  await clearFailedLogins(row.id);
  const token = signToken(row);
  const profile = toPublicProfile(row)!;
  return { token, user: { id: profile.id, email: profile.email }, profile };
}

export async function getSession(auth: AuthContext) {
  const [rows] = await pool.query<any[]>('SELECT * FROM profiles WHERE id = ?', [auth.id]);
  const row: ProfileRow | undefined = rows[0];
  if (!row) throw new ApiError(401, 'Account no longer exists');
  const profile = toPublicProfile(row)!;
  return { user: { id: profile.id, email: profile.email }, profile };
}

export async function changeOwnPassword(auth: AuthContext, input: z.infer<typeof changePasswordSchema>) {
  const complexityError = passwordComplexityError(input.password);
  if (complexityError) throw new ApiError(400, complexityError);
  const [rows] = await pool.query<any[]>('SELECT password_hash FROM profiles WHERE id = ?', [auth.id]);
  const current = rows[0];
  if (current && bcrypt.compareSync(input.password, current.password_hash)) {
    throw new ApiError(400, 'New password must be different from your current (or temporary) password');
  }
  const hash = await bcrypt.hash(input.password, 10);
  await pool.query('UPDATE profiles SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?', [
    hash,
    nowSql(),
    auth.id,
  ]);
  return { ok: true };
}

export async function adminCreateUser(auth: AuthContext, input: z.infer<typeof createUserSchema>) {
  requireRole(auth, ['admin']);
  requireModule(auth, 'users');

  const normalizedEmail = input.email.trim().toLowerCase();
  const complexityError = passwordComplexityError(input.password);
  if (complexityError) throw new ApiError(400, complexityError);
  if (input.role && !(ALL_ROLES as readonly string[]).includes(input.role)) throw new ApiError(400, 'Invalid role');

  const permissionsToStore = normalizePermissionsInput(input.permissions);
  const [existingRows] = await pool.query<any[]>('SELECT id FROM profiles WHERE email = ?', [normalizedEmail]);
  if (existingRows[0]) throw new ApiError(409, 'A user with this email already exists');

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(input.password, 10);
  const forceChange = input.must_change_password === false ? 0 : 1;
  await pool.query(
    `INSERT INTO profiles (id, email, password_hash, full_name, role, phone, is_active, must_change_password, permissions)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, normalizedEmail, hash, input.full_name, input.role || 'reader', input.phone || null, forceChange, permissionsToStore]
  );
  return { user: { id, email: normalizedEmail } };
}

export async function adminResetPassword(auth: AuthContext, targetId: string, input: z.infer<typeof resetPasswordSchema>) {
  requireRole(auth, ['admin']);
  requireModule(auth, 'users');

  const complexityError = passwordComplexityError(input.password);
  if (complexityError) throw new ApiError(400, complexityError);
  const [rows] = await pool.query<any[]>('SELECT id, password_hash FROM profiles WHERE id = ?', [targetId]);
  const existing = rows[0];
  if (!existing) throw new ApiError(404, 'User not found');
  if (bcrypt.compareSync(input.password, existing.password_hash)) {
    throw new ApiError(400, 'New password must be different from the current password');
  }
  const hash = await bcrypt.hash(input.password, 10);
  const forceChange = input.must_change_password === false ? 0 : 1;
  await pool.query('UPDATE profiles SET password_hash = ?, must_change_password = ?, updated_at = ? WHERE id = ?', [
    hash,
    forceChange,
    nowSql(),
    targetId,
  ]);
  return { ok: true };
}
