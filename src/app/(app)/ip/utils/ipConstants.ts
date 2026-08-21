import type { IPAddress } from '../../../../lib/supabase';
import type { IPFormData } from '../types/ipManagement.types';

export const statusOptions: { value: IPAddress['status']; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'available', label: 'Available' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export const statusStyles: Record<IPAddress['status'], string> = {
  assigned: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  reserved: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  available: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  decommissioned: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

export const emptyForm: IPFormData = {
  ip_address: '',
  hostname: '',
  department_id: '',
  ip_owner: '',
  mac_address: '',
  access_switch_port: '',
  patch_panel_label: '',
  status: 'assigned',
  notes: '',
};

export const registrationRoutes: Record<string, string> = {
  pc: '/pc?register=1',
  device: '/devices?register=1',
  server: '/servers?register=1',
};
