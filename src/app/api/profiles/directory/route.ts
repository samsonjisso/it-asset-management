import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { listDirectory } from '@/server/controllers/profilesController';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAuth(req); // open to every authenticated role
  const rows = await listDirectory();
  return jsonOk(rows, { headers: NO_STORE_HEADERS });
});
