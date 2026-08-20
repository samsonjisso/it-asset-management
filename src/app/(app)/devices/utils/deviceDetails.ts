import {
  STD_FIELD_META,
  parseBaseFields,
  parseCoreFields,
  parseExtraFields,
  parseFieldLabels,
} from '@/lib/deviceTypeFields';
import type { Device, DeviceOwner, DeviceType } from '@/lib/supabase';
import type { DetailSection } from '@/components/DetailsModal';

function parseExtraData(device: Device | null): Record<string, string> {
  if (!device?.extra_data) return {};

  try {
    const parsed = JSON.parse(device.extra_data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function buildDeviceDetails(
  device: Device,
  types: DeviceType[],
  owners: DeviceOwner[],
): DetailSection[] {
  const type = types.find((item) => item.code === device.device_type) ?? null;
  const base = parseBaseFields(type);
  const core = parseCoreFields(type);
  const extra = parseExtraFields(type);
  const labels = parseFieldLabels(type);
  const extraData = parseExtraData(device);

  const label = (key: string) =>
    labels[key] ?? STD_FIELD_META[key]?.label ?? key;

  const ownerLabel =
    owners.find((owner) => owner.code === device.device_owner)?.label ??
    device.device_owner ??
    undefined;

  return [
    buildInformationSection(device, type, core, base, label, ownerLabel),
    ...buildExtraSection(extra, extraData),
    ...buildNetworkSection(device, base, label),
    ...buildLocationSection(device, base, label),
    buildOtherSection(device),
  ];
}

function buildInformationSection(
  device: Device,
  type: DeviceType | null,
  core: string[],
  base: string[],
  label: (key: string) => string,
  ownerLabel?: string,
): DetailSection {
  return {
    title: 'Device Information',
    fields: [
      {
        label: 'Asset ID',
        value: device.asset_id,
        mono: true,
      },
      {
        label: 'Device Type',
        value: type?.label ?? device.device_type,
      },
      ...(core.includes('device_owner')
        ? [{ label: label('device_owner'), value: ownerLabel }]
        : []),
      ...(core.includes('device_model')
        ? [{ label: label('device_model'), value: device.device_model }]
        : []),
      ...(core.includes('hostname')
        ? [{ label: label('hostname'), value: device.hostname }]
        : []),
      ...(base.includes('serial_number')
        ? [
            {
              label: 'Serial Number',
              value: device.serial_number,
              mono: true,
            },
          ]
        : []),
    ],
  };
}

function buildExtraSection(
  fields: ReturnType<typeof parseExtraFields>,
  data: Record<string, string>,
): DetailSection[] {
  if (!fields.length) return [];

  return [
    {
      title: 'Type-Specific Details',
      fields: fields.map((field) => ({
        label: field.label,
        value: data[field.key],
      })),
    },
  ];
}

function buildNetworkSection(
  device: Device,
  base: string[],
  label: (key: string) => string,
): DetailSection[] {
  const fields = [
    ...(base.includes('ip_address')
      ? [
          {
            label: label('ip_address'),
            value: device.ip_address,
            mono: true,
          },
        ]
      : []),
    ...(base.includes('mac_address')
      ? [
          {
            label: label('mac_address'),
            value: device.mac_address,
            mono: true,
          },
        ]
      : []),
  ];

  return fields.length ? [{ title: 'Network', fields }] : [];
}

function buildLocationSection(
  device: Device,
  base: string[],
  label: (key: string) => string,
): DetailSection[] {
  const fields = [
    ...(base.includes('location')
      ? [{ label: label('location'), value: device.location }]
      : []),
    ...(base.includes('rack_number')
      ? [{ label: label('rack_number'), value: device.rack_number }]
      : []),
  ];

  return fields.length ? [{ title: 'Location', fields }] : [];
}

function buildOtherSection(device: Device): DetailSection {
  return {
    title: 'Other',
    fields: [
      {
        label: 'Notes',
        value: device.notes,
        full: true,
      },
      {
        label: 'Registered',
        value: new Date(device.created_at).toLocaleString(),
      },
      {
        label: 'Last Updated',
        value: new Date(device.updated_at).toLocaleString(),
      },
    ],
  };
}