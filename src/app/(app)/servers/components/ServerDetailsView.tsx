import { DetailsModal, DetailSection } from '@/components/DetailsModal';
import { ZoomImage } from '@/components/ZoomImage';
import { Server as ServerIcon } from 'lucide-react';
import type { Server, ServerOwner, ServerType, ServerEnvironment } from '@/lib/supabase';

interface ServerDetailsViewProps {
  viewing: Server | null;
  onClose: () => void;
  onEdit: (rec: Server) => void;
  canWrite: () => boolean;
  serverTypes: ServerType[];
  environments: ServerEnvironment[];
  serverOwners: ServerOwner[];
}

export function ServerDetailsView({
  viewing, onClose, onEdit, canWrite, serverTypes, environments, serverOwners,
}: ServerDetailsViewProps) {
  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'Server Information',
      fields: [
        { label: 'Asset ID', value: viewing.asset_id, mono: true },
        { label: 'Hostname', value: viewing.hostname },
        { label: 'Server Type', value: serverTypes.find((t) => t.code === viewing.server_type)?.label ?? viewing.server_type_other ?? viewing.server_type },
        { label: 'Environment', value: environments.find((e) => e.code === viewing.environment)?.label ?? viewing.environment },
        { label: 'Server Owner', value: serverOwners.find((o) => o.code === viewing.server_owner)?.label ?? viewing.server_owner },
        { label: 'Photo', value: viewing.image ? <ZoomImage src={viewing.image} size={144} /> : null, full: true },
      ],
    },
    {
      title: 'Network',
      fields: [
        { label: 'IP Address', value: viewing.ip_address, mono: true },
        { label: 'Network Subnet', value: viewing.network_subnet },
        { label: 'SSH Port', value: viewing.ssh_port },
      ],
    },
    {
      title: 'Resources',
      fields: [
        { label: 'RAM', value: viewing.ram },
        { label: 'CPU', value: viewing.cpu },
        { label: 'Storage', value: viewing.storage },
        { label: 'OS Release', value: viewing.os_release },
        { label: 'Host Location', value: viewing.host_location },
      ],
    },
    {
      title: 'Other',
      fields: [
        { label: 'Notes', value: viewing.notes, full: true },
        { label: 'Registered', value: new Date(viewing.created_at).toLocaleString() },
        { label: 'Last Updated', value: new Date(viewing.updated_at).toLocaleString() },
      ],
    },
  ] : [];

  return (
    <DetailsModal
      open={!!viewing}
      onClose={onClose}
      title={viewing?.hostname ?? ''}
      subtitle={viewing?.asset_id ?? undefined}
      icon={<ServerIcon size={22} />}
      sections={viewSections}
      onEdit={viewing && canWrite() ? () => onEdit(viewing) : undefined}
      editLabel="Edit Server"
    />
  );
}
