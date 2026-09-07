'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, Device, DeviceType, AssetModel, DeviceOwner, Department, DirectoryUser, Floor, IPAddress } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, NumberInput, TextArea, Button } from '../components/FormControls';
import { SearchableSelect } from '../components/SearchableSelect';
import { isValidIPv4, isValidMac, MAC_PATTERN } from '../lib/validation';
import { ImageInput } from '../components/ImageInput';
import { ZoomImage } from '../components/ZoomImage';
import { DynamicField } from '../components/DynamicField';
import { validateFieldValue, formatFieldValueForDisplay, decodeFileValue } from '../lib/deviceFieldValues';
import { fetchProfileDirectory } from '../lib/api';
import { Plus, Eye, HardDrive, Download, Upload, Pencil, Trash2, Settings2 } from 'lucide-react';
import { ImportModal, ImportColumn } from '../components/ImportModal';
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
  department_id: '',
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [viewing, setViewing] = useState<Device | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipIP, setSkipIP] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [devicesRes, typesRes, ownersRes, modelsRes, deptsRes, floorsRes, employeesRes, ipRes] = await Promise.all([
      supabase.from('devices').select('*').order('created_at', { ascending: false }),
      supabase.from('device_types').select('*').order('label'),
      supabase.from('device_owners').select('*').order('label'),
      supabase.from('asset_models').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
      // Admin Customization > Floors — same list PC Registration draws
      // its "Floor Number / Location" dropdown from (see FloorsPage.tsx),
      // ordered by the admin-defined position rather than alphabetically.
      supabase.from('floors').select('*').order('position'),
      // Every viewer needs this to resolve who registered a record
      // ("Registered By" in the detail view), not just writers using
      // the employee picker — see GET /profiles/directory.
      fetchProfileDirectory(),
      // IP Management records — the Device IP Address field is a
      // search/select drawn from here rather than free-typed, so it
      // only ever offers addresses that are actually configured.
      supabase.from('ip_addresses').select('*').order('ip_address', { ascending: true }),
    ]);
    if (devicesRes.data) setRecords(devicesRes.data as Device[]);
    if (typesRes.data) setDeviceTypes(typesRes.data as DeviceType[]);
    if (ownersRes.data) setDeviceOwners(ownersRes.data as DeviceOwner[]);
    if (modelsRes.data) setDeviceModels((modelsRes.data as AssetModel[]).filter((m) => m.target === 'device'));
    if (deptsRes.data) setDepartments(deptsRes.data as Department[]);
    if (floorsRes.data) setFloors(floorsRes.data as Floor[]);
    if (employeesRes.data) setEmployees(employeesRes.data as DirectoryUser[]);
    if (ipRes.data) setIpAddresses(ipRes.data as IPAddress[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, device_type: deviceTypes[0]?.code ?? '', device_owner: deviceOwners[0]?.code ?? '' });
    setSkipIP(false);
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      if (canWrite()) openAdd();
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
  const departmentLabel = useCallback((id: string) => departments.find((d) => d.id === id)?.name ?? id, [departments]);
  const employeeLabel = useCallback((id: string) => employees.find((e) => e.id === id)?.full_name ?? id, [employees]);

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

  // Device IP Address options: drawn from IP Management (ip_addresses)
  // rather than free-typed, so registration always ties back to an
  // address actually configured there. Addresses already tied to a
  // different device are hidden to steer away from an obvious
  // conflict, but the record being edited keeps its own address
  // selectable, and a legacy free-typed value not found in IP
  // Management (from before this field existed) is kept as a one-off
  // option so it isn't silently dropped from the field.
  const deviceIpOptions = useMemo(() => {
    const usedByOtherDevice = new Set(
      records.filter((r) => r.id !== editing?.id && r.ip_address).map((r) => r.ip_address as string)
    );
    const opts = ipAddresses
      .filter((ip) => ip.ip_address === form.ip_address || !usedByOtherDevice.has(ip.ip_address))
      .map((ip) => ({
        value: ip.ip_address,
        label: ip.ip_address,
        sublabel: [ip.hostname, ip.status].filter(Boolean).join(' · '),
      }));
    if (form.ip_address && !opts.some((o) => o.value === form.ip_address)) {
      opts.unshift({ value: form.ip_address, label: form.ip_address, sublabel: 'Not in IP Management' });
    }
    return opts;
  }, [ipAddresses, records, editing, form.ip_address]);

  const openEdit = (rec: Device) => {
    setEditing(rec);
    setForm({
      device_type: rec.device_type,
      device_owner: rec.device_owner ?? '',
      department_id: rec.department_id ?? '',
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
      const err = validateFieldValue(f, form.extra_data[f.key]);
      if (err) {
        toast(err, 'error');
        return;
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
      department_id: coreFields.includes('department_id') ? form.department_id || null : null,
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

  const exportCSV = () => {
    const headers = ['Asset ID', 'Device Type', 'Owner', 'Department', 'Model', 'Hostname', 'IP Address', 'Serial Number', 'MAC Address', 'Location', 'Rack Number', 'Extra Details', 'Created At'];
    const rows = records.map((r) => {
      const type = deviceTypes.find((t) => t.code === r.device_type);
      const extra = parseExtraData(r);
      const extraFieldDefs = parseExtraFields(type);
      const extraText = extraFieldDefs
        .map((f) => [f.label, formatFieldValueForDisplay(f, extra[f.key], { departmentLabel, employeeLabel })] as const)
        .filter(([, v]) => v)
        .map(([label, v]) => `${label}: ${v}`)
        .join('; ');
      return [
        r.asset_id ?? '',
        type?.label ?? r.device_type,
        deviceOwners.find((o) => o.code === r.device_owner)?.label ?? r.device_owner ?? '',
        r.department?.name ?? '',
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

  // Bulk import from Excel/CSV — see ImportModal. Since Device Type
  // drives which fields apply/are required, and each row can name a
  // different device type, requiredness is resolved per row against
  // that row's own type rather than the form's currently-selected one.
  // Fully-custom per-type extra fields aren't covered by the import.
  const [importOpen, setImportOpen] = useState(false);
  const findByLabel = <T,>(list: T[], getLabel: (t: T) => string, needle: string) =>
    list.find((x) => getLabel(x).trim().toLowerCase() === needle.trim().toLowerCase());

  const importColumns: ImportColumn[] = [
    { key: 'device_type', label: 'Device Type', required: true, example: deviceTypes[0]?.label },
    { key: 'device_owner', label: 'Device Owner' },
    { key: 'department', label: 'Department' },
    { key: 'device_model', label: 'Device Model (Detail Specification)', example: 'Dell PowerEdge R740' },
    { key: 'hostname', label: 'Device Hostname' },
    { key: 'ip_address', label: 'Device IP Address', example: '10.6.13.45' },
    { key: 'serial_number', label: 'Device Serial Number' },
    { key: 'mac_address', label: 'Device MAC Address', example: '00:1A:2B:3C:4D:5E' },
    { key: 'location', label: 'Location' },
    { key: 'rack_number', label: 'Rack Number' },
    { key: 'notes', label: 'Notes' },
  ];

  const validateImportRow = (raw: Record<string, string>) => {
    const preview = { ...raw };
    const errors: string[] = [];
    const type = raw.device_type ? findByLabel(deviceTypes, (t) => t.label, raw.device_type) : undefined;
    if (!raw.device_type) errors.push('Device Type is required');
    else if (!type) errors.push(`Device Type "${raw.device_type}" not found`);

    const coreF = parseCoreFields(type);
    const reqCoreF = parseRequiredCoreFields(type);
    const baseF = parseBaseFields(type);
    const reqBaseF = parseRequiredBaseFields(type);
    const fieldLabels = parseFieldLabels(type);
    const label = (key: string) => fieldLabels[key] ?? STD_FIELD_META[key]?.label ?? key;

    let ownerCode: string | null = null;
    if (coreF.includes('device_owner')) {
      if (raw.device_owner) {
        const owner = findByLabel(deviceOwners, (o) => o.label, raw.device_owner);
        if (!owner) errors.push(`Device Owner "${raw.device_owner}" not found`);
        else ownerCode = owner.code;
      } else if (reqCoreF.includes('device_owner')) errors.push(`${label('device_owner')} is required`);
    }
    let deptId: string | null = null;
    if (coreF.includes('department_id')) {
      if (raw.department) {
        const dept = findByLabel(departments, (d) => d.name, raw.department);
        if (!dept) errors.push(`Department "${raw.department}" not found`);
        else deptId = dept.id;
      } else if (reqCoreF.includes('department_id')) errors.push(`${label('department_id')} is required`);
    }
    if (coreF.includes('device_model') && reqCoreF.includes('device_model') && !raw.device_model) errors.push(`${label('device_model')} is required`);
    if (coreF.includes('hostname') && reqCoreF.includes('hostname') && !raw.hostname) errors.push(`${label('hostname')} is required`);

    let ipValue: string | null = null;
    if (baseF.includes('ip_address')) {
      if (raw.ip_address) {
        const ipRec = ipAddresses.find((ip) => ip.ip_address === raw.ip_address.trim());
        if (!ipRec) errors.push(`IP Address "${raw.ip_address}" isn't a registered IP — add it under IP Management first`);
        else ipValue = ipRec.ip_address;
      } else if (reqBaseF.includes('ip_address')) errors.push(`${label('ip_address')} is required`);
    }
    if (baseF.includes('serial_number') && reqBaseF.includes('serial_number') && !raw.serial_number) errors.push(`${label('serial_number')} is required`);
    if (baseF.includes('mac_address')) {
      if (raw.mac_address && !isValidMac(raw.mac_address)) errors.push(`${label('mac_address')} must look like 00:1A:2B:3C:4D:5E`);
      else if (reqBaseF.includes('mac_address') && !raw.mac_address) errors.push(`${label('mac_address')} is required`);
    }
    let locationValue: string | null = null;
    if (baseF.includes('location')) {
      if (raw.location) {
        const floor = findByLabel(floors, (f) => f.label, raw.location);
        if (!floor) errors.push(`Location "${raw.location}" not found`);
        else locationValue = floor.label;
      } else if (reqBaseF.includes('location')) errors.push(`${label('location')} is required`);
    }
    if (baseF.includes('rack_number') && reqBaseF.includes('rack_number') && !raw.rack_number) errors.push(`${label('rack_number')} is required`);

    if (errors.length) return { preview, error: errors.join('; ') };

    const values = {
      device_type: type!.code,
      device_owner: coreF.includes('device_owner') ? ownerCode : null,
      department_id: coreF.includes('department_id') ? deptId : null,
      device_model: coreF.includes('device_model') ? raw.device_model || null : null,
      hostname: coreF.includes('hostname') ? raw.hostname || null : null,
      ip_address: baseF.includes('ip_address') ? ipValue : null,
      serial_number: baseF.includes('serial_number') ? raw.serial_number || null : null,
      mac_address: baseF.includes('mac_address') ? raw.mac_address || null : null,
      location: baseF.includes('location') ? locationValue : null,
      rack_number: baseF.includes('rack_number') ? raw.rack_number || null : null,
      model_id: null,
      image: null,
      notes: raw.notes || null,
      extra_data: null,
      registered_by: profile?.id,
    };
    return { preview, values };
  };

  const importDeviceRow = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from('devices').insert(values);
    return error?.message ?? null;
  };

  const getDeviceIcon = (type: string) => getDeviceTypeIcon(deviceTypes, type);

  // Comprehensive search text: raw fields plus resolved labels (device
  // type, owner, model) and any custom field values, so a search for
  // "Core Switch" or an owner's department name matches even though
  // those are stored as codes on the row itself.
  const deviceSearchValue = (r: Device) => {
    const type = deviceTypes.find((t) => t.code === r.device_type);
    const owner = deviceOwners.find((o) => o.code === r.device_owner);
    const model = deviceModels.find((m) => m.id === r.model_id);
    const extra = parseExtraData(r);
    return [
      r.asset_id, r.hostname, type?.label, r.device_type, owner?.label, r.device_owner, r.department?.name,
      r.device_model, model?.name, r.ip_address, r.serial_number, r.mac_address,
      r.location, r.rack_number, r.notes,
      ...Object.values(extra),
    ].filter(Boolean).join(' ');
  };

  const columns: Column<Device>[] = [
    { key: 'asset_id', label: 'Key', sortable: true, sortValue: (r) => r.asset_id ?? '', render: (r) => r.asset_id ? <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{r.asset_id}</span> : <span className="text-gray-400 dark:text-gray-500 italic">-</span> },
    { key: 'hostname', label: 'Name', sortable: true, sortValue: (r) => r.hostname ?? '', render: (r) => (
      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
        {r.image ? (
          <img src={r.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
        ) : (
          <span className="text-brand-600">{getDeviceIcon(r.device_type)}</span>
        )}
        <span>{r.hostname || r.device_model || <span className="text-gray-400 dark:text-gray-500 italic font-normal">Unnamed device</span>}</span>
      </div>
    )},
    { key: 'device_type', label: 'Type', sortable: true, sortValue: (r) => r.device_type, render: (r) => deviceTypes.find((t) => t.code === r.device_type)?.label ?? r.device_type },
    { key: 'device_owner', label: 'Owner', render: (r) => (r.device_owner ? deviceOwners.find((o) => o.code === r.device_owner)?.label ?? r.device_owner : <span className="text-gray-400 dark:text-gray-500 italic">—</span>) },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? <span className="text-gray-400 dark:text-gray-500 italic">—</span> },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="View Details"><Eye size={16} /></button>
          {canWrite() && <button onClick={() => openEdit(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="Edit"><Pencil size={16} /></button>}
          {canWrite() && <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>}
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
        ...(viewingCoreFields.includes('department_id')
          ? [{ label: viewingFieldLabel('department_id'), value: viewing.department?.name ?? null }]
          : []),
        ...(viewingCoreFields.includes('device_model')
          ? [{ label: viewingFieldLabel('device_model'), value: viewing.device_model }]
          : []),
        { label: 'Photo', value: viewing.image ? <ZoomImage src={viewing.image} size={220} /> : null, full: true },
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
          fields: viewingExtraFields.map((f) => {
            if (f.type === 'image') {
              const src = viewingExtraData[f.key];
              return { label: f.label, value: src ? <ZoomImage src={src} size={160} /> : null };
            }
            if (f.type === 'file') {
              const file = decodeFileValue(viewingExtraData[f.key]);
              return {
                label: f.label,
                value: file ? (
                  <a href={file.dataUrl} download={file.name} className="text-brand-600 hover:underline inline-flex items-center gap-1">
                    <Download size={13} /> {file.name}
                  </a>
                ) : null,
              };
            }
            return { label: f.label, value: formatFieldValueForDisplay(f, viewingExtraData[f.key], { departmentLabel, employeeLabel }) };
          }),
        }]
      : []),
    ...(viewingBaseFields.includes('ip_address') || viewingBaseFields.includes('mac_address')
      ? [{
          title: 'Network',
          fields: [
            ...(viewingBaseFields.includes('ip_address') ? [{
              label: viewingFieldLabel('ip_address'),
              value: viewing.ip_record
                ? `${viewing.ip_address} — registered in IP Management (status: ${viewing.ip_record.status}${viewing.ip_record.ip_owner ? ', owner: ' + viewing.ip_record.ip_owner : ''})`
                : viewing.ip_address,
              mono: true,
            }] : []),
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
        { label: 'Registered By', value: viewing.registered_by ? (employees.find((u) => u.id === viewing!.registered_by)?.full_name ?? 'Unknown user') : null },
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
            <h1 className="text-xl font-bold text-brand-600">Devices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{records.length} registered devices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload size={16} /> Import</Button>}
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Device</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchValue={deviceSearchValue}
          searchPlaceholder="Search by asset ID, hostname, type, owner, serial, MAC, IP, location..."
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
        onDelete={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); handleDelete(rec); } : undefined}
        deleteLabel="Delete Device"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Device' : 'Register New Device'} size="lg">
        <form noValidate onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Asset ID</span>
              <span className="font-mono text-sm font-semibold text-brand-700 dark:text-brand-300">{editing.asset_id}</span>
            </div>
          )}
          {/* Device type grid selector */}
          <Field
            label="Device Type"
            required
            hint={
              deviceTypes.length === 0
                ? hasRole('admin')
                  ? 'No device types yet — add one under Customization > Device Types.'
                  : 'No device types are available yet. Contact an administrator to add one.'
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
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-brand-600/40 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  {getDeviceIcon(t.code)}
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
            {onNavigate && hasRole('admin') && (
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
              <Field label={fieldLabel('device_owner')} required={requiredCoreFields.includes('device_owner')} hint={deviceOwners.length === 0 ? 'No device owners defined yet - add one under Customization > Device Owners.' : undefined}>
                <SearchableSelect
                  options={deviceOwners.map((o) => ({ value: o.code, label: o.label }))}
                  value={form.device_owner}
                  onChange={(val) => setForm({ ...form, device_owner: val })}
                  placeholder="Select owner..."
                  searchPlaceholder="Search owners…"
                  emptyMessage={deviceOwners.length === 0 ? 'No device owners defined yet.' : 'No matching owners.'}
                  required={requiredCoreFields.includes('device_owner')}
                />
                {onNavigate && hasRole('admin') && (
                  <button
                    type="button"
                    onClick={() => onNavigate('device_owners')}
                    className="mt-1 text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
                    title="Add, rename, or remove device owners"
                  >
                    {deviceOwners.length === 0 ? 'Add a device owner' : "Don't see the right owner? Manage device owners"}
                  </button>
                )}
              </Field>
            )}
            {coreFields.includes('department_id') && (
              <Field label={fieldLabel('department_id')} required={requiredCoreFields.includes('department_id')} hint={departments.length === 0 ? 'No departments defined yet - add one under Customization > Departments.' : undefined}>
                <SearchableSelect
                  options={departments.map((d) => ({ value: d.id, label: `${d.name}${d.is_branch ? ' (Branch)' : ''}` }))}
                  value={form.department_id}
                  onChange={(val) => setForm({ ...form, department_id: val })}
                  placeholder="Select department..."
                  searchPlaceholder="Search departments…"
                  emptyMessage={departments.length === 0 ? 'No departments defined yet.' : 'No matching departments.'}
                  required={requiredCoreFields.includes('department_id')}
                />
                {onNavigate && hasRole('admin') && (
                  <button
                    type="button"
                    onClick={() => onNavigate('departments')}
                    className="mt-1 text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
                    title="Add, rename, or remove departments"
                  >
                    {departments.length === 0 ? 'Add a department' : "Don't see the right department? Manage departments"}
                  </button>
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
                <SearchableSelect
                  options={modelsForType.map((m) => ({ value: m.id, label: `${m.name}${m.manufacturer ? ` (${m.manufacturer})` : ''}` }))}
                  value={form.model_id}
                  onChange={(val) => handleSelectModel(val)}
                  placeholder="Choose a model..."
                  searchPlaceholder="Search models…"
                  emptyMessage="No matching models."
                />
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
                hint={
                  skipIP
                    ? undefined
                    : ipAddresses.length === 0
                    ? 'No IP addresses registered yet - add one under IP Management.'
                    : `${deviceIpOptions.length} address${deviceIpOptions.length === 1 ? '' : 'es'} available to select`
                }
              >
                <SearchableSelect
                  options={deviceIpOptions}
                  value={form.ip_address}
                  onChange={(val) => setForm({ ...form, ip_address: val })}
                  placeholder={skipIP ? 'Skipped' : 'Select a registered IP address...'}
                  searchPlaceholder="Search by IP, hostname, or status..."
                  emptyMessage={ipAddresses.length === 0 ? 'No IP addresses registered yet.' : 'No matching IP addresses.'}
                  required={requiredBaseFields.includes('ip_address')}
                  disabled={skipIP}
                />
                {onNavigate && hasRole('admin') && (
                  <button
                    type="button"
                    onClick={() => onNavigate('ip')}
                    className="mt-1 text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
                    title="Register IP addresses in IP Management"
                  >
                    {ipAddresses.length === 0 ? 'Add an IP address' : "Don't see the right IP? Manage IP addresses"}
                  </button>
                )}
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
              <Field
                label={fieldLabel('location')}
                required={requiredBaseFields.includes('location')}
                hint={floors.length === 0 ? 'No floors defined yet - add one under Customization > Floors.' : undefined}
              >
                <SearchableSelect
                  options={floors.map((f) => ({ value: f.label, label: f.label }))}
                  value={form.location}
                  onChange={(val) => setForm({ ...form, location: val })}
                  placeholder="Select floor/location..."
                  searchPlaceholder="Search floors/locations…"
                  emptyMessage={floors.length === 0 ? 'No floors defined yet.' : 'No matching floors.'}
                  required={requiredBaseFields.includes('location')}
                />
              </Field>
            )}
            {baseFields.includes('rack_number') && (
              <Field label={fieldLabel('rack_number')} required={requiredBaseFields.includes('rack_number')}>
                <NumberInput value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} placeholder={fieldPlaceholder('rack_number')} required={requiredBaseFields.includes('rack_number')} />
              </Field>
            )}
          </div>
          {extraFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {selectedType?.label} Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    required={f.required}
                    className={f.type === 'multiselect' || f.type === 'radio' || f.type === 'long_text' ? 'sm:col-span-2' : undefined}
                  >
                    <DynamicField
                      field={f}
                      value={form.extra_data[f.key] ?? ''}
                      onChange={(value) => setExtraField(f.key, value)}
                      departments={departments}
                      employees={employees}
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} label="Device Photo" hint="Optional — helps identify this specific unit" variant="large" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Device' : 'Register Device'}</Button>
          </div>
        </form>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Devices from Excel / CSV"
        subtitle="Bring in devices that are already deployed but not yet registered"
        columns={importColumns}
        templateFilename="device_registration_import_template"
        validateRow={validateImportRow}
        importRow={importDeviceRow}
        onImported={loadData}
      />
    </div>
  );
}
