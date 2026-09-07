import { z } from 'zod';

export const licenseSchema = z.looseObject({
  license_name: z.string().trim().min(1).max(255).optional(),
  license_type: z.string().trim().min(1).max(100).optional(),
  license_subtype: z.string().trim().min(1).max(255).optional(),
  vendor: z.string().max(255).nullable().optional(),
  license_key: z.string().max(512).nullable().optional(),
  number_of_licenses: z.union([z.number(), z.string(), z.null()]).optional(),
  effective_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  never_expires: z.boolean().optional(),
  notes: z.string().max(5000).nullable().optional(),
  attachment: z.string().nullable().optional(),
  attachment_name: z.string().max(255).nullable().optional(),
});
