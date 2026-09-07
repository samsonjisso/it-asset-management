import { NextResponse } from 'next/server';

/** Thrown by controllers to short-circuit with a specific status + message. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function jsonOk<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data as any, typeof init === 'number' ? { status: init } : init);
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a Route Handler so any thrown ApiError (or plain Error) becomes
 * a clean JSON error response instead of a raw 500 stack trace — the
 * Next.js equivalent of the try/catch blocks scattered through the
 * original Express handlers.
 */
export function withErrorHandling<Args extends any[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.message);
      }
      console.error('Unhandled route error:', err);
      return jsonError(500, 'Internal server error');
    }
  };
}

/** Cache-Control headers applied to every /api response (see middlewares/security.ts). */
export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
};
