import { Network } from 'lucide-react';
import type { IPAddress } from '../../../../lib/supabase';
import { DetailsModal } from '../../../../components/DetailsModal';
import { buildIpDetails } from '../utils/ipDetails';

type Props = {
  record: IPAddress | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (record: IPAddress) => void;
};

export function IPDetailsModal({
  record,
  canEdit,
  onClose,
  onEdit,
}: Props) {
  return (
    <DetailsModal
      open={!!record}
      onClose={onClose}
      title={record?.ip_address ?? ''}
      subtitle={record?.hostname ?? undefined}
      icon={<Network size={22} />}
      sections={record ? buildIpDetails(record) : []}
      onEdit={
        record && canEdit
          ? () => {
              onEdit(record);
              onClose();
            }
          : undefined
      }
      editLabel="Edit IP Address"
    />
  );
}
