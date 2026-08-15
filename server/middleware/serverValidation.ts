import type { NextFunction, Request, Response } from 'express';
import { assertSafeText, containsUnsafeScript, isValidHostname, isValidIpv4 } from './common.js';

export function validateServer(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const ip = typeof body.ip_address === 'string' ? body.ip_address.trim() : '';
    if (ip && !isValidIpv4(ip)) {
      throw new Error('Server IP address must be a valid IPv4 address.');
    }

    const validTypes = ['redhat', 'ubuntu', 'windows_server', 'other'];
    const serverType = typeof body.server_type === 'string' ? body.server_type.trim() : '';
    if (serverType && !validTypes.includes(serverType)) {
      throw new Error('Server type is invalid.');
    }

    const validEnvironments = ['production', 'test', 'standby'];
    const environment = typeof body.environment === 'string' ? body.environment.trim() : '';
    if (environment && !validEnvironments.includes(environment)) {
      throw new Error('Server environment is invalid.');
    }

    const validOwners = ['application', 'information_security', 'infrastructure_management'];
    const owner = typeof body.server_owner === 'string' ? body.server_owner.trim() : '';
    if (owner && !validOwners.includes(owner)) {
      throw new Error('Server owner is invalid.');
    }

    const sshPort = body.ssh_port;
    if (sshPort !== undefined && sshPort !== null && sshPort !== '' && !/^\d+$/.test(String(sshPort))) {
      throw new Error('SSH port must contain only numbers.');
    }

    for (const key of ['server_type_other', 'os_release', 'host_location', 'notes', 'ram', 'cpu', 'storage']) {
      const value = body[key];
      if (typeof value === 'string') {
        if (containsUnsafeScript(value)) {
          throw new Error(`${key.replace(/_/g, ' ')} contains invalid or unsafe script characters.`);
        }
        assertSafeText(value, key);
      }
    }

    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
