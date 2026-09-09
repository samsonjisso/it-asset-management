import { z } from "zod";

export const ipAddressSchema = z.looseObject({
  hostname: z.string().trim().min(1).max(255).optional(),
  department_id: z.uuid().optional(),
  mac_address: z.string().trim().min(1).max(64).optional(),
  patch_panel_label: z.string().trim().min(1).max(100).optional(),
  status: z
    .enum(["unassigned", "assigned", "reserved", "available", "decommissioned"])
    .optional(),
  access_switch_port: z.string().trim().min(1).max(100).optional(),
  ip_owner: z.string().trim().min(1).max(255).optional(),
  subnet_id: z.uuid().optional(),
  ip_address: z.string().trim().min(1).max(45).optional(),
  notes: z.string().max(5000).nullable().optional(),
  extra_data: z.record(z.string(), z.unknown()).nullable().optional(),
});
