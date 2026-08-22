import { Profile, UserRole } from '../../../lib/supabase';

export type { Profile, UserRole };

export interface NewUserForm {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  phone: string;
}

export interface EditUserForm {
  full_name: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
}

export const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'register_user', label: 'Register User' },
  { value: 'assessor', label: 'Assessor (Read Only)' },
];

export const roleColors: Record<string, string> = {
  admin: 'text-red-700 bg-red-50 border-red-200',
  manager: 'text-blue-700 bg-blue-50 border-blue-200',
  register_user: 'text-green-700 bg-green-50 border-green-200',
  assessor: 'text-gray-700 bg-gray-50 border-gray-200',
};

export const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  register_user: 'Register User',
  assessor: 'Assessor',
};
