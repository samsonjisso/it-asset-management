import type { NextFunction, Request, Response } from 'express';
import {
  assertSafeText,
  isNumeric,
  isValidAccessSwitchName,
  isValidHostname,
  isValidIpv4,
  isValidMacAddress,
} from './common.js';

export function validatePcRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const departmentId = typeof body.department_id === 'string' ? body.department_id.trim() : '';
    if (!departmentId) {
      throw new Error('Department is required for all PC registration entries.');
    }

    const host = typeof body.hostname === 'string' ? body.hostname.trim() : '';
    if (host && !isValidHostname(host)) {
      throw new Error('PC hostname must start with GBBIT01 and use letters, numbers, or hyphens only.');
    }

    const mac = typeof body.mac_address === 'string' ? body.mac_address.trim() : '';
    if (mac && !isValidMacAddress(mac)) {
      throw new Error('MAC address must be valid and use colon-separated or 12-character hex format.');
    }

    const ip = typeof body.ip_address === 'string' ? body.ip_address.trim() : '';
    if (ip && !isValidIpv4(ip)) {
      throw new Error('IP address must be a valid IPv4 address like 10.6.1.12.');
    }

    const floor = body.floor_number === undefined || body.floor_number === null || body.floor_number === ''
      ? ''
      : String(body.floor_number).trim();
    if (floor && !isNumeric(floor)) {
      throw new Error('Floor number must contain only numbers.');
    }

    const switchPort = body.switch_port_number === undefined || body.switch_port_number === null || body.switch_port_number === ''
      ? ''
      : String(body.switch_port_number).trim();
    if (switchPort && !isNumeric(switchPort)) {
      throw new Error('Switch port number must contain only numbers.');
    }

    const switchName = typeof body.access_switch_name === 'string' ? body.access_switch_name.trim() : '';
    if (switchName && !isValidAccessSwitchName(switchName)) {
      throw new Error('Access switch name must be valid text without script content.');
    }

    const patch = body.patch_level_number === undefined || body.patch_level_number === null || body.patch_level_number === ''
      ? ''
      : String(body.patch_level_number).trim();
    if (patch && !isNumeric(patch)) {
      throw new Error('Patch number must contain only numbers.');
    }

    const accessSwitchIp = typeof body.access_switch_ip === 'string' ? body.access_switch_ip.trim() : '';
    if (accessSwitchIp && !isValidIpv4(accessSwitchIp)) {
      throw new Error('Access switch IP address must be a valid IPv4 address.');
    }

    // Validate new IP management fields
    // Validate port number (1-65535)
    if (body.port !== undefined && body.port !== null) {
      const port = Number(body.port);
      if (!isNumeric(String(body.port)) || port < 1 || port > 65535) {
        throw new Error('Port must be a number between 1 and 65535.');
      }
    }

    // Validate switch port (from IP management)
    const newSwitchPort = typeof body.switch_port === 'string' ? body.switch_port.trim() : '';
    if (newSwitchPort && !/^[a-zA-Z0-9\-\/\.]+$/.test(newSwitchPort)) {
      throw new Error('Switch port must contain only letters, numbers, hyphens, slashes, or dots.');
    }

    // Validate switch IP (from IP management)
    const newSwitchIp = typeof body.switch_ip === 'string' ? body.switch_ip.trim() : '';
    if (newSwitchIp && !isValidIpv4(newSwitchIp)) {
      throw new Error('Switch IP must be a valid IPv4 address.');
    }

    // Validate patch panel port (from IP management)
    const patchPanel = typeof body.patch_panel_port === 'string' ? body.patch_panel_port.trim() : '';
    if (patchPanel && !/^[a-zA-Z0-9\-\/\.]+$/.test(patchPanel)) {
      throw new Error('Patch panel port must contain only letters, numbers, hyphens, slashes, or dots.');
    }

    // Validate VLAN
    const vlan = typeof body.vlan === 'string' ? body.vlan.trim() : '';
    if (vlan && !isNumeric(vlan)) {
      throw new Error('VLAN must be a number.');
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') assertSafeText(value, key);
    }

    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
