import type { NextFunction, Request, Response } from 'express';
import { assertSafeText, containsUnsafeScript } from './common.js';

export function validateReminder(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body.title === 'string' && body.title.trim() && containsUnsafeScript(body.title)) {
      throw new Error('Reminder title contains invalid or unsafe script characters.');
    }

    if (typeof body.reminder_type === 'string' && body.reminder_type.trim() && containsUnsafeScript(body.reminder_type)) {
      throw new Error('Reminder type contains invalid or unsafe script characters.');
    }

    const remindAt = typeof body.remind_at === 'string' ? body.remind_at.trim() : '';
    if (remindAt && Number.isNaN(Date.parse(remindAt))) {
      throw new Error('Reminder date is invalid.');
    }

    if (typeof body.alert_email === 'string' && body.alert_email.trim()) {
      const email = body.alert_email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Alert email is invalid.');
      }
    }

    if (typeof body.detail === 'string') assertSafeText(body.detail, 'detail');

    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
