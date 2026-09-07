import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { listProfiles } from '@/server/controllers/profilesController';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const rows = await listProfiles(auth);
  return jsonOk(rows, { headers: NO_STORE_HEADERS });
});
