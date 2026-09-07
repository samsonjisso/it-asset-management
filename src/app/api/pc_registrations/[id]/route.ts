import type { NextRequest } from 'next/server';
import { withErrorHandling, jsonOk, NO_STORE_HEADERS } from '@/server/lib/http';
import { requireAuth } from '@/server/middlewares/withAuth';
import { parsePartialBody } from '@/server/middlewares/validate';
import { getRowById, updateRow, deleteRow } from '@/server/controllers/crudEngine';
import { pcRegistrationsConfig } from '@/server/controllers/crudConfig';
import { pcRegistrationSchema } from '@/server/validators/pcRegistrations.schema';

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const { id } = await params;
  const row = await getRowById(pcRegistrationsConfig, auth, id);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const body = await parsePartialBody(req, pcRegistrationSchema);
  const { id } = await params;
  const row = await updateRow(pcRegistrationsConfig, auth, id, body as Record<string, unknown>);
  return jsonOk(row, { headers: NO_STORE_HEADERS });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  const { id } = await params;
  await deleteRow(pcRegistrationsConfig, auth, id);
  return jsonOk({ ok: true }, { headers: NO_STORE_HEADERS });
});
