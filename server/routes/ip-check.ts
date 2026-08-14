import { Router, type Request, type Response } from 'express';
import { execFile } from 'node:child_process';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Matches a plain IPv4 address only — deliberately strict since this
// value is passed to a system command (via execFile, with no shell,
// but we still only want to ever hand it a well-formed IP).
const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function ping(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    // -c 1: send a single packet. -W 1: wait at most 1s for a reply.
    // execFile (not exec) passes ip as an argv entry, never through a
    // shell, so there's no command-injection surface regardless.
    execFile('ping', ['-c', '1', '-W', '1', ip], { timeout: 3000 }, (error) => {
      resolve(!error);
    });
  });
}

router.get('/check-availability', async (req: Request, res: Response) => {
  const ip = typeof req.query.ip === 'string' ? req.query.ip.trim() : '';
  if (!IPV4_RE.test(ip)) {
    return res.status(400).json({ error: 'Enter a valid IPv4 address, e.g. 10.6.1.50' });
  }

  const responded = await ping(ip);
  if (responded) {
    res.json({ available: false, message: 'The IP is already assigned.' });
  } else {
    res.json({ available: true, message: 'The IP is available.' });
  }
});

export default router;
