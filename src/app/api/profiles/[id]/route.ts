import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parsePartialBody } from '@/server/middlewares/validate';
import { updateProfileSchema } from '@/server/validators/profiles.schema';
import { getProfile, updateProfile, deleteProfile } from '@/server/controllers/profilesController';

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const { id } = await params;
  const row = await getProfile(auth, id);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const body = await parsePartialBody(req, updateProfileSchema);
  const { id } = await params;
  const row = await updateProfile(auth, id, body);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const { id } = await params;
  const result = await deleteProfile(auth, id);
  return jsonOk(result, { headers: NO_STORE_HEADERS });
});
