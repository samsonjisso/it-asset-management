import type { IPAddress, Department } from '../../../../lib/supabase';
import type { PingResult } from '../../../../lib/api';

export type IPFormData = {
  ip_address: string;
  hostname: string;
  department_id: string;
  ip_owner: string;
  mac_address: string;
  access_switch_port: string;
  patch_panel_label: string;
  status: IPAddress['status'];
  notes: string;
};

export type IPFormCheckState =
  | 'idle'
  | 'checking'
  | 'assigned'
  | 'available'
  | 'error';

export type IPManagementProps = {
  autoOpenCreate?: number;
};

export type IPAvailabilityState = {
  ip: string;
  loading: boolean;
  result: PingResult | null;
};

export type IPData = {
  records: IPAddress[];
  departments: Department[];
};
