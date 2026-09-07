import { z } from 'zod';

// Field-level shape validation. Cross-field business rules (duplicate
// detection, license linking, IP linking, per-admin custom required
// fields from pc_form_fields) are enforced in
// server/controllers/crudConfig.ts's beforeInsert/beforeUpdate hooks,
// which mirror the original server/index.js exactly — a static Zod
// schema can't safely express "required unless this other admin-
// configured field says otherwise" without duplicating that logic.
export const pcRegistrationSchema = z.object({
  hostname: z.string().trim().min(1).max(255).optional(),
  monitor_serial: z.string().max(255).nullable().optional(),
  asset_tag: z.string().max(255).nullable().optional(),
  service_tag: z.string().max(255).nullable().optional(),
  mac_address: z.string().max(64).nullable().optional(),
  product_key: z.string().max(255).nullable().optional(),
  cpu: z.string().max(255).nullable().optional(),
  memory_detail: z.string().max(255).nullable().optional(),
  generation_detail: z.string().max(255).nullable().optional(),
  ip_address: z.string().max(45).nullable().optional(),
  owner_name: z.string().max(255).nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  floor_number: z.string().max(100).nullable().optional(),
  switch_port_number: z.string().max(100).nullable().optional(),
  access_switch_ip: z.string().max(45).nullable().optional(),
  access_switch_name: z.string().max(255).nullable().optional(),
  patch_level_number: z.string().max(100).nullable().optional(),
  model_id: z.string().uuid().nullable().optional(),
  image: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  license_id: z.string().uuid().nullable().optional(),
  extra_data: z.record(z.string()).nullable().optional(),
}).passthrough();
