import { useState } from 'react';
import {
  supabase,
  Server,
  ServerOwner,
  ServerType,
  ServerEnvironment,
} from '../../../../lib/supabase';

interface UseServerActionsArgs {
  records: Server[];
  serverTypes: ServerType[];
  environments: ServerEnvironment[];
  serverOwners: ServerOwner[];
  toast: (message: string, type: 'success' | 'error') => void;
  loadData: () => Promise<void>;
}

/**
 * Owns the details-view selection, delete mutation, and CSV export.
 */
export function useServerActions({
  records,
  serverTypes,
  environments,
  serverOwners,
  toast,
  loadData,
}: UseServerActionsArgs) {
  const [viewing, setViewing] = useState<Server | null>(null);

  const openView = (rec: Server) => setViewing(rec);

  const handleDelete = async (rec: Server) => {
    if (!confirm(`Delete server "${rec.hostname}"?`)) return;
    const { error } = await supabase.from('servers').delete().eq('id', rec.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Server deleted', 'success');
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = [
      'Asset ID', 'Server Type', 'Hostname', 'IP Address', 'Network Subnet',
      'SSH Port', 'Environment', 'Owner', 'RAM', 'CPU', 'Storage',
      'OS Release', 'Host Location', 'Created At',
    ];
    const rows = records.map((r) => [
      r.asset_id ?? '',
      serverTypes.find((t) => t.code === r.server_type)?.label ?? r.server_type_other ?? r.server_type,
      r.hostname, r.ip_address ?? '', r.network_subnet ?? '', r.ssh_port,
      environments.find((e) => e.code === r.environment)?.label ?? r.environment,
      serverOwners.find((o) => o.code === r.server_owner)?.label ?? r.server_owner,
      r.ram ?? '', r.cpu ?? '', r.storage ?? '', r.os_release ?? '', r.host_location ?? '',
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { viewing, setViewing, openView, handleDelete, exportCSV };
}
