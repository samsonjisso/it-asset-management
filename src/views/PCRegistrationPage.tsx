"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, PCRegistration, Department, AssetModel } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { isValidIPv4, isValidMac, IPV4_PATTERN, MAC_PATTERN } from '../lib/validation';
import { ImageInput } from '../components/ImageInput';
import { ZoomImage } from '../components/ZoomImage';
import { Plus, Pencil, Trash2, Eye, Monitor, Download } from 'lucide-react';

const emptyForm = {
  hostname: '',
  monitor_serial: '',
  asset_tag: '',
  service_tag: '',
  mac_address: '',
  product_key: '',
  cpu: '',
  memory_detail: '',
  generation_detail: '',
  ip_address: '',
  owner_name: '',
  department_id: '',
  floor_number: '',
  switch_port_number: '',
  access_switch_ip: '',
  access_switch_name: '',
  patch_level_number: '',
  model_id: '',
  image: null as string | null,
  notes: '',
};

export function PCRegistrationPage({ autoOpenCreate }: { autoOpenCreate?: number } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<PCRegistration[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pcModels, setPcModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PCRegistration | null>(null);
  const [viewing, setViewing] = useState<PCRegistration | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipAssetTag, setSkipAssetTag] = useState(false);
  const [skipFloor, setSkipFloor] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pcRes, deptRes, modelsRes] = await Promise.all([
      supabase.from('pc_registrations').select('*, department:departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('asset_models').select('*').order('name'),
    ]);
    if (pcRes.data) setRecords(pcRes.data as PCRegistration[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (modelsRes.data) setPcModels((modelsRes.data as AssetModel[]).filter((m) => m.target === 'pc'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setSkipAssetTag(false);
    setSkipFloor(false);
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: PCRegistration) => setViewing(rec);

  const openEdit = (rec: PCRegistration) => {
    setEditing(rec);
    setForm({
      hostname: rec.hostname,
      monitor_serial: rec.monitor_serial ?? '',
      asset_tag: rec.asset_tag ?? '',
      service_tag: rec.service_tag ?? '',
      mac_address: rec.mac_address ?? '',
      product_key: rec.product_key ?? '',
      cpu: rec.cpu ?? '',
      memory_detail: rec.memory_detail ?? '',
      generation_detail: rec.generation_detail ?? '',
      ip_address: rec.ip_address ?? '',
      owner_name: rec.owner_name ?? '',
      department_id: rec.department_id ?? '',
      floor_number: rec.floor_number ?? '',
      switch_port_number: rec.switch_port_number ?? '',
      access_switch_ip: rec.access_switch_ip ?? '',
      access_switch_name: rec.access_switch_name ?? '',
      patch_level_number: rec.patch_level_number ?? '',
      model_id: rec.model_id ?? '',
      image: rec.image ?? null,
      notes: rec.notes ?? '',
    });
    setSkipAssetTag(!rec.asset_tag);
    setSkipFloor(!rec.floor_number);
    setModalOpen(true);
  };

  // Picking a model auto-fills its reference photo (if the user hasn't
  // already uploaded their own photo for this specific unit).
  const handleSelectModel = (modelId: string) => {
    const model = pcModels.find((m) => m.id === modelId);
    setForm((f) => ({ ...f, model_id: modelId, image: f.image ?? model?.image ?? null }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast('Hostname is required', 'error');
      return;
    }
    if (form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      toast('IP Address must be a valid IPv4 address (e.g., 10.6.13.45)', 'error');
      return;
    }
    if (form.mac_address.trim() && !isValidMac(form.mac_address)) {
      toast('MAC Address must look like 00:1A:2B:3C:4D:5E', 'error');
      return;
    }
    if (form.access_switch_ip.trim() && !isValidIPv4(form.access_switch_ip)) {
      toast('Access Switch IP Address must be a valid IPv4 address (e.g., 10.6.1.103)', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      asset_tag: skipAssetTag ? null : form.asset_tag || null,
      floor_number: skipFloor ? null : form.floor_number || null,
      department_id: form.department_id || null,
      model_id: form.model_id || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('pc_registrations').update(payload).eq('id', editing.id)
      : await supabase.from('pc_registrations').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'PC updated successfully' : 'PC registered successfully', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: PCRegistration) => {
    if (!confirm(`Delete PC "${rec.hostname}"?`)) return;
    const { error } = await supabase.from('pc_registrations').delete().eq('id', rec.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('PC deleted', 'success');
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = ['Asset ID', 'Hostname', 'Monitor Serial', 'Asset Tag', 'Service Tag', 'MAC Address', 'CPU', 'Memory Detail', 'Generation Detail', 'IP Address', 'Owner', 'Department', 'Floor', 'Switch Port', 'Access Switch', 'Patch Level', 'Created At'];
    const rows = records.map((r) => [
      r.asset_id ?? '', r.hostname, r.monitor_serial ?? '', r.asset_tag ?? '', r.service_tag ?? '', r.mac_address ?? '', r.cpu ?? '', r.memory_detail ?? '', r.generation_detail ?? '', r.ip_address ?? '', r.owner_name ?? '',
      r.department?.name ?? '', r.floor_number ?? '', r.switch_port_number ?? '', r.access_switch_ip ?? '', r.patch_level_number ?? '',
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pc_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<PCRegistration>[] = [
    { key: 'asset_id', label: 'Key', sortable: true, sortValue: (r) => r.asset_id ?? '', render: (r) => r.asset_id ? <span className="font-mono text-xs font-semibold text-brand-700">{r.asset_id}</span> : <span className="text-gray-400 italic">-</span> },
    { key: 'hostname', label: 'Name', sortable: true, sortValue: (r) => r.hostname, render: (r) => (
      <div className="flex items-center gap-2">
        {r.image && <img src={r.image} alt="" loading="lazy" decoding="async" className="w-6 h-6 rounded object-cover shrink-0" />}
        <span className="font-medium text-gray-900">{r.hostname}</span>
      </div>
    )},
    { key: 'owner_name', label: 'Owner', render: (r) => r.owner_name ?? '-' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg" title="View Details">
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && hasRole('admin') && (
            <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const selectedDept = departments.find((d) => d.id === form.department_id);

  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'PC Information',
      fields: [
        { label: 'Asset ID', value: viewing.asset_id, mono: true },
        { label: 'Hostname', value: viewing.hostname },
        { label: 'Display Monitor / Serial Number', value: viewing.monitor_serial },
        { label: 'Asset Tag', value: viewing.asset_tag },
        { label: 'Service Tag / Serial Number', value: viewing.service_tag },
        { label: 'Product Key / License', value: viewing.product_key, mono: true },
        { label: 'CPU', value: viewing.cpu },
        { label: 'Memory Detail', value: viewing.memory_detail },
        { label: 'Generation Detail', value: viewing.generation_detail },
        { label: 'Model', value: pcModels.find((m) => m.id === viewing.model_id)?.name },
        { label: 'Photo', value: viewing.image ? <ZoomImage src={viewing.image} size={144} /> : null, full: true },
      ],
    },
    {
      title: 'Network',
      fields: [
        { label: 'IP Address', value: viewing.ip_address, mono: true },
        { label: 'MAC Address', value: viewing.mac_address, mono: true },
        { label: 'Switch Port Number', value: viewing.switch_port_number },
        { label: 'Access Switch Name', value: viewing.access_switch_name },
        { label: 'Access Switch IP Address', value: viewing.access_switch_ip, mono: true },
        { label: 'Patch / Level Number', value: viewing.patch_level_number },
      ],
    },
    {
      title: 'Ownership & Location',
      fields: [
        { label: 'Owner / Logged-in User', value: viewing.owner_name },
        { label: 'Department / Branch', value: viewing.department?.name },
        { label: 'Floor Number / Location', value: viewing.floor_number },
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
            <Monitor size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">PC Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered PCs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register PC
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'service_tag', 'asset_tag', 'mac_address', 'ip_address', 'owner_name']}
          searchPlaceholder="Search by hostname, tag, MAC, IP..."
          dateFilterKey="created_at"
          emptyMessage="No PCs registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.hostname ?? ''}
        subtitle={viewing?.asset_id ?? undefined}
        icon={<Monitor size={22} />}
        sections={viewSections}
        onEdit={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); openEdit(rec); } : undefined}
        editLabel="Edit PC"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit PC Registration' : 'Register New PC'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500">Asset ID</span>
              <span className="font-mono text-sm font-semibold text-brand-700">{editing.asset_id}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PC Hostname" required>
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="e.g., PC-HQ-001" required />
            </Field>
            <Field label="Display Monitor / Serial Number">
              <TextInput value={form.monitor_serial} onChange={(e) => setForm({ ...form, monitor_serial: e.target.value })} placeholder="Monitor serial number" />
            </Field>
            <Field label="Asset Tag" skip onSkip={() => setSkipAssetTag(!skipAssetTag)}>
              <TextInput
                value={form.asset_tag}
                onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                placeholder={skipAssetTag ? 'Skipped' : 'Asset tag number'}
                disabled={skipAssetTag}
              />
            </Field>
            <Field label="Service Tag / Serial Number">
              <TextInput value={form.service_tag} onChange={(e) => setForm({ ...form, service_tag: e.target.value })} placeholder="Service tag" />
            </Field>
            <Field label="MAC Address">
              <TextInput value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="00:1A:2B:3C:4D:5E" pattern={MAC_PATTERN} title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E" />
            </Field>
            <Field label="Product Key / License">
              <TextInput value={form.product_key} onChange={(e) => setForm({ ...form, product_key: e.target.value })} placeholder="Product key (link to license)" />
            </Field>
            <Field label="CPU">
              <TextInput value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="e.g., Intel Core i5-1240P" />
            </Field>
            <Field label="Memory Detail">
              <TextInput value={form.memory_detail} onChange={(e) => setForm({ ...form, memory_detail: e.target.value })} placeholder="e.g., 16GB DDR4" />
            </Field>
            <Field label="Generation Detail">
              <TextInput value={form.generation_detail} onChange={(e) => setForm({ ...form, generation_detail: e.target.value })} placeholder="e.g., 12th Gen" />
            </Field>
            <Field label="IP Address">
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="10.6.x.x" pattern={IPV4_PATTERN} title="Enter a valid IPv4 address, e.g. 10.6.13.45" />
            </Field>
            <Field label="Owner / Logged-in User">
              <TextInput value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Employee who uses this PC" />
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
            <Field label="Floor Number / Location" skip={selectedDept?.is_branch} onSkip={() => setSkipFloor(!skipFloor)}>
              <TextInput
                value={form.floor_number}
                onChange={(e) => setForm({ ...form, floor_number: e.target.value })}
                placeholder={skipFloor || selectedDept?.is_branch ? 'Skipped (branch location)' : 'Floor number'}
                disabled={skipFloor || selectedDept?.is_branch}
              />
            </Field>
            <Field label="Switch Port Number">
              <TextInput value={form.switch_port_number} onChange={(e) => setForm({ ...form, switch_port_number: e.target.value })} placeholder="e.g., Port 24" />
            </Field>
            <Field label="Access Switch Name">
              <TextInput value={form.access_switch_name} onChange={(e) => setForm({ ...form, access_switch_name: e.target.value })} placeholder="e.g., Access Switch 01" />
            </Field>
            <Field label="Access Switch IP Address">
              <TextInput value={form.access_switch_ip} onChange={(e) => setForm({ ...form, access_switch_ip: e.target.value })} placeholder="e.g., 10.6.1.103" pattern={IPV4_PATTERN} title="Enter a valid IPv4 address, e.g. 10.6.1.103" />
            </Field>
            <Field label="Patch / Level Number">
              <TextInput value={form.patch_level_number} onChange={(e) => setForm({ ...form, patch_level_number: e.target.value })} placeholder="Patch level number" />
            </Field>
            <Field label="Model" hint={pcModels.length === 0 ? "No models defined yet — add one under Customization > Asset Models." : "Selecting a model fills in its default photo"}>
              <SelectInput value={form.model_id} onChange={(e) => handleSelectModel(e.target.value)}>
                <option value="">Select model (optional)</option>
                {pcModels.map((m) => <option key={m.id} value={m.id}>{m.name}{m.manufacturer ? ` (${m.manufacturer})` : ''}</option>)}
              </SelectInput>
            </Field>
          </div>
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} label="PC Photo" hint="Optional — helps identify this specific unit" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update PC' : 'Register PC'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
