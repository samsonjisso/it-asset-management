import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parseBody } from '@/server/middlewares/validate';
import { resetPasswordSchema } from '@/server/validators/auth.schema';
import { adminResetPassword } from '@/server/controllers/authController';

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, resetPasswordSchema);
  const result = await adminResetPassword(auth, params.id, body);
  return jsonOk(result);
});
