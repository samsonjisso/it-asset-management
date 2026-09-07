import type { NextRequest } from 'next/server';
import { authenticate, type AuthContext, hasModuleAccess } from '@/server/lib/auth';
import { ApiError } from '@/server/lib/http';

/**
 * Resolves the authenticated caller for a Route Handler request.
 * Throws a 401 ApiError if there is no valid session — call this first
 * in every protected handler:
 *
 *   const auth = await requireAuth(req);
 */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth) throw new ApiError(401, 'Not authenticated');
  return auth;
}

/** Throws a 403 ApiError unless auth.role is one of `roles`. */
export function requireRole(auth: AuthContext, roles: string[]): void {
  if (!roles.includes(auth.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
}

/** Throws a 403 ApiError unless the account has access to `moduleKey`. */
export function requireModule(auth: AuthContext, moduleKey: string): void {
  if (!hasModuleAccess(auth, moduleKey)) {
    throw new ApiError(403, 'You do not have access to this module');
  }
}
