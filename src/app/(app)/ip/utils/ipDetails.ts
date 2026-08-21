import type { IPAddress } from '../../../../lib/supabase';
import type { DetailSection } from '../../../../components/DetailsModal';
import { statusOptions } from './ipConstants';

type AssetReference = {
  asset_id?: string | null;
  hostname?: string | null;
};

function assetLabel(asset?: AssetReference | null): string | null {
  if (!asset) {
    return null;
  }

  return `${asset.asset_id ?? ''} ${asset.hostname ?? ''}`.trim() || null;
}

export function buildIpDetails(record: IPAddress): DetailSection[] {
  return [
    {
      title: 'IP Information',
      fields: [
        {
          label: 'IP Address',
          value: record.ip_address,
          mono: true,
        },
        {
          label: 'Hostname',
          value: record.hostname,
        },
        {
          label: 'Status',
          value: statusOptions.find(
            (status) => status.value === record.status,
          )?.label,
        },
        {
          label: 'MAC Address',
          value: record.mac_address,
          mono: true,
        },
      ],
    },
    {
      title: 'Network Location',
      fields: [
        {
          label: 'Access Switch Port / Interface Number',
          value: record.access_switch_port,
        },
        {
          label: 'Patch Panel Label / Number',
          value: record.patch_panel_label,
        },
      ],
    },
    {
      title: 'Ownership',
      fields: [
        {
          label: 'Department / Branch',
          value: record.department?.name,
        },
        {
          label: 'IP Address Owner (Employee)',
          value: record.ip_owner,
        },
        {
          label: 'Assigned PC',
          value: assetLabel(record.related_assets?.pc),
        },
        {
          label: 'Assigned Device',
          value: assetLabel(record.related_assets?.device),
        },
        {
          label: 'Assigned Server',
          value: assetLabel(record.related_assets?.server),
        },
      ],
    },
    {
      title: 'Other',
      fields: [
        {
          label: 'Notes',
          value: record.notes,
          full: true,
        },
        {
          label: 'Registered',
          value: new Date(record.created_at).toLocaleString(),
        },
        {
          label: 'Last Updated',
          value: new Date(record.updated_at).toLocaleString(),
        },
      ],
    },
  ];
}