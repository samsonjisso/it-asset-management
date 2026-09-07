import { execFile } from 'node:child_process';
import { ApiError } from '@/server/lib/http';
import { requireModule } from '@/server/middlewares/withAuth';
import type { AuthContext } from '@/server/lib/auth';

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

function isValidIPv4(value: string): boolean {
  return IPV4_RE.test(value.trim());
}

function pingHost(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const args = isWindows ? ['-n', '1', '-w', '1000', ip] : ['-c', '1', '-W', '1', ip];
    // Strict IPv4 validation above, and `ip` is always passed as its
    // own argv entry (never interpolated into a shell string), so
    // there is no command-injection surface here.
    execFile('ping', args, { timeout: 3000 }, (error) => resolve(!error));
  });
}

export async function pingIp(auth: AuthContext, ip: string) {
  requireModule(auth, 'ip');
  const trimmed = (ip || '').trim();
  if (!isValidIPv4(trimmed)) throw new ApiError(400, 'Enter a valid IPv4 address (e.g. 10.6.1.50)');
  const reachable = await pingHost(trimmed);
  return {
    ip: trimmed,
    reachable,
    status: reachable ? 'assigned' : 'available',
    message: reachable ? 'The IP is already assigned.' : 'The IP is available.',
    checked_at: new Date().toISOString(),
  };
}
