import type { NextFunction, Request, Response } from 'express';
import { assertSafeText } from './common.js';

export function validateLicense(req: Request, res: Response, next: NextFunction) {
  try {
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const validLicenseTypes = ['operating_system', 'email_365', 'veam_backup', 'vmware', 'other'];
    const licenseType = typeof body.license_type === 'string' ? body.license_type.trim() : '';
    if (licenseType && !validLicenseTypes.includes(licenseType)) {
      throw new Error('License type is invalid.');
    }

    const numberOfLicenses = body.number_of_licenses;
    if (numberOfLicenses !== undefined && numberOfLicenses !== null && numberOfLicenses !== '' && !/^[0-9]+$/.test(String(numberOfLicenses))) {
      throw new Error('Number of licenses must be a number.');
    }

    for (const key of ['vendor', 'license_subtype', 'license_key', 'notes']) {
      const value = body[key];
      if (typeof value === 'string') assertSafeText(value, key);
    }

    if (typeof body.effective_date === 'string' && body.effective_date.trim() && !Date.parse(body.effective_date)) {
      throw new Error('Effective date is invalid.');
    }

    if (typeof body.expiry_date === 'string' && body.expiry_date.trim() && !Date.parse(body.expiry_date)) {
      throw new Error('Expiry date is invalid.');
    }

    next();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
