import type { NextFunction, Request, Response } from 'express';

export const UNSAFE_SCRIPT_RE = /<\s*(script|iframe|object|embed|svg|img)|javascript\s*:|vbscript\s*:|on\w+\s*=|<\s*\/?\s*[a-z]+\s*>/i;

export function containsUnsafeScript(value: string): boolean {
  return UNSAFE_SCRIPT_RE.test(value);
}

export function isValidIpv4(value: string): boolean {
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(
    value.trim()
  );
}

export function isValidMacAddress(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(trimmed) ||
    /^(?:[0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$/.test(trimmed) ||
    /^[0-9A-Fa-f]{12}$/.test(trimmed)
  );
}

export function isNumeric(value: string | number): boolean {
  const text = String(value).trim();
  return text !== '' && /^\d+$/.test(text);
}

export function isValidHostname(value: string): boolean {
  return /^GBBIT01[0-9A-Z-]*$/i.test(value.trim());
}

export function isValidAccessSwitchName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || /^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(trimmed);
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object') return next();

  req.body = Object.fromEntries(
    Object.entries(req.body).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ])
  );

  next();
}

export function sanitizeQuery(req: Request, _res: Response, next: NextFunction) {
  for (const key of Object.keys(req.query)) {
    const value = req.query[key];
    if (typeof value === 'string') req.query[key] = value.trim();
  }
  next();
}

export function assertSafeText(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') return;
  const text = String(value).trim();
  if (text === '') return;
  if (containsUnsafeScript(text)) {
    throw new Error(`${fieldName} contains invalid or unsafe script characters.`);
  }
}

export function validateGenericRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const payload = (req.body ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') assertSafeText(value, key);
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') assertSafeText(item, key);
        }
      }
    }
    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
