import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parseBody } from '@/server/middlewares/validate';
import { changePasswordSchema } from '@/server/validators/auth.schema';
import { changeOwnPassword } from '@/server/controllers/authController';

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, changePasswordSchema);
  const result = await changeOwnPassword(auth, body);
  return jsonOk(result);
});
