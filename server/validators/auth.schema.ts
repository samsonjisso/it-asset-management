import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  full_name: z.string().trim().min(1, 'Full name is required'),
  role: z.enum(['admin', 'editor', 'reader', 'audit']).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  must_change_password: z.boolean().optional(),
  permissions: z.array(z.string()).nullable().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  must_change_password: z.boolean().optional(),
});
