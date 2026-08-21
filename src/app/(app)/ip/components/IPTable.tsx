import type { IPAddress } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/DataTable';
import { buildIPColumns } from '../utils/ipColumns';

type Props = {
  records: IPAddress[];
  canWrite: boolean;
  canDelete: boolean;
  onView: (record: IPAddress) => void;
  onEdit: (record: IPAddress) => void;
  onDelete: (record: IPAddress) => void;
};

export function IPTable(props: Props) {
  const { records, canWrite, canDelete, onView, onEdit, onDelete } = props;

  return (
    <DataTable
      columns={buildIPColumns({ canWrite, canDelete, onView, onEdit, onDelete })}
      data={records}
      searchKeys={[
        'ip_address',
        'hostname',
        'ip_owner',
        'mac_address',
        'access_switch_port',
        'patch_panel_label',
      ]}
      searchPlaceholder="Search by IP, hostname, owner, MAC..."
      dateFilterKey="created_at"
      emptyMessage="No IP addresses match this department"
      onRowClick={onView}
    />
  );
}
