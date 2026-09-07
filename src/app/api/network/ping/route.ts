import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parseBody } from '@/server/middlewares/validate';
import { pingSchema } from '@/server/validators/network.schema';
import { pingIp } from '@/server/controllers/networkController';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, pingSchema);
  const result = await pingIp(auth, body.ip);
  return jsonOk(result);
});
