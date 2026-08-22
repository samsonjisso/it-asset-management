import { useState } from 'react';
import { supabase, Server, IPSubnet } from '../../../../lib/supabase';
import { matchSubnet } from '../../../../lib/subnet';
import { isValidIPv4, isValidPort } from '../../../../lib/validation';
import { ServerFormState } from '../types';

interface UseServerFormSaveArgs {
  form: ServerFormState;
  editing: Server | null;
  subnets: IPSubnet[];
  profileId?: string;
  toast: (message: string, type: 'success' | 'error') => void;
  loadData: () => Promise<void>;
  onSaved: () => void;
}

/**
 * Owns validation, the detected-subnet lookup, and the create/update
 * mutation for the register/edit modal.
 */
export function useServerFormSave({
  form, editing, subnets, profileId, toast, loadData, onSaved,
}: UseServerFormSaveArgs) {
  const [saving, setSaving] = useState(false);

  const detectedSubnet = matchSubnet(form.ip_address, subnets);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast('Server hostname is required', 'error');
      return;
    }
    if (!form.server_owner) {
      toast('Server Owner is required. Ask an admin to add one under Server Owner Management.', 'error');
      return;
    }
    if (!form.server_type) {
      toast('Server Type is required. Add one under Customization > Server Types.', 'error');
      return;
    }
    if (!form.environment) {
      toast('Server Environment is required. Add one under Customization > Server Environments.', 'error');
      return;
    }
    if (form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      toast('Server IP Address must be a valid IPv4 address (e.g., 10.6.13.45)', 'error');
      return;
    }
    if (form.ssh_port.trim() && !isValidPort(form.ssh_port)) {
      toast('SSH Port Number must be a number between 1 and 65535', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      server_type: form.server_type,
      hostname: form.hostname,
      ip_address: form.ip_address || null,
      ssh_port: parseInt(form.ssh_port) || 22,
      environment: form.environment,
      server_owner: form.server_owner,
      network_subnet: detectedSubnet?.label ?? null,
      image: form.image,
      ram: form.ram || null,
      cpu: form.cpu || null,
      storage: form.storage || null,
      os_release: form.os_release || null,
      host_location: form.host_location || null,
      notes: form.notes || null,
      registered_by: profileId,
    };
    const { error } = editing
      ? await supabase.from('servers').update(payload).eq('id', editing.id)
      : await supabase.from('servers').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Server updated' : 'Server registered', 'success');
      onSaved();
      loadData();
    }
  };

  return { saving, detectedSubnet, handleSave };
}
