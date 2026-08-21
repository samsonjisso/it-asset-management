import type { IPAddress } from '../../../../lib/supabase';

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function buildIpCsv(records: IPAddress[]): string {
  const headers = [
    'IP Address',
    'Hostname',
    'Department',
    'Owner (Employee)',
    'MAC Address',
    'Access Switch Port',
    'Patch Panel Label',
    'Status',
    'Registered',
  ];

  const rows = records.map((record) => [
    record.ip_address,
    record.hostname,
    record.department?.name,
    record.ip_owner,
    record.mac_address,
    record.access_switch_port,
    record.patch_panel_label,
    record.status,
    new Date(record.created_at).toLocaleDateString(),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
}

export function downloadIpCsv(records: IPAddress[]): void {
  const blob = new Blob([buildIpCsv(records)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `ip_addresses_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}
