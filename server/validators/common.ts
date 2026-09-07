import { z } from 'zod';

/** Generic shape for the many admin-managed "label -> code" lookup tables
 *  (departments, server_owners, vendors, floors, ...). The exact
 *  required-ness/derivation of `code` is still enforced in
 *  crudConfig.ts's hooks (it mirrors the original's runtime rules,
 *  which vary slightly per table) — this schema's job is to sanitize
 *  types and reject obviously-malformed input before it ever reaches
 *  business logic. */
export const labelCodeSchema = z.object({
  label: z.string().trim().min(1).max(255).optional(),
  code: z.string().trim().max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
}).passthrough();

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export const listQuerySchema = z.object({
  order: z.string().optional(),
  ascending: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
}).catchall(z.string());

/** Loose structural check for config tables whose shape is admin-defined
 *  JSON (device_types field lists, pc_form_fields, ip_subnets, asset_models,
 *  license_subtypes, reminder_types, floors). crudConfig.ts's own hooks do
 *  the real per-table validation; this only guarantees the body is a
 *  JSON object, not an array/string/etc. */
export const passthroughSchema = z.object({}).passthrough();
