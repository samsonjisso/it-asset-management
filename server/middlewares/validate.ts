import type { ZodObject, z } from 'zod';
import { ApiError } from '@/server/lib/http';

const XSS_PATTERNS = [
  /<\s*\/?\s*[a-z][^>]*>/i,
  /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i,
  /\bon[a-z]+\s*=\s*(?:["']|[^\s>]+)/i,
];

function assertSafeInput(value: unknown, path = 'body'): void {
  if (typeof value === 'string' && XSS_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ApiError(400, `${path}: HTML or executable content is not allowed`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeInput(item, `${path}[${index}]`));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => assertSafeInput(item, `${path}.${key}`));
  }
}

/**
 * Parses and validates a request body against a Zod schema. Throws a
 * 400 ApiError with a readable message on failure — the single place
 * every route's "sanitize + validate req.body" requirement is met.
 */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  assertSafeInput(raw);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.join('.');
    throw new ApiError(400, path ? `${path}: ${first?.message}` : first?.message || 'Invalid request body');
  }
  return result.data;
}

/**
 * Same as parseBody but for a partial/PATCH-style update (all fields
 * optional). Takes a ZodObject specifically (not the broader
 * ZodSchema) because `.partial()` is an object-schema-only method —
 * every schema actually passed here (see server/validators/*) is a
 * `z.object(...)`, including the lookup-table `passthroughSchema`.
 */
export async function parsePartialBody<T extends ZodObject<any>>(req: Request, schema: T): Promise<Partial<import('zod').infer<T>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  assertSafeInput(raw);
  const result = schema.partial().safeParse(raw) as { success: boolean; data?: any; error?: any };
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.join('.');
    throw new ApiError(400, path ? `${path}: ${first.message}` : first?.message || 'Invalid request body');
  }
  return result.data as Partial<z.infer<T>>;
}

/** Validates a URLSearchParams object against a Zod schema (query-string params). */
export function parseQuery<T>(searchParams: URLSearchParams, schema: z.ZodType<T>): T {
  const obj = Object.fromEntries(searchParams.entries());
  assertSafeInput(obj, 'query');
  const result = schema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(400, first?.message || 'Invalid query parameters');
  }
  return result.data;
}
