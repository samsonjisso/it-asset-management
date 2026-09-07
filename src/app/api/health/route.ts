import { jsonOk } from '@/server/lib/http';

export async function GET() {
  return jsonOk({ ok: true });
}
