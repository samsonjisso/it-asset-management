import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  is_branch: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
}).passthrough();
