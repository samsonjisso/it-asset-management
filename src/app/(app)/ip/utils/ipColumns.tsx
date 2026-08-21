import type { IPAddress } from '../../../../lib/supabase';
import type { Column } from '../../../../components/DataTable';
import { statusStyles } from './ipConstants';
import { Eye, Pencil, Trash2 } from 'lucide-react';

type ColumnActions = {
  canWrite: boolean;
  canDelete: boolean;
  onView: (record: IPAddress) => void;
  onEdit: (record: IPAddress) => void;
  onDelete: (record: IPAddress) => void;
};

export function buildIPColumns(actions: ColumnActions): Column<IPAddress>[] {
  return [
    {
      key: 'ip_address',
      label: 'Key',
      sortable: true,
      sortValue: (record) => record.ip_address,
      render: (record) => (
        <span className="font-mono text-xs font-semibold text-brand-700">
          {record.ip_address}
        </span>
      ),
    },
    {
      key: 'hostname',
      label: 'Name',
      render: (record) => (
        <span className="font-medium text-gray-900">{record.hostname ?? '-'}</span>
      ),
    },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'ip_owner', label: 'Owner', render: (r) => r.ip_owner ?? '-' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (record) => record.status,
      render: (record) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyles[record.status]}`}>
          {record.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      sortable: true,
      sortValue: (record) => record.created_at,
      render: (record) => new Date(record.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (record) => (
        <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => actions.onView(record)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="View Details">
            <Eye size={16} />
          </button>
          {actions.canWrite && (
            <button onClick={() => actions.onEdit(record)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {actions.canDelete && (
            <button onClick={() => actions.onDelete(record)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
}
