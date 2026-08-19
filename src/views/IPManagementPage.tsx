"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, IPAddress, Department } from '../lib/supabase';
import { pingIp, PingResult } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Network,
  Download,
  Radar,
  Wifi,
  WifiOff,
  Loader2,
  Search,
} from 'lucide-react';

const statusOptions: { value: IPAddress['status']; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'available', label: 'Available' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const statusStyles: Record<IPAddress['status'], string> = {
  assigned: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  reserved: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  available: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  decommissioned: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

const emptyForm = {
  ip_address: '',
  hostname: '',
  department_id: '',
  ip_owner: '',
  mac_address: '',
  access_switch_port: '',
  patch_panel_label: '',
  status: 'assigned' as IPAddress['status'],
  notes: '',
};

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

export function IPManagementPage({ autoOpenCreate }: { autoOpenCreate?: number } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<IPAddress[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPAddress | null>(null);
  const [viewing, setViewing] = useState<IPAddress | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // IP availability checker (ping-based)
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [checkIp, setCheckIp] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<PingResult | null>(null);

  // Inline check inside the register/edit form
  const [formCheckState, setFormCheckState] = useState<'idle' | 'checking' | 'assigned' | 'available' | 'error'>(
    'idle'
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ipRes, deptRes] = await Promise.all([
      supabase.from('ip_addresses').select('*, department:departments(*)').order('ip_address', { ascending: true }),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (ipRes.data) setRecords(ipRes.data as IPAddress[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormCheckState('idle');
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: IPAddress) => setViewing(rec);

  const openEdit = (rec: IPAddress) => {
    setEditing(rec);
    setForm({
      ip_address: rec.ip_address,
      hostname: rec.hostname ?? '',
      department_id: rec.department_id ?? '',
      ip_owner: rec.ip_owner ?? '',
      mac_address: rec.mac_address ?? '',
      access_switch_port: rec.access_switch_port ?? '',
      patch_panel_label: rec.patch_panel_label ?? '',
      status: rec.status,
      notes: rec.notes ?? '',
    });
    setFormCheckState('idle');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ip_address) {
      toast('IP address is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      hostname: form.hostname || null,
      department_id: form.department_id || null,
      ip_owner: form.ip_owner || null,
      mac_address: form.mac_address || null,
      access_switch_port: form.access_switch_port || null,
      patch_panel_label: form.patch_panel_label || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('ip_addresses').update(payload).eq('id', editing.id)
      : await supabase.from('ip_addresses').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'IP address updated' : 'IP address registered', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: IPAddress) => {
    if (!confirm(`Delete IP address "${rec.ip_address}"?`)) return;
    const { error } = await supabase.from('ip_addresses').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('IP address deleted', 'success');
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = ['IP Address', 'Hostname', 'Department', 'Owner (Employee)', 'MAC Address', 'Access Switch Port', 'Patch Panel Label', 'Status', 'Registered'];
    const rows = records.map((r) => [
      r.ip_address, r.hostname ?? '', r.department?.name ?? '', r.ip_owner ?? '', r.mac_address ?? '', r.access_switch_port ?? '', r.patch_panel_label ?? '', r.status,
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip_addresses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Standalone "Check IP Availability" modal
  const openCheckModal = () => {
    setCheckIp('');
    setCheckResult(null);
    setCheckModalOpen(true);
  };

  const runCheck = async () => {
    const ip = checkIp.trim();
    if (!IPV4_RE.test(ip)) {
      toast('Enter a valid IPv4 address, e.g. 10.6.1.50', 'error');
      return;
    }
    setChecking(true);
    setCheckResult(null);
    const { data, error } = await pingIp(ip);
    setChecking(false);
    if (error || !data) {
      toast(error?.message ?? 'Could not check that IP', 'error');
      return;
    }
    setCheckResult(data);
  };

  // Inline check used inside the Register / Edit modal
  const runInlineCheck = async () => {
    const ip = form.ip_address.trim();
    if (!IPV4_RE.test(ip)) {
      toast('Enter a valid IPv4 address before checking', 'error');
      return;
    }
    setFormCheckState('checking');
    const { data, error } = await pingIp(ip);
    if (error || !data) {
      setFormCheckState('error');
      toast(error?.message ?? 'Could not check that IP', 'error');
      return;
    }
    setFormCheckState(data.reachable ? 'assigned' : 'available');
  };

  const columns: Column<IPAddress>[] = [
    { key: 'ip_address', label: 'Key', sortable: true, sortValue: (r) => r.ip_address, render: (r) => <span className="font-mono text-xs font-semibold text-brand-700">{r.ip_address}</span> },
    { key: 'hostname', label: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.hostname ?? '-'}</span> },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'ip_owner', label: 'Owner', render: (r) => r.ip_owner ?? '-' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyles[r.status]}`}>
          {r.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Details">
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button onClick={() => openEdit(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && hasRole('admin') && (
            <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statusCounts = statusOptions.map((s) => ({
    ...s,
    count: records.filter((r) => r.status === s.value).length,
  }));

  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'IP Information',
      fields: [
        { label: 'IP Address', value: viewing.ip_address, mono: true },
        { label: 'Hostname', value: viewing.hostname },
        { label: 'Status', value: statusOptions.find((s) => s.value === viewing.status)?.label },
        { label: 'MAC Address', value: viewing.mac_address, mono: true },
      ],
    },
    {
      title: 'Network Location',
      fields: [
        { label: 'Access Switch Port / Interface Number', value: viewing.access_switch_port },
        { label: 'Patch Panel Label / Number', value: viewing.patch_panel_label },
      ],
    },
    {
      title: 'Ownership',
      fields: [
        { label: 'Department / Branch', value: viewing.department?.name },
        { label: 'IP Address Owner (Employee)', value: viewing.ip_owner },
        { label: 'Assigned PC', value: viewing.related_assets?.pc ? `${viewing.related_assets.pc.asset_id ?? ''} ${viewing.related_assets.pc.hostname ?? ''}`.trim() : null },
        { label: 'Assigned Device', value: viewing.related_assets?.device ? `${viewing.related_assets.device.asset_id ?? ''} ${viewing.related_assets.device.hostname ?? ''}`.trim() : null },
        { label: 'Assigned Server', value: viewing.related_assets?.server ? `${viewing.related_assets.server.asset_id ?? ''} ${viewing.related_assets.server.hostname ?? ''}`.trim() : null },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">IP Address Management</h1>
            <p className="text-sm text-gray-500">{records.length} registered IP addresses</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openCheckModal}>
            <Radar size={16} /> Check IP Availability
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register IP Address
            </Button>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCounts.map((s) => (
          <div key={s.value} className="gbb-card-hover bg-white rounded-2xl shadow-card border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['ip_address', 'hostname', 'ip_owner', 'mac_address', 'access_switch_port', 'patch_panel_label']}
          searchPlaceholder="Search by IP, hostname, owner, MAC..."
          dateFilterKey="created_at"
          emptyMessage="No IP addresses registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.ip_address ?? ''}
        subtitle={viewing?.hostname ?? undefined}
        icon={<Network size={22} />}
        sections={viewSections}
        onEdit={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); openEdit(rec); } : undefined}
        editLabel="Edit IP Address"
      />

      {/* Register / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit IP Address' : 'Register New IP Address'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="IP Address" required>
              <div className="flex gap-2">
                <TextInput
                  value={form.ip_address}
                  onChange={(e) => {
                    setForm({ ...form, ip_address: e.target.value });
                    setFormCheckState('idle');
                  }}
                  placeholder="e.g., 10.6.1.50"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="shrink-0 px-3"
                  loading={formCheckState === 'checking'}
                  onClick={runInlineCheck}
                  title="Ping this IP to see if it's in use"
                >
                  {formCheckState !== 'checking' && <Search size={16} />}
                </Button>
              </div>
              {formCheckState === 'assigned' && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <WifiOff size={13} /> This IP responded to a ping — it's already assigned.
                </p>
              )}
              {formCheckState === 'available' && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <Wifi size={13} /> This IP is available (no response).
                </p>
              )}
            </Field>
            <Field label="Hostname">
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="e.g., PC-HQ-001" />
            </Field>
            <Field label="Department / Branch">
              <SelectInput value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Select department/branch</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.is_branch ? '(Branch)' : ''}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="IP Address Owner (Employee)">
              <TextInput value={form.ip_owner} onChange={(e) => setForm({ ...form, ip_owner: e.target.value })} placeholder="Employee responsible for this IP" />
            </Field>
            <Field label="MAC Address">
              <TextInput value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="00:1A:2B:3C:4D:5E" />
            </Field>
            <Field label="Access Switch Port / Interface Number">
              <TextInput value={form.access_switch_port} onChange={(e) => setForm({ ...form, access_switch_port: e.target.value })} placeholder="e.g., Gi1/0/24" />
            </Field>
            <Field label="Patch Panel Label / Number">
              <TextInput value={form.patch_panel_label} onChange={(e) => setForm({ ...form, patch_panel_label: e.target.value })} placeholder="e.g., PP-3F-A12" />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IPAddress['status'] })}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Update IP Address' : 'Register IP Address'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Check IP Availability modal */}
      <Modal
        open={checkModalOpen}
        onClose={() => setCheckModalOpen(false)}
        title="Check IP Availability"
        subtitle="Sends a single ping to see if an address is currently in use"
        size="sm"
      >
        <div className="space-y-4">
          <Field label="IP Address to check" required>
            <div className="flex gap-2">
              <TextInput
                value={checkIp}
                onChange={(e) => {
                  setCheckIp(e.target.value);
                  setCheckResult(null);
                }}
                placeholder="e.g., 10.6.1.75"
                onKeyDown={(e) => e.key === 'Enter' && runCheck()}
                autoFocus
              />
              <Button type="button" variant="primary" onClick={runCheck} loading={checking} className="shrink-0">
                {!checking && <Radar size={16} />}
                Ping
              </Button>
            </div>
          </Field>

          {checking && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Pinging {checkIp}...</span>
            </div>
          )}

          {!checking && checkResult && (
            <div
              className={`rounded-xl p-4 flex items-start gap-3 ring-1 ${
                checkResult.reachable
                  ? 'bg-red-50 ring-red-100'
                  : 'bg-green-50 ring-green-100'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  checkResult.reachable ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}
              >
                {checkResult.reachable ? <WifiOff size={18} /> : <Wifi size={18} />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${checkResult.reachable ? 'text-red-700' : 'text-green-700'}`}>
                  {checkResult.message}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{checkResult.ip}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Availability is based on a live ICMP ping, not the records below — a host can be offline yet still
            reserved, so confirm against the table before assigning.
          </p>
        </div>
      </Modal>
    </div>
  );
}
