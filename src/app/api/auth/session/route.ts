import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { getSession } from '@/server/controllers/authController';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const result = await getSession(auth);
  return jsonOk(result, { headers: NO_STORE_HEADERS });
});
