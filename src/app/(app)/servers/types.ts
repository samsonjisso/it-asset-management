import type { Server } from '../../../lib/supabase';

export interface ServerFormState {
  server_type: string;
  hostname: string;
  ip_address: string;
  ssh_port: string;
  environment: string;
  server_owner: string;
  ram: string;
  cpu: string;
  storage: string;
  os_release: string;
  host_location: string;
  image: string | null;
  notes: string;
}

export const emptyForm: ServerFormState = {
  server_type: '',
  hostname: '',
  ip_address: '',
  ssh_port: '22',
  environment: '',
  server_owner: '',
  ram: '',
  cpu: '',
  storage: '',
  os_release: '',
  host_location: '',
  image: null,
  notes: '',
};

export interface ServerRegistrationPageProps {
  autoOpenCreate?: number;
}

// Re-exported for convenience so consumers of this folder don't need to
// reach into lib/supabase directly for the row type.
export type { Server };
