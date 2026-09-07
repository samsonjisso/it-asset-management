import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'editor', 'reader', 'audit']).optional(),
  is_active: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
  permissions: z.array(z.string()).nullable().optional(),
});

export const transferOwnershipSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
