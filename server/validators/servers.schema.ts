import { z } from "zod";

export const serverSchema = z.looseObject({
  server_type: z.string().trim().min(1).max(100).optional(),
  hostname: z.string().trim().min(1).max(255).optional(),
  ip_address: z.string().max(45).optional(),
  ssh_port: z.union([z.number(), z.string()]).optional(),
  environment: z.string().trim().min(1).max(100).optional(),
  server_owner: z.string().trim().min(1).max(100).optional(),
  network_subnet: z.string().max(100).nullable().optional(),
  image: z.string().nullable().optional(),
  vendor: z.string().max(255).nullable().optional(),
  ram: z.string().max(100).optional(),
  cpu: z.string().max(100).optional(),
  storage: z.string().max(100).optional(),
  os_release: z.string().max(100).optional(),
  host_location: z.string().max(100).optional(),
  notes: z.string().max(5000).nullable().optional(),
});
