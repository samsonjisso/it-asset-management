import type { NextFunction, Request, Response } from 'express';
import { assertSafeText, containsUnsafeScript, isValidIpv4, isValidMacAddress } from './common.js';

export function validateDevice(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const validOwners = ['infrastructure_management', 'application_management', 'information_security'];
    const owner = typeof body.device_owner === 'string' ? body.device_owner.trim() : '';
    if (owner && !validOwners.includes(owner)) {
      throw new Error('Device owner is invalid.');
    }

    const hostname = typeof body.hostname === 'string' ? body.hostname.trim() : '';
    if (hostname && containsUnsafeScript(hostname)) {
      throw new Error('Hostname contains invalid or unsafe script characters.');
    }

    const ip = typeof body.ip_address === 'string' ? body.ip_address.trim() : '';
    if (ip && !isValidIpv4(ip)) {
      throw new Error('IP address must be a valid IPv4 address.');
    }

    const mac = typeof body.mac_address === 'string' ? body.mac_address.trim() : '';
    if (mac && !isValidMacAddress(mac)) {
      throw new Error('MAC address must be valid and use colon-separated or 12-character hex format.');
    }

    for (const key of ['device_type', 'device_model', 'location', 'serial_number', 'rack_number', 'notes']) {
      const value = body[key];
      if (typeof value === 'string') assertSafeText(value, key);
    }

    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
