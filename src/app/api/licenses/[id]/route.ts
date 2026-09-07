import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parsePartialBody } from '@/server/middlewares/validate';
import { getRowById, updateRow, deleteRow } from '@/server/controllers/crudEngine';
import { licensesConfig } from '@/server/controllers/crudConfig';
import { licenseSchema } from '@/server/validators/licenses.schema';

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  const row = await getRowById(licensesConfig, auth, params.id);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  const body = await parsePartialBody(req, licenseSchema);
  const row = await updateRow(licensesConfig, auth, params.id, body as Record<string, unknown>);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  await deleteRow(licensesConfig, auth, params.id);
  return jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
});
