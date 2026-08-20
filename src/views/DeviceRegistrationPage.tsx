"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, Device, DeviceType, AssetModel, DeviceOwner } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, NumberInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { isValidIPv4, isValidMac, IPV4_PATTERN, MAC_PATTERN } from '../lib/validation';
import { ImageInput } from '../components/ImageInput';
import { ZoomImage } from '../components/ZoomImage';
import { Plus, Eye, HardDrive, Download, Pencil, Trash2, Check, Settings2 } from 'lucide-react';
import {
  STD_FIELD_META,
  parseBaseFields,
  parseRequiredBaseFields,
  parseCoreFields,
  parseRequiredCoreFields,
  parseFieldLabels,
  parseExtraFields,
  getDeviceTypeIcon,
} from '../lib/deviceTypeFields';

function parseExtraData(device?: Device | null): Record<string, string> {
  if (!device?.extra_data) return {};
  try {
    const parsed = JSON.parse(device.extra_data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const emptyForm = {
  device_type: '',
  device_owner: '',
  device_model: '',
  hostname: '',
  ip_address: '',
  serial_number: '',
  mac_address: '',
  location: '',
  rack_number: '',
  model_id: '',
  image: null as string | null,
  notes: '',
  extra_data: {} as Record<string, string>,
};

export function DeviceRegistrationPage({ autoOpenCreate, onNavigate }: { autoOpenCreate?: number; onNavigate?: (page: string) => void } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [deviceOwners, setDeviceOwners] = useState<DeviceOwner[]>([]);
  const [deviceModels, setDeviceModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [viewing, setViewing] = useState<Device | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipIP, setSkipIP] = useState(false);

  // Device Owner / Department options manager (inline, next to the
  // Device Owner field) — same add/rename/delete pattern used for
  // device types and custom fields, applied to the owner dropdown.
  const [ownerManagerOpen, setOwnerManagerOpen] = useState(false);
  const [newOwnerLabel, setNewOwnerLabel] = useState('');
  const [savingOwner, setSavingOwner] = useState(false);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [editingOwnerLabel, setEditingOwnerLabel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [devicesRes, typesRes, ownersRes, modelsRes] = await Promise.all([
      supabase.from('devices').select('*').order('created_at', { ascending: false }),
      supabase.from('device_types').select('*').order('label'),
      supabase.from('device_owners').select('*').order('label'),
      supabase.from('asset_models').select('*').order('name'),
    ]);
    if (devicesRes.data) setRecords(devicesRes.data as Device[]);
    if (typesRes.data) setDeviceTypes(typesRes.data as DeviceType[]);
    if (ownersRes.data) setDeviceOwners(ownersRes.data as DeviceOwner[]);
    if (modelsRes.data) setDeviceModels((modelsRes.data as AssetModel[]).filter((m) => m.target === 'device'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, device_type: deviceTypes[0]?.code ?? '', device_owner: deviceOwners[0]?.code ?? '' });
    setSkipIP(false);
    setOwnerManagerOpen(false);
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: Device) => setViewing(rec);

  const selectedType = useMemo(
    () => deviceTypes.find((t) => t.code === form.device_type) ?? null,
    [deviceTypes, form.device_type]
  );
  const baseFields = useMemo(() => parseBaseFields(selectedType), [selectedType]);
  const requiredBaseFields = useMemo(() => parseRequiredBaseFields(selectedType), [selectedType]);
  const coreFields = useMemo(() => parseCoreFields(selectedType), [selectedType]);
  const requiredCoreFields = useMemo(() => parseRequiredCoreFields(selectedType), [selectedType]);
  const fieldLabels = useMemo(() => parseFieldLabels(selectedType), [selectedType]);
  const fieldLabel = useCallback(
    (key: string) => fieldLabels[key] ?? STD_FIELD_META[key]?.label ?? key,
    [fieldLabels]
  );
  const fieldPlaceholder = useCallback((key: string) => STD_FIELD_META[key]?.placeholder, []);
  const extraFields = useMemo(() => parseExtraFields(selectedType), [selectedType]);

  // Switching device type changes which extra fields apply, so any
  // values entered for the previous type's extra fields are cleared
  // rather than silently carried over (and mis-saved) under the new
  // type's field keys.
  const selectDeviceType = (code: string) => {
    setForm((f) => ({ ...f, device_type: code, extra_data: {}, model_id: '' }));
    setSkipIP(false);
  };

  const setExtraField = (key: string, value: string) => {
    setForm((f) => ({ ...f, extra_data: { ...f.extra_data, [key]: value } }));
  };

  // Selecting a predefined model auto-fills its photo (unless the user
  // already uploaded their own for this specific unit) and its name
  // into the free-text Device Model field.
  const handleSelectModel = (modelId: string) => {
    const model = deviceModels.find((m) => m.id === modelId);
    setForm((f) => ({
      ...f,
      model_id: modelId,
      device_model: model ? model.name : f.device_model,
      image: f.image ?? model?.image ?? null,
    }));
  };

  const modelsForType = useMemo(
    () => deviceModels.filter((m) => !m.device_type || m.device_type === form.device_type),
    [deviceModels, form.device_type]
  );

  const openEdit = (rec: Device) => {
    setEditing(rec);
    setForm({
      device_type: rec.device_type,
      device_owner: rec.device_owner ?? '',
      device_model: rec.device_model ?? '',
      hostname: rec.hostname ?? '',
      ip_address: rec.ip_address ?? '',
      serial_number: rec.serial_number ?? '',
      mac_address: rec.mac_address ?? '',
      location: rec.location ?? '',
      rack_number: rec.rack_number ?? '',
      model_id: rec.model_id ?? '',
      image: rec.image ?? null,
      notes: rec.notes ?? '',
      extra_data: parseExtraData(rec),
    });
    setSkipIP(!rec.ip_address);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.device_type) {
      toast('Device Type is required', 'error');
      return;
    }
    // Enforce any fields the device type's admin marked as mandatory —
    // core fields (Owner, Model, Hostname), standard fields (IP, Serial,
    // MAC, Location, Rack Number), and the type's own custom fields.
    for (const key of [...requiredCoreFields.filter((k) => coreFields.includes(k)), ...requiredBaseFields]) {
      if (key === 'ip_address' && skipIP) {
        toast('Device IP Address is required for this device type and cannot be skipped', 'error');
        return;
      }
      const value = (form as Record<string, unknown>)[key];
      if (!value || (typeof value === 'string' && !value.trim())) {
        toast(`${fieldLabel(key)} is required`, 'error');
        return;
      }
    }
    for (const f of extraFields) {
      if (f.required && !(form.extra_data[f.key] ?? '').trim()) {
        toast(`${f.label} is required`, 'error');
        return;
      }
      if (f.type === 'number') {
        const v = form.extra_data[f.key];
        if (v && !/^-?\d+(\.\d+)?$/.test(v.trim())) {
          toast(`${f.label} must be a number`, 'error');
          return;
        }
      }
    }
    if (!skipIP && baseFields.includes('ip_address') && form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      toast(`${fieldLabel('ip_address')} must be a valid IPv4 address (e.g., 10.6.13.45)`, 'error');
      return;
    }
    if (baseFields.includes('mac_address') && form.mac_address.trim() && !isValidMac(form.mac_address)) {
      toast(`${fieldLabel('mac_address')} must look like 00:1A:2B:3C:4D:5E`, 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      device_owner: coreFields.includes('device_owner') ? form.device_owner || null : null,
      device_model: coreFields.includes('device_model') ? form.device_model || null : null,
      hostname: coreFields.includes('hostname') ? form.hostname || null : null,
      ip_address: !skipIP && baseFields.includes('ip_address') ? form.ip_address || null : null,
      serial_number: baseFields.includes('serial_number') ? form.serial_number || null : null,
      mac_address: baseFields.includes('mac_address') ? form.mac_address || null : null,
      location: baseFields.includes('location') ? form.location || null : null,
      rack_number: baseFields.includes('rack_number') ? form.rack_number || null : null,
      model_id: form.model_id || null,
      image: form.image || null,
      notes: form.notes || null,
      extra_data: extraFields.length ? JSON.stringify(form.extra_data) : null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('devices').update(payload).eq('id', editing.id)
      : await supabase.from('devices').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(editing ? 'Device updated' : 'Device registered', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Device) => {
    if (!confirm(`Delete device "${rec.hostname}"?`)) return;
    const { error } = await supabase.from('devices').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Device deleted', 'success');
      loadData();
    }
  };

  const addOwner = async () => {
    const label = newOwnerLabel.trim();
    if (!label) return;
    if (deviceOwners.some((o) => o.label.toLowerCase() === label.toLowerCase())) {
      toast('That owner/department already exists', 'error');
      return;
    }
    setSavingOwner(true);
    const { data, error } = await supabase.from('device_owners').insert({ label });
    setSavingOwner(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    const saved = data as DeviceOwner;
    setDeviceOwners((prev) => [...prev, saved].sort((a, b) => a.label.localeCompare(b.label)));
    setNewOwnerLabel('');
    if (!form.device_owner) setForm((f) => ({ ...f, device_owner: saved.code }));
  };

  const startRenameOwner = (owner: DeviceOwner) => {
    setEditingOwnerId(owner.id);
    setEditingOwnerLabel(owner.label);
  };

  const cancelRenameOwner = () => {
    setEditingOwnerId(null);
    setEditingOwnerLabel('');
  };

  const saveRenameOwner = async () => {
    const label = editingOwnerLabel.trim();
    if (!label || !editingOwnerId) {
      cancelRenameOwner();
      return;
    }
    const { data, error } = await supabase.from('device_owners').update({ label }).eq('id', editingOwnerId);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    const saved = data as DeviceOwner;
    setDeviceOwners((prev) => prev.map((o) => (o.id === saved.id ? saved : o)).sort((a, b) => a.label.localeCompare(b.label)));
    cancelRenameOwner();
  };

  const handleDeleteOwner = async (owner: DeviceOwner) => {
    if (!confirm(`Delete owner/department "${owner.label}"?`)) return;
    const { error } = await supabase.from('device_owners').delete().eq('id', owner.id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Owner/department deleted', 'success');
    setDeviceOwners((prev) => prev.filter((o) => o.id !== owner.id));
    if (form.device_owner === owner.code) setForm((f) => ({ ...f, device_owner: '' }));
  };

  const exportCSV = () => {
    const headers = ['Asset ID', 'Device Type', 'Owner', 'Model', 'Hostname', 'IP Address', 'Serial Number', 'MAC Address', 'Location', 'Rack Number', 'Extra Details', 'Created At'];
    const rows = records.map((r) => {
      const type = deviceTypes.find((t) => t.code === r.device_type);
      const extra = parseExtraData(r);
      const extraFieldDefs = parseExtraFields(type);
      const extraText = extraFieldDefs
        .filter((f) => extra[f.key])
        .map((f) => `${f.label}: ${extra[f.key]}`)
        .join('; ');
      return [
        r.asset_id ?? '',
        type?.label ?? r.device_type,
        deviceOwners.find((o) => o.code === r.device_owner)?.label ?? r.device_owner ?? '',
        r.device_model ?? '', r.hostname ?? '', r.ip_address ?? '', r.serial_number ?? '', r.mac_address ?? '',
        r.location ?? '', r.rack_number ?? '', extraText, new Date(r.created_at).toLocaleDateString(),
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: string) => getDeviceTypeIcon(deviceTypes, type);

  const columns: Column<Device>[] = [
    { key: 'asset_id', label: 'Key', sortable: true, sortValue: (r) => r.asset_id ?? '', render: (r) => r.asset_id ? <span className="font-mono text-xs font-semibold text-brand-700">{r.asset_id}</span> : <span className="text-gray-400 italic">-</span> },
    { key: 'hostname', label: 'Name', sortable: true, sortValue: (r) => r.hostname ?? '', render: (r) => (
      <div className="flex items-center gap-2 font-medium text-gray-900">
        {r.image ? (
          <img src={r.image} alt="" loading="lazy" decoding="async" className="w-6 h-6 rounded object-cover shrink-0" />
        ) : (
          <span className="text-brand-600">{getDeviceIcon(r.device_type)}</span>
        )}
        <span>{r.hostname || r.device_model || <span className="text-gray-400 italic font-normal">Unnamed device</span>}</span>
      </div>
    )},
    { key: 'device_type', label: 'Type', sortable: true, sortValue: (r) => r.device_type, render: (r) => deviceTypes.find((t) => t.code === r.device_type)?.label ?? r.device_type },
    { key: 'device_owner', label: 'Owner', render: (r) => (r.device_owner ? deviceOwners.find((o) => o.code === r.device_owner)?.label ?? r.device_owner : <span className="text-gray-400 italic">—</span>) },
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

  const viewingType = viewing ? deviceTypes.find((t) => t.code === viewing.device_type) ?? null : null;
  const viewingBaseFields = parseBaseFields(viewingType);
  const viewingCoreFields = parseCoreFields(viewingType);
  const viewingFieldLabels = parseFieldLabels(viewingType);
  const viewingFieldLabel = (key: string) => viewingFieldLabels[key] ?? STD_FIELD_META[key]?.label ?? key;
  const viewingExtraFields = parseExtraFields(viewingType);
  const viewingExtraData = parseExtraData(viewing);

  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'Device Information',
      fields: [
        { label: 'Asset ID', value: viewing.asset_id, mono: true },
        { label: 'Device Type', value: viewingType?.label ?? viewing.device_type },
        ...(viewingCoreFields.includes('device_owner')
          ? [{ label: viewingFieldLabel('device_owner'), value: deviceOwners.find((o) => o.code === viewing.device_owner)?.label ?? viewing.device_owner }]
          : []),
        ...(viewingCoreFields.includes('device_model')
          ? [{ label: viewingFieldLabel('device_model'), value: viewing.device_model }]
          : []),
        { label: 'Photo', value: viewing.image ? <ZoomImage src={viewing.image} size={144} /> : null, full: true },
        ...(viewingCoreFields.includes('hostname')
          ? [{ label: viewingFieldLabel('hostname'), value: viewing.hostname }]
          : []),
        ...(viewingBaseFields.includes('serial_number')
          ? [{ label: 'Serial Number', value: viewing.serial_number, mono: true }]
          : []),
      ],
    },
    ...(viewingExtraFields.length
      ? [{
          title: 'Type-Specific Details',
          fields: viewingExtraFields.map((f) => ({ label: f.label, value: viewingExtraData[f.key] })),
        }]
      : []),
    ...(viewingBaseFields.includes('ip_address') || viewingBaseFields.includes('mac_address')
      ? [{
          title: 'Network',
          fields: [
            ...(viewingBaseFields.includes('ip_address') ? [{ label: viewingFieldLabel('ip_address'), value: viewing.ip_address, mono: true }] : []),
            ...(viewingBaseFields.includes('mac_address') ? [{ label: viewingFieldLabel('mac_address'), value: viewing.mac_address, mono: true }] : []),
          ],
        }]
      : []),
    ...(viewingBaseFields.includes('location') || viewingBaseFields.includes('rack_number')
      ? [{
          title: 'Location',
          fields: [
            ...(viewingBaseFields.includes('location') ? [{ label: viewingFieldLabel('location'), value: viewing.location }] : []),
            ...(viewingBaseFields.includes('rack_number') ? [{ label: viewingFieldLabel('rack_number'), value: viewing.rack_number }] : []),
          ],
        }]
      : []),
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
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft"><HardDrive size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Device Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered devices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Device</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'serial_number', 'ip_address', 'device_model', 'location']}
          searchPlaceholder="Search by hostname, serial, IP, model..."
          dateFilterKey="created_at"
          emptyMessage="No devices registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? (deviceTypes.find((t) => t.code === viewing.device_type)?.label ?? viewing.hostname ?? 'Device') : ''}
        subtitle={viewing?.hostname ?? undefined}
        icon={viewing ? getDeviceIcon(viewing.device_type) : undefined}
        sections={viewSections}
        onEdit={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); openEdit(rec); } : undefined}
        editLabel="Edit Device"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Device' : 'Register New Device'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500">Asset ID</span>
              <span className="font-mono text-sm font-semibold text-brand-700">{editing.asset_id}</span>
            </div>
          )}
          {/* Device type grid selector */}
          <Field
            label="Device Type"
            required
            hint={
              deviceTypes.length === 0
                ? "No device types yet — add one under Customization > Device Types."
                : undefined
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {deviceTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectDeviceType(t.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                    form.device_type === t.code
                      ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-brand-600/40 hover:bg-gray-50'
                  }`}
                >
                  {getDeviceIcon(t.code)}
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
            {onNavigate && (hasRole('admin') || canWrite()) && (
              <button
                type="button"
                onClick={() => onNavigate('device_types')}
                className="mt-1 self-start inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
                title="Add, edit, or remove device types and their fields"
              >
                <Settings2 size={13} /> {deviceTypes.length === 0 ? 'Add a device type' : "Don't see the right type? Manage device types"}
              </button>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coreFields.includes('device_owner') && (
              <Field label={fieldLabel('device_owner')} required={requiredCoreFields.includes('device_owner')}>
                <SelectInput
                  value={form.device_owner}
                  onChange={(e) => setForm({ ...form, device_owner: e.target.value })}
                  required={requiredCoreFields.includes('device_owner')}
                >
                  <option value="">Select owner/department...</option>
                  {deviceOwners.map((o) => <option key={o.id} value={o.code}>{o.label}</option>)}
                </SelectInput>
                {hasRole('admin') && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setOwnerManagerOpen((v) => !v)}
                      className="text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
                    >
                      {ownerManagerOpen ? 'Close' : 'Manage options'}
                    </button>
                    {ownerManagerOpen && (
                      <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {deviceOwners.map((o) =>
                            editingOwnerId === o.id ? (
                              <span key={o.id} className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-lg bg-white border border-brand-300">
                                <TextInput
                                  value={editingOwnerLabel}
                                  onChange={(e) => setEditingOwnerLabel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); saveRenameOwner(); }
                                    if (e.key === 'Escape') { e.preventDefault(); cancelRenameOwner(); }
                                  }}
                                  autoFocus
                                  className="!py-1 !px-2 text-xs w-32"
                                />
                                <button type="button" onClick={saveRenameOwner} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand-50 text-brand-600" title="Save">
                                  <Check size={12} />
                                </button>
                                <button type="button" onClick={cancelRenameOwner} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400" title="Cancel">
                                  ×
                                </button>
                              </span>
                            ) : (
                              <span
                                key={o.id}
                                className="relative flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs font-medium text-brand-700"
                              >
                                <button type="button" onClick={() => startRenameOwner(o)} title="Rename" className="hover:underline underline-offset-2">
                                  {o.label}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOwner(o)}
                                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-100 text-brand-500"
                                  title="Delete"
                                >
                                  ×
                                </button>
                              </span>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <TextInput
                            value={newOwnerLabel}
                            onChange={(e) => setNewOwnerLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); addOwner(); }
                            }}
                            placeholder="e.g., Network Operations"
                            className="flex-1 min-w-[140px] !py-1.5 text-xs"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addOwner} loading={savingOwner}>
                            <Plus size={13} /> Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Field>
            )}
            {coreFields.includes('device_model') && (
              <Field
                label={fieldLabel('device_model')}
                required={requiredCoreFields.includes('device_model')}
                hint={modelsForType.length > 0 ? 'Pick a predefined model to auto-fill this and the photo' : undefined}
              >
                <TextInput
                  value={form.device_model}
                  onChange={(e) => setForm({ ...form, device_model: e.target.value, model_id: '' })}
                  placeholder={fieldPlaceholder('device_model')}
                  required={requiredCoreFields.includes('device_model')}
                />
              </Field>
            )}
            {modelsForType.length > 0 && (
              <Field label="Predefined Model" hint="Optional — defined under Customization > Asset Models">
                <SelectInput value={form.model_id} onChange={(e) => handleSelectModel(e.target.value)}>
                  <option value="">Choose a model...</option>
                  {modelsForType.map((m) => <option key={m.id} value={m.id}>{m.name}{m.manufacturer ? ` (${m.manufacturer})` : ''}</option>)}
                </SelectInput>
              </Field>
            )}
            {coreFields.includes('hostname') && (
              <Field label={fieldLabel('hostname')} required={requiredCoreFields.includes('hostname')}>
                <TextInput
                  value={form.hostname}
                  onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                  placeholder={fieldPlaceholder('hostname')}
                  required={requiredCoreFields.includes('hostname')}
                />
              </Field>
            )}
            {baseFields.includes('ip_address') && (
              <Field
                label={fieldLabel('ip_address')}
                required={requiredBaseFields.includes('ip_address')}
                skip={!requiredBaseFields.includes('ip_address')}
                onSkip={() => setSkipIP(!skipIP)}
              >
                <TextInput
                  value={form.ip_address}
                  onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                  placeholder={skipIP ? 'Skipped' : fieldPlaceholder('ip_address')}
                  disabled={skipIP}
                  required={requiredBaseFields.includes('ip_address')}
                  pattern={IPV4_PATTERN}
                  title="Enter a valid IPv4 address, e.g. 10.6.13.45"
                />
              </Field>
            )}
            {baseFields.includes('serial_number') && (
              <Field label={fieldLabel('serial_number')} required={requiredBaseFields.includes('serial_number')}>
                <TextInput value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder={fieldPlaceholder('serial_number')} required={requiredBaseFields.includes('serial_number')} />
              </Field>
            )}
            {baseFields.includes('mac_address') && (
              <Field label={fieldLabel('mac_address')} required={requiredBaseFields.includes('mac_address')}>
                <TextInput
                  value={form.mac_address}
                  onChange={(e) => setForm({ ...form, mac_address: e.target.value })}
                  placeholder={fieldPlaceholder('mac_address')}
                  required={requiredBaseFields.includes('mac_address')}
                  pattern={MAC_PATTERN}
                  title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E"
                />
              </Field>
            )}
            {baseFields.includes('location') && (
              <Field label={fieldLabel('location')} required={requiredBaseFields.includes('location')}>
                <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={fieldPlaceholder('location')} required={requiredBaseFields.includes('location')} />
              </Field>
            )}
            {baseFields.includes('rack_number') && (
              <Field label={fieldLabel('rack_number')} required={requiredBaseFields.includes('rack_number')}>
                <NumberInput value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} placeholder={fieldPlaceholder('rack_number')} required={requiredBaseFields.includes('rack_number')} />
              </Field>
            )}
          </div>
          {extraFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {selectedType?.label} Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map((f) => (
                  <Field key={f.key} label={f.label} required={f.required}>
                    {f.type === 'number' ? (
                      <NumberInput
                        value={form.extra_data[f.key] ?? ''}
                        onChange={(e) => setExtraField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    ) : (
                      <TextInput
                        type={f.type === 'date' ? 'date' : 'text'}
                        value={form.extra_data[f.key] ?? ''}
                        onChange={(e) => setExtraField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          )}
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} label="Device Photo" hint="Optional — helps identify this specific unit" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Device' : 'Register Device'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
