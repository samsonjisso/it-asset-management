"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Server, ServerOwner, ServerType, ServerEnvironment, IPSubnet } from '../../../lib/supabase';
import { matchSubnet } from '../../../lib/subnet';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { DataTable, Column } from '../../../components/DataTable';
import { Modal } from '../../../components/Modal';
import { DetailsModal, DetailSection } from '../../../components/DetailsModal';
import { Field, TextInput, NumberInput, SelectInput, TextArea, Button } from '../../../components/FormControls';
import { isValidIPv4, isValidPort, IPV4_PATTERN } from '../../../lib/validation';
import { ImageInput } from '../../../components/ImageInput';
import { ZoomImage } from '../../../components/ZoomImage';
import { Plus, Pencil, Trash2, Eye, Server as ServerIcon, Download } from 'lucide-react';

const emptyForm = {
  server_type: '',
  hostname: '',
  ip_address: '',
  ssh_port: '22',
  environment: '',
  server_owner: '',
  ram: '',
  cpu: '',
  storage: '',
  os_release: '',
  host_location: '',
  image: null as string | null,
  notes: '',
};

export function ServerRegistrationPage({ autoOpenCreate }: { autoOpenCreate?: number } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Server[]>([]);
  const [serverOwners, setServerOwners] = useState<ServerOwner[]>([]);
  const [serverTypes, setServerTypes] = useState<ServerType[]>([]);
  const [environments, setEnvironments] = useState<ServerEnvironment[]>([]);
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [viewing, setViewing] = useState<Server | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [serversRes, ownersRes, typesRes, envRes, subnetsRes] = await Promise.all([
      supabase.from('servers').select('*').order('created_at', { ascending: false }),
      supabase.from('server_owners').select('*').order('label'),
      supabase.from('server_types').select('*').order('label'),
      supabase.from('server_environments').select('*').order('label'),
      supabase.from('ip_subnets').select('*').order('prefix'),
    ]);
    if (serversRes.data) setRecords(serversRes.data as Server[]);
    if (ownersRes.data) setServerOwners(ownersRes.data as ServerOwner[]);
    if (typesRes.data) setServerTypes(typesRes.data as ServerType[]);
    if (envRes.data) setEnvironments(envRes.data as ServerEnvironment[]);
    if (subnetsRes.data) setSubnets(subnetsRes.data as IPSubnet[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, server_owner: serverOwners[0]?.code ?? '', server_type: serverTypes[0]?.code ?? '', environment: environments[0]?.code ?? '' });
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: Server) => setViewing(rec);

  const openEdit = (rec: Server) => {
    setEditing(rec);
    setForm({
      server_type: rec.server_type,
      hostname: rec.hostname,
      ip_address: rec.ip_address ?? '',
      ssh_port: rec.ssh_port.toString(),
      environment: rec.environment,
      server_owner: rec.server_owner,
      ram: rec.ram ?? '',
      cpu: rec.cpu ?? '',
      storage: rec.storage ?? '',
      os_release: rec.os_release ?? '',
      host_location: rec.host_location ?? '',
      image: rec.image ?? null,
      notes: rec.notes ?? '',
    });
    setModalOpen(true);
  };

  const detectedSubnet = matchSubnet(form.ip_address, subnets);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast('Server hostname is required', 'error');
      return;
    }
    if (!form.server_owner) {
      toast('Server Owner is required. Ask an admin to add one under Server Owner Management.', 'error');
      return;
    }
    if (!form.server_type) {
      toast('Server Type is required. Add one under Customization > Server Types.', 'error');
      return;
    }
    if (!form.environment) {
      toast('Server Environment is required. Add one under Customization > Server Environments.', 'error');
      return;
    }
    if (form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      toast('Server IP Address must be a valid IPv4 address (e.g., 10.6.13.45)', 'error');
      return;
    }
    if (form.ssh_port.trim() && !isValidPort(form.ssh_port)) {
      toast('SSH Port Number must be a number between 1 and 65535', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      server_type: form.server_type,
      hostname: form.hostname,
      ip_address: form.ip_address || null,
      ssh_port: parseInt(form.ssh_port) || 22,
      environment: form.environment,
      server_owner: form.server_owner,
      network_subnet: detectedSubnet?.label ?? null,
      image: form.image,
      ram: form.ram || null,
      cpu: form.cpu || null,
      storage: form.storage || null,
      os_release: form.os_release || null,
      host_location: form.host_location || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('servers').update(payload).eq('id', editing.id)
      : await supabase.from('servers').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(editing ? 'Server updated' : 'Server registered', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Server) => {
    if (!confirm(`Delete server "${rec.hostname}"?`)) return;
    const { error } = await supabase.from('servers').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Server deleted', 'success');
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = ['Asset ID', 'Server Type', 'Hostname', 'IP Address', 'Network Subnet', 'SSH Port', 'Environment', 'Owner', 'RAM', 'CPU', 'Storage', 'OS Release', 'Host Location', 'Created At'];
    const rows = records.map((r) => [
      r.asset_id ?? '',
      serverTypes.find((t) => t.code === r.server_type)?.label ?? r.server_type_other ?? r.server_type,
      r.hostname, r.ip_address ?? '', r.network_subnet ?? '', r.ssh_port, environments.find((e) => e.code === r.environment)?.label ?? r.environment,
      serverOwners.find((o) => o.code === r.server_owner)?.label ?? r.server_owner,
      r.ram ?? '', r.cpu ?? '', r.storage ?? '', r.os_release ?? '', r.host_location ?? '',
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const envColors: Record<string, string> = {
    production: 'text-red-700 bg-red-50 border-red-200',
    test: 'text-blue-700 bg-blue-50 border-blue-200',
    standby: 'text-gray-700 bg-gray-50 border-gray-200',
  };
  const defaultEnvColor = 'text-brand-700 bg-brand-50 border-brand-200';

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
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="View Details"><Eye size={16} /></button>
          {canWrite() && <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Pencil size={16} /></button>}
          {canWrite() && hasRole('admin') && <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>}
        </div>
      ),
    },
  ];

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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft"><ServerIcon size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Server Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered servers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Server</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'ip_address', 'os_release', 'host_location']}
          searchPlaceholder="Search by hostname, IP, OS..."
          dateFilterKey="created_at"
          emptyMessage="No servers registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.hostname ?? ''}
        subtitle={viewing?.asset_id ?? undefined}
        icon={<ServerIcon size={22} />}
        sections={viewSections}
        onEdit={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); openEdit(rec); } : undefined}
        editLabel="Edit Server"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Server' : 'Register New Server'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500">Asset ID</span>
              <span className="font-mono text-sm font-semibold text-brand-700">{editing.asset_id}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Server Type" required hint={serverTypes.length === 0 ? "No server types configured yet — add one under Customization > Server Types." : undefined}>
              <SelectInput value={form.server_type} onChange={(e) => setForm({ ...form, server_type: e.target.value })} required>
                {serverTypes.length === 0 && <option value="">No server types configured</option>}
                {serverTypes.map((t) => <option key={t.id} value={t.code}>{t.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Server Name / Hostname" required>
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="e.g., PROD-APP-01" required />
            </Field>
            <Field
              label="Server IP Address"
              hint={form.ip_address ? (detectedSubnet ? `Detected subnet: ${detectedSubnet.label}` : 'No matching subnet — add one under Customization > IP Subnets') : 'e.g., 10.6.13.45'}
            >
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="10.6.x.x" pattern={IPV4_PATTERN} title="Enter a valid IPv4 address, e.g. 10.6.13.45" />
            </Field>
            <Field label="SSH Port Number">
              <NumberInput value={form.ssh_port} onChange={(e) => setForm({ ...form, ssh_port: e.target.value })} placeholder="22" min={1} max={65535} />
            </Field>
            <Field label="Server Environment" required hint={environments.length === 0 ? "No environments configured yet — add one under Customization > Server Environments." : undefined}>
              <SelectInput value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} required>
                {environments.length === 0 && <option value="">No environments configured</option>}
                {environments.map((env) => <option key={env.id} value={env.code}>{env.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Server Owner" required hint={serverOwners.length === 0 ? "No owners configured yet — an admin can add one under Server Owner Management." : undefined}>
              <SelectInput value={form.server_owner} onChange={(e) => setForm({ ...form, server_owner: e.target.value })} required>
                {serverOwners.length === 0 && <option value="">No server owners configured</option>}
                {serverOwners.map((o) => <option key={o.id} value={o.code}>{o.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Resource RAM">
              <TextInput value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} placeholder="e.g., 32GB" />
            </Field>
            <Field label="Resource CPU">
              <TextInput value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="e.g., 8 cores" />
            </Field>
            <Field label="Resource Storage">
              <TextInput value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="e.g., 1TB" />
            </Field>
            <Field label="OS Release">
              <TextInput value={form.os_release} onChange={(e) => setForm({ ...form, os_release: e.target.value })} placeholder="e.g., Redhat 8, Ubuntu 22.04" />
            </Field>
            <Field label="Host Location">
              <TextInput value={form.host_location} onChange={(e) => setForm({ ...form, host_location: e.target.value })} placeholder="e.g., ESXi 1, ESXi 2" />
            </Field>
          </div>
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} label="Server Photo" hint="Optional — helps identify this server visually" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Server' : 'Register Server'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
