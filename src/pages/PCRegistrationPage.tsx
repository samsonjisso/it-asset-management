'use client';

import { useState, useEffect, useCallback, useRef, useMemo, ReactNode, Fragment } from 'react';
import {
  supabase, PCRegistration, Department, AssetModel, Floor, AccessSwitch, AccessSwitchIp,
  PatchLevel, License, LicenseType, PcFormFields, DirectoryUser,
} from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, TextArea, Button } from '../components/FormControls';
import { LicensePicker } from '../components/LicensePicker';
import { SearchableSelect } from '../components/SearchableSelect';
import { isValidIPv4, isValidMac, IPV4_PATTERN, MAC_PATTERN } from '../lib/validation';
import { ImageInput } from '../components/ImageInput';
import { ZoomImage } from '../components/ZoomImage';
import { DynamicField } from '../components/DynamicField';
import { validateFieldValue, formatFieldValueForDisplay } from '../lib/deviceFieldValues';
import { fetchProfileDirectory } from '../lib/api';
import { Plus, Pencil, Trash2, Eye, Monitor, Download, Upload } from 'lucide-react';
import { ImportModal, ImportColumn } from '../components/ImportModal';
import {
  PC_BASE_FIELD_META,
  parsePcBaseFields,
  parsePcRequiredBaseFields,
  parsePcFieldLabels,
  parsePcExtraFields,
} from '../lib/pcFormFields';

function parsePcExtraData(rec?: PCRegistration | null): Record<string, string> {
  if (!rec?.extra_data) return {};
  try {
    const parsed = JSON.parse(rec.extra_data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const emptyForm = {
  hostname: '',
  monitor_serial: '',
  asset_tag: '',
  service_tag: '',
  mac_address: '',
  license_id: '',
  // Manual fallback for Product Key / License when the entry isn't in
  // License Management yet - see LicensePicker's manual-entry mode.
  // Mutually exclusive with license_id; whichever was set last wins.
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
  extra_data: {} as Record<string, string>,
};

type FormState = typeof emptyForm;

// Register New PC: which of the fixed pc_registrations columns each
// standard field key reads/writes on the form state — used so the
// field-rendering switch below and the generic required-field check
// in handleSave can both be driven by the same string[] key list
// (pc_form_fields.base_fields) instead of hardcoded JSX order.
type TextFieldKey = 'monitor_serial' | 'asset_tag' | 'service_tag' | 'cpu' | 'memory_detail' | 'generation_detail' | 'owner_name' | 'switch_port_number';

export function PCRegistrationPage({ autoOpenCreate }: { autoOpenCreate?: number } = {}) {
  const { canWrite, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<PCRegistration[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pcModels, setPcModels] = useState<AssetModel[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [accessSwitches, setAccessSwitches] = useState<AccessSwitch[]>([]);
  const [accessSwitchIps, setAccessSwitchIps] = useState<AccessSwitchIp[]>([]);
  const [patchLevels, setPatchLevels] = useState<PatchLevel[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseTypeOptions, setLicenseTypeOptions] = useState<LicenseType[]>([]);
  const [pcFormConfig, setPcFormConfig] = useState<PcFormFields | null>(null);
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PCRegistration | null>(null);
  const [viewing, setViewing] = useState<PCRegistration | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pcRes, deptRes, modelsRes, floorsRes, switchesRes, switchIpsRes, patchLevelsRes, licensesRes, licenseTypesRes, pcFieldsRes, employeesRes] = await Promise.all([
      supabase.from('pc_registrations').select('*, department:departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('asset_models').select('*').order('name'),
      supabase.from('floors').select('*').order('position'),
      supabase.from('access_switches').select('*').order('label'),
      supabase.from('access_switch_ips').select('*').order('label'),
      supabase.from('patch_levels').select('*').order('label'),
      supabase.from('licenses').select('*').order('created_at', { ascending: false }),
      supabase.from('license_types').select('*').order('label'),
      supabase.from('pc_form_fields').select('*'),
      // Every viewer needs this to resolve who registered a record
      // ("Registered By" in the detail view), not just writers filling
      // in the Employee/User Selection custom field picker.
      fetchProfileDirectory(),
    ]);
    if (pcRes.data) setRecords(pcRes.data as PCRegistration[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (modelsRes.data) setPcModels((modelsRes.data as AssetModel[]).filter((m) => m.target === 'pc'));
    if (floorsRes.data) setFloors(floorsRes.data as Floor[]);
    if (switchesRes.data) setAccessSwitches(switchesRes.data as AccessSwitch[]);
    if (switchIpsRes.data) setAccessSwitchIps(switchIpsRes.data as AccessSwitchIp[]);
    if (patchLevelsRes.data) setPatchLevels(patchLevelsRes.data as PatchLevel[]);
    if (licensesRes.data) setLicenses(licensesRes.data as License[]);
    if (licenseTypesRes.data) setLicenseTypeOptions(licenseTypesRes.data as LicenseType[]);
    if (pcFieldsRes.data) setPcFormConfig((pcFieldsRes.data as PcFormFields[])[0] ?? null);
    if (employeesRes.data) setEmployees(employeesRes.data as DirectoryUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // The set/order/required-set of standard fields and any fully custom
  // fields, driven entirely by the admin-configurable pc_form_fields
  // row (Customization > PC Registration Fields) instead of being
  // hardcoded here.
  const baseFields = useMemo(() => parsePcBaseFields(pcFormConfig), [pcFormConfig]);
  const requiredBaseFields = useMemo(() => parsePcRequiredBaseFields(pcFormConfig), [pcFormConfig]);
  const fieldLabels = useMemo(() => parsePcFieldLabels(pcFormConfig), [pcFormConfig]);
  const extraFields = useMemo(() => parsePcExtraFields(pcFormConfig), [pcFormConfig]);
  const fieldLabel = useCallback((key: string) => fieldLabels[key] ?? PC_BASE_FIELD_META[key]?.label ?? key, [fieldLabels]);
  const fieldPlaceholder = useCallback((key: string) => PC_BASE_FIELD_META[key]?.placeholder, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFieldErrors({});
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      if (canWrite()) openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: PCRegistration) => setViewing(rec);

  const openEdit = (rec: PCRegistration) => {
    setEditing(rec);
    setFieldErrors({});
    setForm({
      hostname: rec.hostname,
      monitor_serial: rec.monitor_serial ?? '',
      asset_tag: rec.asset_tag ?? '',
      service_tag: rec.service_tag ?? '',
      mac_address: rec.mac_address ?? '',
      license_id: rec.license_id ?? '',
      // Only carry the manual product_key forward when there's no
      // linked license - if license_id is set, product_key is just the
      // server-side mirror of that license's key, not a manual entry.
      product_key: rec.license_id ? '' : rec.product_key ?? '',
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
      extra_data: parsePcExtraData(rec),
    });
    setModalOpen(true);
  };

  const setExtraField = (key: string, value: string) => {
    setForm((f) => ({ ...f, extra_data: { ...f.extra_data, [key]: value } }));
  };

  // Picking a model auto-fills its reference photo (if the user hasn't
  // already uploaded their own photo for this specific unit).
  const handleSelectModel = (modelId: string) => {
    const model = pcModels.find((m) => m.id === modelId);
    setForm((f) => ({ ...f, model_id: modelId, image: f.image ?? model?.image ?? null }));
  };

  const selectedDept = departments.find((d) => d.id === form.department_id);
  const isBranch = !!selectedDept?.is_branch;

  const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    const showFieldError = (key: string, message: string) => {
      setFieldErrors((previous) => ({ ...previous, [key]: message }));
      toast(message, 'error');
    };
    if (!form.hostname.trim()) {
      showFieldError('hostname', `${fieldLabel('hostname')} is required`);
      return;
    }
    const hasIdentifier = [form.mac_address, form.service_tag, form.asset_tag].some(
      (value) => value.trim() && value.trim().toLowerCase() !== 'n/a'
    );
    if (!hasIdentifier) {
      const message = 'At least one of MAC Address, Service Tag / Serial Number, or Asset Tag is required';
      setFieldErrors((previous) => ({ ...previous, mac_address: message, service_tag: message, asset_tag: message }));
      toast(message, 'error');
      return;
    }
    for (const key of requiredBaseFields) {
      // Asset Tag is always optional - it auto-fills to "N/A" below
      // when left blank, so it can never be enforced as required even
      // if an admin has it flagged that way in the field config.
      if (key === 'asset_tag') continue;
      // Floor/location only applies to Head Office - never required for
      // a branch, regardless of the admin's mandatory/optional setting.
      if (key === 'floor_number' && isBranch) continue;
      // license_id can be satisfied either by picking a license or by
      // a manually typed product_key (see LicensePicker manual-entry mode).
      if (key === 'license_id') {
        if (!form.license_id.trim() && !form.product_key.trim()) {
          showFieldError(key, `${fieldLabel(key)} is required`);
          return;
        }
        continue;
      }
      const value = String((form as Record<string, unknown>)[key] ?? '').trim();
      if (!value) {
        showFieldError(key, `${fieldLabel(key)} is required`);
        return;
      }
    }
    if (baseFields.includes('floor_number') && !isBranch && requiredBaseFields.includes('floor_number') && !form.floor_number.trim()) {
      showFieldError('floor_number', `${fieldLabel('floor_number')} is required for Head Office`);
      return;
    }
    if (baseFields.includes('ip_address') && form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      showFieldError('ip_address', `${fieldLabel('ip_address')} must be a valid IPv4 address (e.g., 10.6.13.45)`);
      return;
    }
    if (baseFields.includes('mac_address') && form.mac_address.trim() && !isValidMac(form.mac_address)) {
      showFieldError('mac_address', `${fieldLabel('mac_address')} must look like 00:1A:2B:3C:4D:5E`);
      return;
    }
    if (baseFields.includes('access_switch_ip') && form.access_switch_ip.trim() && !isValidIPv4(form.access_switch_ip)) {
      showFieldError('access_switch_ip', `${fieldLabel('access_switch_ip')} must be a valid IPv4 address (e.g., 10.6.1.103)`);
      return;
    }
    for (const f of extraFields) {
      const err = validateFieldValue(f, form.extra_data[f.key]);
      if (err) {
        showFieldError(f.key, err);
        return;
      }
    }
    setSaving(true);
    const payload = {
      ...form,
      asset_tag: form.asset_tag.trim() || 'N/A',
      floor_number: isBranch ? null : form.floor_number || null,
      department_id: form.department_id || null,
      model_id: form.model_id || null,
      license_id: form.license_id || null,
      extra_data: form.extra_data,
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
    const headers = ['Asset ID', 'Hostname', 'Monitor Serial', 'Asset Tag', 'Service Tag', 'MAC Address', 'Product Key / License', 'CPU', 'Memory Detail', 'Generation Detail', 'IP Address', 'Owner', 'Department', 'Floor', 'Switch Port', 'Access Switch', 'Patch Level', 'Created At'];
    const rows = records.map((r) => [
      r.asset_id ?? '', r.hostname, r.monitor_serial ?? '', r.asset_tag ?? '', r.service_tag ?? '', r.mac_address ?? '',
      r.license?.license_key ?? r.product_key ?? '',
      r.cpu ?? '', r.memory_detail ?? '', r.generation_detail ?? '', r.ip_address ?? '', r.owner_name ?? '',
      r.department?.name ?? '', r.department?.is_branch ? 'Branch' : (r.floor_number ?? ''), r.switch_port_number ?? '', r.access_switch_ip ?? '', r.patch_level_number ?? '',
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

  // Bulk import from Excel/CSV — see ImportModal. Column set mirrors the
  // registration form's currently-visible/required base fields, so an
  // admin who has hidden or made a field optional via PC Fields
  // Customization sees the same shape reflected in the template.
  // Fully-custom per-admin extra fields (pc_form_fields.fields) aren't
  // covered by the import — those still need to be filled in by editing
  // the record afterwards.
  const [importOpen, setImportOpen] = useState(false);
  const findByLabel = <T,>(list: T[], getLabel: (t: T) => string, needle: string) =>
    list.find((x) => getLabel(x).trim().toLowerCase() === needle.trim().toLowerCase());

  const importColumns: ImportColumn[] = (() => {
    const cols: ImportColumn[] = [];
    const add = (key: string, example?: string) => {
      if (!baseFields.includes(key)) return;
      cols.push({ key, label: fieldLabel(key), required: key !== 'asset_tag' && requiredBaseFields.includes(key), example });
    };
    add('hostname', 'PC-HQ-001');
    add('monitor_serial');
    add('asset_tag');
    add('service_tag');
    add('mac_address', '00:1A:2B:3C:4D:5E');
    if (baseFields.includes('license_id')) {
      cols.push({ key: 'license_key', label: 'Product Key / License Key', required: requiredBaseFields.includes('license_id') });
    }
    add('cpu');
    add('memory_detail');
    add('generation_detail');
    add('ip_address', '10.6.13.45');
    add('owner_name');
    if (baseFields.includes('department_id')) {
      cols.push({ key: 'department', label: fieldLabel('department_id'), required: requiredBaseFields.includes('department_id') });
    }
    if (baseFields.includes('floor_number')) {
      cols.push({ key: 'floor_number', label: fieldLabel('floor_number'), required: false });
    }
    add('switch_port_number');
    add('access_switch_name');
    add('access_switch_ip');
    add('patch_level_number');
    if (baseFields.includes('model_id')) {
      cols.push({ key: 'model', label: 'Model', required: false });
    }
    cols.push({ key: 'notes', label: 'Notes', required: false });
    return cols;
  })();

  const validateImportRow = (raw: Record<string, string>) => {
    const preview: Record<string, string> = { ...raw };
    const errors: string[] = [];
    const dept = raw.department ? findByLabel(departments, (d) => d.name, raw.department) : undefined;
    if (baseFields.includes('department_id')) {
      if (requiredBaseFields.includes('department_id') && !raw.department) errors.push(`${fieldLabel('department_id')} is required`);
      else if (raw.department && !dept) errors.push(`Department "${raw.department}" not found`);
    }
    const rowIsBranch = !!dept?.is_branch;
    if (baseFields.includes('floor_number') && !rowIsBranch && requiredBaseFields.includes('floor_number') && !raw.floor_number) {
      errors.push(`${fieldLabel('floor_number')} is required for Head Office`);
    }
    let floorValue: string | null = null;
    if (baseFields.includes('floor_number') && !rowIsBranch && raw.floor_number) {
      const floor = findByLabel(floors, (f) => f.label, raw.floor_number);
      if (!floor) errors.push(`Floor "${raw.floor_number}" not found`);
      else floorValue = floor.label;
    }
    for (const key of ['hostname', 'service_tag', 'cpu', 'memory_detail', 'generation_detail', 'owner_name', 'switch_port_number']) {
      if (baseFields.includes(key) && requiredBaseFields.includes(key) && !raw[key]) errors.push(`${fieldLabel(key)} is required`);
    }
    if (raw.ip_address && !isValidIPv4(raw.ip_address)) errors.push(`${fieldLabel('ip_address')} must be a valid IPv4 address`);
    if (raw.mac_address && !isValidMac(raw.mac_address)) errors.push(`${fieldLabel('mac_address')} must look like 00:1A:2B:3C:4D:5E`);
    let accessSwitchName: string | null = null;
    if (baseFields.includes('access_switch_name') && raw.access_switch_name) {
      const sw = findByLabel(accessSwitches, (s) => s.label, raw.access_switch_name);
      if (!sw) errors.push(`Access Switch "${raw.access_switch_name}" not found`);
      else accessSwitchName = sw.label;
    } else if (baseFields.includes('access_switch_name') && requiredBaseFields.includes('access_switch_name')) {
      errors.push(`${fieldLabel('access_switch_name')} is required`);
    }
    let accessSwitchIp: string | null = null;
    if (baseFields.includes('access_switch_ip') && raw.access_switch_ip) {
      const ip = findByLabel(accessSwitchIps, (s) => s.label, raw.access_switch_ip);
      if (!ip) errors.push(`Access Switch IP "${raw.access_switch_ip}" not found`);
      else accessSwitchIp = ip.label;
    } else if (baseFields.includes('access_switch_ip') && requiredBaseFields.includes('access_switch_ip')) {
      errors.push(`${fieldLabel('access_switch_ip')} is required`);
    }
    let patchLevel: string | null = null;
    if (baseFields.includes('patch_level_number') && raw.patch_level_number) {
      const pl = findByLabel(patchLevels, (p) => p.label, raw.patch_level_number);
      if (!pl) errors.push(`Patch / Level Number "${raw.patch_level_number}" not found`);
      else patchLevel = pl.label;
    } else if (baseFields.includes('patch_level_number') && requiredBaseFields.includes('patch_level_number')) {
      errors.push(`${fieldLabel('patch_level_number')} is required`);
    }
    let licenseId: string | null = null;
    let productKey = '';
    if (baseFields.includes('license_id')) {
      const key = raw.license_key;
      if (!key) {
        if (requiredBaseFields.includes('license_id')) errors.push(`${fieldLabel('license_id')} is required`);
      } else {
        const match = licenses.find((l) => (l.license_key ?? '').trim().toLowerCase() === key.trim().toLowerCase());
        if (match) licenseId = match.id;
        else productKey = key;
      }
    }
    let modelId: string | null = null;
    if (baseFields.includes('model_id') && raw.model) {
      const model = findByLabel(pcModels, (m) => m.name, raw.model);
      if (!model) errors.push(`Model "${raw.model}" not found`);
      else modelId = model.id;
    }

    if (errors.length) return { preview, error: errors.join('; ') };

    const values = {
      hostname: raw.hostname || null,
      monitor_serial: raw.monitor_serial || null,
      asset_tag: raw.asset_tag || 'N/A',
      service_tag: raw.service_tag || null,
      mac_address: raw.mac_address || null,
      license_id: licenseId,
      product_key: productKey,
      cpu: raw.cpu || null,
      memory_detail: raw.memory_detail || null,
      generation_detail: raw.generation_detail || null,
      ip_address: raw.ip_address || null,
      owner_name: raw.owner_name || null,
      department_id: dept?.id ?? null,
      floor_number: floorValue,
      switch_port_number: raw.switch_port_number || null,
      access_switch_name: accessSwitchName,
      access_switch_ip: accessSwitchIp,
      patch_level_number: patchLevel,
      model_id: modelId,
      image: null,
      notes: raw.notes || null,
      extra_data: JSON.stringify({}),
      registered_by: profile?.id,
    };
    return { preview, values };
  };

  const importPcRow = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from('pc_registrations').insert(values);
    return error?.message ?? null;
  };

  // Comprehensive search text: everything worth matching on for a PC
  // record, not just the few columns shown in the table - the linked
  // license (type/subtype/key), resolved model name, network/location
  // details, and any custom field values an admin has added.
  const pcSearchValue = (r: PCRegistration) => {
    const model = pcModels.find((m) => m.id === r.model_id);
    const licenseType = r.license ? licenseTypeOptions.find((t) => t.code === r.license!.license_type)?.label : null;
    const extra = parsePcExtraData(r);
    return [
      r.asset_id, r.hostname, r.monitor_serial, r.asset_tag, r.service_tag,
      r.mac_address, r.product_key, r.cpu, r.memory_detail, r.generation_detail,
      r.ip_address, r.owner_name, r.department?.name, r.floor_number,
      r.switch_port_number, r.access_switch_name, r.access_switch_ip, r.patch_level_number,
      model?.name, r.notes,
      r.license?.license_key, r.license?.license_subtype, licenseType,
      ...Object.values(extra),
    ].filter(Boolean).join(' ');
  };

  const columns: Column<PCRegistration>[] = [
    { key: 'asset_id', label: 'Key', sortable: true, sortValue: (r) => r.asset_id ?? '', render: (r) => r.asset_id ? <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{r.asset_id}</span> : <span className="text-gray-400 dark:text-gray-500 italic">-</span> },
    { key: 'hostname', label: 'Name', sortable: true, sortValue: (r) => r.hostname, render: (r) => (
      <div className="flex items-center gap-2">
        {r.image && <img src={r.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />}
        <span className="font-medium text-gray-900 dark:text-gray-100">{r.hostname}</span>
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
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="View Details">
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button onClick={() => openEdit(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && (
            <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'PC Information',
      fields: [
        { label: 'Asset ID', value: viewing.asset_id, mono: true },
        { label: 'Hostname', value: viewing.hostname },
        { label: 'Display Monitor / Serial Number', value: viewing.monitor_serial },
        { label: 'Asset Tag', value: viewing.asset_tag },
        { label: 'Service Tag / Serial Number', value: viewing.service_tag },
        {
          label: 'Product Key / License',
          value: viewing.license
            ? `${licenseTypeOptions.find((t) => t.code === viewing.license!.license_type)?.label ?? viewing.license!.license_type}${viewing.license!.license_subtype ? ' — ' + viewing.license!.license_subtype : ''}${viewing.license!.license_key ? ' (' + viewing.license!.license_key + ')' : ''}`
            : viewing.product_key,
          mono: true,
        },
        { label: 'CPU', value: viewing.cpu },
        { label: 'Memory Detail', value: viewing.memory_detail },
        { label: 'Generation Detail', value: viewing.generation_detail },
        { label: 'Model', value: pcModels.find((m) => m.id === viewing.model_id)?.name },
        { label: 'Photo', value: viewing.image ? <ZoomImage src={viewing.image} size={220} /> : null, full: true },
      ],
    },
    {
      title: 'Network',
      fields: [
        {
          label: 'IP Address',
          value: viewing.ip_record
            ? `${viewing.ip_address} — registered in IP Management (status: ${viewing.ip_record.status}${viewing.ip_record.ip_owner ? ', owner: ' + viewing.ip_record.ip_owner : ''})`
            : viewing.ip_address,
          mono: true,
        },
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
        { label: 'Floor Number / Location', value: viewing.department?.is_branch ? 'Branch' : viewing.floor_number },
      ],
    },
    ...(extraFields.length > 0 ? [{
      title: 'Custom Fields',
      fields: extraFields.map((f) => ({
        label: f.label,
        value: formatFieldValueForDisplay(f, parsePcExtraData(viewing)[f.key], {
          departmentLabel: (id: string) => departments.find((d) => d.id === id)?.name ?? id,
          employeeLabel: (id: string) => employees.find((u) => u.id === id)?.full_name ?? id,
        }),
      })),
    }] : []),
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

  // Renders one standard field by key, driven by the admin-configured
  // label/required flag — this is the single place that knows how to
  // turn a standard field key into its (bespoke) input control, so the
  // JSX below can just do `baseFields.map(renderBaseField)` to get the
  // admin's configured order.
  const renderBaseField = (key: string): ReactNode => {
    const required = key === 'hostname' || requiredBaseFields.includes(key);
    const textField = (formKey: TextFieldKey, extra: Record<string, unknown> = {}) => (
      <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]}>
        <TextInput
          value={form[formKey]}
          onChange={(e) => setForm({ ...form, [formKey]: e.target.value })}
          placeholder={fieldPlaceholder(key)}
          required={required}
          {...extra}
        />
      </Field>
    );

    switch (key) {
      case 'hostname':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]}>
            <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder={fieldPlaceholder(key)} required={required} />
          </Field>
        );
      case 'monitor_serial':
        return textField('monitor_serial');
      case 'asset_tag':
        // Always optional (see handleSave: blank auto-fills to "N/A"
        // on save), regardless of the admin's field-required config -
        // no skip toggle needed since there's no "unfilled" state to
        // opt out of.
        return (
          <Field key={key} label={fieldLabel(key)} error={fieldErrors[key]}>
            <TextInput
              value={form.asset_tag}
              onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
              placeholder={fieldPlaceholder(key)}
            />
          </Field>
        );
      case 'service_tag':
        return textField('service_tag');
      case 'mac_address':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]}>
            <TextInput value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder={fieldPlaceholder(key)} pattern={MAC_PATTERN} title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E" required={required} />
          </Field>
        );
      case 'license_id':
        return (
          <Field
            key={key}
            label={fieldLabel(key)}
            required={required}
            error={fieldErrors[key]}
            hint={licenses.length === 0 ? 'No licenses registered yet - add one under License Registration, or enter it manually.' : 'Search and select from License Management, or enter it manually if it isn\'t listed'}
          >
            <LicensePicker
              licenses={licenses}
              licenseTypeOptions={licenseTypeOptions}
              value={form.license_id}
              manualValue={form.product_key}
              onChange={({ licenseId, productKey }) => setForm({ ...form, license_id: licenseId, product_key: productKey })}
              excludePcId={editing?.id}
            />
          </Field>
        );
      case 'cpu':
        return textField('cpu');
      case 'memory_detail':
        return textField('memory_detail');
      case 'generation_detail':
        return textField('generation_detail');
      case 'ip_address':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]}>
            <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder={fieldPlaceholder(key)} pattern={IPV4_PATTERN} title="Enter a valid IPv4 address, e.g. 10.6.13.45" required={required} />
          </Field>
        );
      case 'owner_name':
        return textField('owner_name');
      case 'department_id':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]}>
            <SearchableSelect
              options={departments.map((d) => ({ value: d.id, label: `${d.name}${d.is_branch ? ' (Branch)' : ''}` }))}
              value={form.department_id}
              onChange={(val) => {
                const dept = departments.find((d) => d.id === val);
                setForm((f) => ({
                  ...f,
                  department_id: val,
                  // Floor/location only applies to Head Office - clear it
                  // automatically when a branch is selected.
                  floor_number: dept?.is_branch ? '' : f.floor_number,
                }));
              }}
              placeholder="Select department/branch"
              searchPlaceholder="Search departments/branches…"
              emptyMessage="No matching departments."
              required={required}
            />
          </Field>
        );
      case 'floor_number':
        if (isBranch) {
          return (
            <Field key={key} label={fieldLabel(key)} error={fieldErrors[key]}>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked readOnly disabled className="h-4 w-4 rounded border-slate-300" />
                Branch <span className="text-slate-400">(no floor/location for branch PCs)</span>
              </label>
            </Field>
          );
        }
        return (
          <Field
            key={key}
            label={fieldLabel(key)}
            required={required}
            error={fieldErrors[key]}
            hint={floors.length === 0 ? 'No floors defined yet - add one under Customization > Floors.' : undefined}
          >
            <SearchableSelect
              options={floors.map((f) => ({ value: f.label, label: f.label }))}
              value={form.floor_number}
              onChange={(val) => setForm({ ...form, floor_number: val })}
              placeholder="Select floor/location"
              searchPlaceholder="Search floors/locations…"
              emptyMessage={floors.length === 0 ? 'No floors defined yet.' : 'No matching floors.'}
              required={required}
            />
          </Field>
        );
      case 'switch_port_number':
        return textField('switch_port_number');
      case 'access_switch_name':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]} hint={accessSwitches.length === 0 ? 'No access switches defined yet - add one under Customization > Access Switches.' : undefined}>
            <SearchableSelect
              options={accessSwitches.map((s) => ({ value: s.label, label: s.label }))}
              value={form.access_switch_name}
              onChange={(val) => setForm({ ...form, access_switch_name: val })}
              placeholder="Select access switch (optional)"
              searchPlaceholder="Search access switches…"
              emptyMessage={accessSwitches.length === 0 ? 'No access switches defined yet.' : 'No matching access switches.'}
              required={required}
            />
          </Field>
        );
      case 'access_switch_ip':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]} hint={accessSwitchIps.length === 0 ? 'No access switch IPs defined yet - add one under Customization > Access Switch IPs.' : undefined}>
            <SearchableSelect
              options={accessSwitchIps.map((ip) => ({ value: ip.label, label: ip.label }))}
              value={form.access_switch_ip}
              onChange={(val) => setForm({ ...form, access_switch_ip: val })}
              placeholder="Select access switch IP"
              searchPlaceholder="Search access switch IPs…"
              emptyMessage={accessSwitchIps.length === 0 ? 'No access switch IPs defined yet.' : 'No matching IPs.'}
              required={required}
            />
          </Field>
        );
      case 'patch_level_number':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]} hint={patchLevels.length === 0 ? 'No patch/level values defined yet - add one under Customization > Patch / Level Numbers.' : undefined}>
            <SearchableSelect
              options={patchLevels.map((p) => ({ value: p.label, label: p.label }))}
              value={form.patch_level_number}
              onChange={(val) => setForm({ ...form, patch_level_number: val })}
              placeholder="Select patch/level number"
              searchPlaceholder="Search patch/level numbers…"
              emptyMessage={patchLevels.length === 0 ? 'No patch/level values defined yet.' : 'No matching values.'}
              required={required}
            />
          </Field>
        );
      case 'model_id':
        return (
          <Field key={key} label={fieldLabel(key)} required={required} error={fieldErrors[key]} hint={pcModels.length === 0 ? "No models defined yet — add one under Customization > Asset Models." : "Selecting a model fills in its default photo"}>
            <SearchableSelect
              options={pcModels.map((m) => ({ value: m.id, label: `${m.name}${m.manufacturer ? ` (${m.manufacturer})` : ''}` }))}
              value={form.model_id}
              onChange={(val) => handleSelectModel(val)}
              placeholder="Select model (optional)"
              searchPlaceholder="Search models…"
              emptyMessage={pcModels.length === 0 ? 'No models defined yet.' : 'No matching models.'}
              required={required}
            />
          </Field>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Monitor size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">PCs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{records.length} registered PCs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> Import
            </Button>
          )}
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
          searchValue={pcSearchValue}
          searchPlaceholder="Search by asset ID, hostname, tag, serial, MAC, IP, owner, department, license..."
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
        onDelete={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); handleDelete(rec); } : undefined}
        deleteLabel="Delete PC"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit PC Registration' : 'Register New PC'}
        size="lg"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Asset ID</span>
              <span className="font-mono text-sm font-semibold text-brand-700 dark:text-brand-300">{editing.asset_id}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {baseFields.map((key) => <Fragment key={key}>{renderBaseField(key)}</Fragment>)}
          </div>
          {extraFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Additional Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    required={f.required}
                    error={fieldErrors[f.key]}
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
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} label="PC Photo" hint="Optional — helps identify this specific unit" variant="large" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update PC' : 'Register PC'}
            </Button>
          </div>
        </form>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import PCs from Excel / CSV"
        subtitle="Bring in PCs that are already deployed but not yet registered"
        columns={importColumns}
        templateFilename="pc_registration_import_template"
        validateRow={validateImportRow}
        importRow={importPcRow}
        onImported={loadData}
      />
    </div>
  );
}
