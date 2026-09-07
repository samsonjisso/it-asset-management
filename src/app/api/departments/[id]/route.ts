import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parsePartialBody } from '@/server/middlewares/validate';
import { getRowById, updateRow, deleteRow } from '@/server/controllers/crudEngine';
import { departmentsConfig } from '@/server/controllers/crudConfig';
import { departmentSchema } from '@/server/validators/departments.schema';

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  const row = await getRowById(departmentsConfig, auth, params.id);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  const body = await parsePartialBody(req, departmentSchema);
  const row = await updateRow(departmentsConfig, auth, params.id, body as Record<string, unknown>);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const auth = await requireAuth(req);
  await deleteRow(departmentsConfig, auth, params.id);
  return jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
});
