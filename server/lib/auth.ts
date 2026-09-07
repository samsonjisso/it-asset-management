import jwt from 'jsonwebtoken';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './db';
import type { Role } from './constants';

// Security: fail closed in production if no real secret is configured,
// same as the original — refuse to start rather than silently sign
// tokens with a known dev secret.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'JWT_SECRET environment variable must be set in production. Refusing to start with the insecure development fallback secret.'
  );
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthContext {
  id: string;
  email: string;
  role: Role;
  permissions: string[] | null;
  full_name: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  phone: string | null;
  is_active: 0 | 1;
  must_change_password: 0 | 1;
  permissions: string | string[] | null;
  is_owner: 0 | 1;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export function signToken(profile: Pick<ProfileRow, 'id' | 'email' | 'role'>): string {
  return jwt.sign({ sub: profile.id, email: profile.email, role: profile.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * profiles.permissions is stored as JSON: NULL means unrestricted;
 * otherwise an array of module keys. Always parsed defensively — a
 * NULL, empty, or malformed value is treated as "unrestricted" rather
 * than locking the account out.
 */
export function parsePermissions(raw: ProfileRow['permissions']): string[] | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Brute-force protection: after this many consecutive failed attempts,
// the account is temporarily locked, independent of any IP-based
// rate limiting.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export function isAccountLocked(row: Pick<ProfileRow, 'locked_until'> | undefined): boolean {
  return !!(row?.locked_until && new Date(row.locked_until).getTime() > Date.now());
}

export async function recordFailedLogin(row: Pick<ProfileRow, 'id' | 'failed_login_attempts'>): Promise<void> {
  const attempts = (row.failed_login_attempts || 0) + 1;
  const lockedUntil =
    attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCKOUT_MS).toISOString().slice(0, 23).replace('T', ' ') : null;
  await pool.query('UPDATE profiles SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, row.id]);
}

export async function clearFailedLogins(id: string): Promise<void> {
  await pool.query('UPDATE profiles SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
}

export async function isOwner(id: string): Promise<boolean> {
  const [rows] = await pool.query<any[]>('SELECT is_owner FROM profiles WHERE id = ?', [id]);
  return !!rows[0]?.is_owner;
}

/**
 * Verifies the bearer token on a request and re-reads role/permissions
 * from the database (never trusted from the JWT itself, which can be
 * hours old) so that an admin restricting access or disabling an
 * account takes effect immediately. Returns null if not authenticated.
 */
export async function authenticate(authorizationHeader: string | null): Promise<AuthContext | null> {
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (!token) return null;
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }
  const [rows] = await pool.query<any[]>(
    'SELECT role, is_active, permissions, full_name FROM profiles WHERE id = ?',
    [payload.sub]
  );
  const row = rows[0];
  if (!row || !row.is_active) return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: row.role,
    permissions: parsePermissions(row.permissions),
    full_name: row.full_name,
  };
}

export function hasModuleAccess(auth: AuthContext, moduleKey: string): boolean {
  return !auth.permissions || auth.permissions.includes(moduleKey);
}

// A short list of the passwords people reach for first — checked
// case-insensitively, with leetspeak substitutions and trailing digits
// stripped first.
const COMMON_WEAK_PASSWORDS = new Set([
  'password', 'passw0rd', 'password1', 'password123',
  '12345678', '123456789', '1234567890', 'qwerty', 'qwerty123',
  'letmein', 'welcome', 'welcome1', 'admin', 'admin123', 'changeme',
  'goh betoch bank', 'gohbetochbank', 'iloveyou', 'monkey',
  'football', 'dragon', 'sunshine', 'princess', 'trustno1', 'abc12345',
]);

function normalizeForWeakCheck(password: string): string {
  let s = password.toLowerCase();
  s = s.replace(/[\d!@#$%^&*()\-_=+.,]+$/, '');
  s = s.replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/\$/g, 's');
  return s.replace(/[^a-z]/g, '');
}

/** Returns an error message, or null if the password passes. */
export function passwordComplexityError(password: string | undefined | null): string | null {
  if (!password || password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character';
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|abcdefgh)/i.test(password)) {
    return 'Password is too predictable — avoid repeated or sequential characters';
  }
  if (COMMON_WEAK_PASSWORDS.has(normalizeForWeakCheck(password))) {
    return 'That password is too common — please choose something less guessable';
  }
  return null;
}

export type { PoolConnection };
