'use client';

import type {
  Device,
  DeviceOwner,
  DeviceType,
} from '@/lib/supabase';

import { DetailsModal } from '@/components/DetailsModal';
import { ZoomImage } from '@/components/ZoomImage';
import { buildDeviceDetails } from '../utils/deviceDetails';

interface DeviceDetailsModalProps {
  device: Device | null;
  types: DeviceType[];
  owners: DeviceOwner[];
  canWrite: boolean;
  onClose: () => void;
  onEdit: (device: Device) => void;
}

export function DeviceDetailsModal({
  device,
  types,
  owners,
  canWrite,
  onClose,
  onEdit,
}: DeviceDetailsModalProps) {
  if (!device) {
    return null;
  }

  const sections = buildDeviceDetails(
    device,
    types,
    owners,
  );

  const deviceType =
    types.find(
      (type) => type.code === device.device_type,
    )?.label ??
    device.device_type ??
    'Device';

  const title =
    device.hostname ||
    device.asset_id ||
    deviceType;

  const subtitle = device.hostname
    ? `${deviceType} • ${device.asset_id}`
    : deviceType;

  const photo = device.image
    ? {
        label: 'Photo',
        value: (
          <ZoomImage
            src={device.image}
            size={144}
          />
        ),
        full: true,
      }
    : null;

  const displaySections = photo
    ? [
        {
          title: 'Device Photo',
          fields: [photo],
        },
        ...sections,
      ]
    : sections;

  return (
    <DetailsModal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      sections={displaySections}
      onEdit={
        canWrite
          ? () => onEdit(device)
          : undefined
      }
      editLabel="Edit Device"
    />
  );
}