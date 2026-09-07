import { z } from 'zod';

export const deviceSchema = z.object({
  device_type: z.string().trim().min(1).max(100).optional(),
  device_owner: z.string().max(100).nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  device_model: z.string().max(255).nullable().optional(),
  hostname: z.string().max(255).nullable().optional(),
  ip_address: z.string().max(45).nullable().optional(),
  serial_number: z.string().max(255).nullable().optional(),
  mac_address: z.string().max(64).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  rack_number: z.string().max(100).nullable().optional(),
  extra_data: z.record(z.any()).nullable().optional(),
  model_id: z.string().uuid().nullable().optional(),
  image: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}).passthrough();
