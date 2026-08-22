import { DataTable, Column } from '@/components/DataTable';
import { Eye, Pencil, Trash2, Server as ServerIcon } from 'lucide-react';
import type { Server, ServerOwner, ServerType, ServerEnvironment, UserRole } from '@/lib/supabase';

const envColors: Record<string, string> = {
  production: 'text-red-700 bg-red-50 border-red-200',
  test: 'text-blue-700 bg-blue-50 border-blue-200',
  standby: 'text-gray-700 bg-gray-50 border-gray-200',
};
const defaultEnvColor = 'text-brand-700 bg-brand-50 border-brand-200';

interface ServerTableProps {
  records: Server[];
  loading: boolean;
  serverTypes: ServerType[];
  environments: ServerEnvironment[];
  serverOwners: ServerOwner[];
  canWrite: () => boolean;
  hasRole: (...role: UserRole[]) => boolean;
  onView: (rec: Server) => void;
  onEdit: (rec: Server) => void;
  onDelete: (rec: Server) => void;
}

export function ServerTable({
  records, loading, serverTypes, environments, serverOwners,
  canWrite, hasRole, onView, onEdit, onDelete,
}: ServerTableProps) {
  const columns: Column<Server>[] = [
    { key: 'asset_id', label: 'Key', sortable: true, sortValue: (r) => r.asset_id ?? '', render: (r) => r.asset_id ? <span className="font-mono text-xs font-semibold text-brand-700">{r.asset_id}</span> : <span className="text-gray-400 italic">-</span> },
    { key: 'hostname', label: 'Name', sortable: true, sortValue: (r) => r.hostname, render: (r) => (
      <div className="flex items-center gap-2">
        {r.image ? (
          <img src={r.image} alt="" loading="lazy" decoding="async" className="w-6 h-6 rounded object-cover shrink-0" />
        ) : (
          <ServerIcon size={16} className="text-brand-600" />
        )}
        <span className="font-medium">{r.hostname}</span>
      </div>
    )},
    { key: 'server_type', label: 'Type', sortable: true, sortValue: (r) => r.server_type, render: (r) => serverTypes.find((t) => t.code === r.server_type)?.label ?? r.server_type_other ?? r.server_type },
    { key: 'environment', label: 'Environment', render: (r) => (
      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${envColors[r.environment] ?? defaultEnvColor}`}>{environments.find((e) => e.code === r.environment)?.label ?? r.environment}</span>
    )},
    { key: 'server_owner', label: 'Owner', render: (r) => serverOwners.find((o) => o.code === r.server_owner)?.label ?? r.server_owner },
    { key: 'network_subnet', label: 'Subnet', render: (r) => r.network_subnet ?? <span className="text-gray-300">-</span> },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="View Details"><Eye size={16} /></button>
          {canWrite() && <button onClick={() => onEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Pencil size={16} /></button>}
          {canWrite() && hasRole('admin') && <button onClick={() => onDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" /></div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={records}
      searchKeys={['hostname', 'ip_address', 'os_release', 'host_location']}
      searchPlaceholder="Search by hostname, IP, OS..."
      dateFilterKey="created_at"
      emptyMessage="No servers registered yet"
      onRowClick={onView}
    />
  );
}
