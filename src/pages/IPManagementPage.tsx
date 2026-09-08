'use client';

import { useState, useEffect, useCallback, useRef, useMemo, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, IPAddress, IPSubnet, Department, PatchLevel, DirectoryUser, IpFormFields, DeviceTypeField } from '../lib/supabase';
import { pingIp, PingResult, fetchProfileDirectory } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DetailsModal, DetailSection } from '../components/DetailsModal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { SearchableSelect } from '../components/SearchableSelect';
import { SearchableCombobox } from '../components/SearchableCombobox';
import { isEnumerableSubnet, enumerateSubnetIps, matchSubnet } from '../lib/subnet';
import {
  isValidIPv4,
  isValidMac,
  isValidHostname,
  isValidEmployeeName,
  isValidPortLabel,
  MAC_PATTERN,
  HOSTNAME_PATTERN,
  PORT_LABEL_PATTERN,
} from '../lib/validation';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Network,
  Download,
  Upload,
  Radar,
  Wifi,
  WifiOff,
  Loader2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  ListFilter,
  HelpCircle,
  UserCheck,
  Clock,
  Archive,
} from 'lucide-react';
import { ImportModal, ImportColumn } from '../components/ImportModal';
import { DynamicField } from '../components/DynamicField';
import { validateFieldValue } from '../lib/deviceFieldValues';
import { parseIpBaseFields, parseIpExtraFields, parseIpFieldLabels, parseIpRequiredBaseFields, IP_BASE_FIELD_META } from '../lib/ipFormFields';

// 'unassigned' is the default a new record starts at, but it is a
// placeholder rather than a valid end state - Register New IP Address
// requires the user to explicitly pick one of the other four before
// they can continue (enforced in handleSave and on the server).
const statusCardStyles: Record<IPAddress['status'], { icon: JSX.Element; color: string; bg: string }> = {
  unassigned: { icon: <HelpCircle size={22} />, color: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-900' },
  assigned: { icon: <UserCheck size={22} />, color: 'from-brand-500 to-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/40' },
  reserved: { icon: <Clock size={22} />, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
  available: { icon: <Wifi size={22} />, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
  decommissioned: { icon: <Archive size={22} />, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' },
};

const statusOptions: { value: IPAddress['status']; label: string }[] = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'available', label: 'Available' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const statusStyles: Record<IPAddress['status'], string> = {
  unassigned: 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 ring-1 ring-gray-200',
  assigned: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  reserved: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  available: 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 ring-1 ring-brand-100',
  decommissioned: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200',
};

const emptyForm = {
  subnet_id: '',
  ip_address: '',
  hostname: '',
  department_id: '',
  ip_owner: '',
  mac_address: '',
  access_switch_port: '',
  patch_panel_label: '',
  status: 'unassigned' as IPAddress['status'],
  notes: '',
  extra_data: {} as Record<string, string>,
};

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

export function IPManagementPage({ autoOpenCreate }: { autoOpenCreate?: number } = {}) {
  const router = useRouter();
  const { canWrite, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<IPAddress[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [patchPanelLabels, setPatchPanelLabels] = useState<PatchLevel[]>([]);
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPAddress | null>(null);
  const [viewing, setViewing] = useState<IPAddress | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [ipFormConfig, setIpFormConfig] = useState<IpFormFields | null>(null);

  // IP Availability Board - shows every address in a selected subnet
  // and whether it's assigned/used or free, with a live-ping fallback
  // for one-off checks outside any defined subnet.
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [boardSubnetId, setBoardSubnetId] = useState('');
  const [boardFilter, setBoardFilter] = useState<'all' | 'used' | 'available'>('all');
  const [checkIp, setCheckIp] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<PingResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ipRes, deptRes, subnetRes, patchPanelRes, employeesRes, fieldsRes] = await Promise.all([
      supabase.from('ip_addresses').select('*, department:departments(*)').order('ip_address', { ascending: true }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('ip_subnets').select('*').order('prefix'),
      supabase.from('patch_levels').select('*').order('label'),
      // Resolves registered_by to a name for "Registered By" in the
      // detail view — see GET /profiles/directory.
      fetchProfileDirectory(),
      supabase.from('ip_form_fields').select('*'),
    ]);
    if (ipRes.data) setRecords(ipRes.data as IPAddress[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
    if (subnetRes.data) setSubnets(subnetRes.data as IPSubnet[]);
    if (patchPanelRes.data) setPatchPanelLabels(patchPanelRes.data as PatchLevel[]);
    if (employeesRes.data) setEmployees(employeesRes.data as DirectoryUser[]);
    if (fieldsRes.data) setIpFormConfig((fieldsRes.data as IpFormFields[])[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const baseFields = useMemo(() => parseIpBaseFields(ipFormConfig), [ipFormConfig]);
  const requiredBaseFields = useMemo(() => parseIpRequiredBaseFields(ipFormConfig), [ipFormConfig]);
  const fieldLabels = useMemo(() => parseIpFieldLabels(ipFormConfig), [ipFormConfig]);
  const extraFields = useMemo(() => parseIpExtraFields(ipFormConfig), [ipFormConfig]);
  const fieldLabel = (key: string) => fieldLabels[key] ?? IP_BASE_FIELD_META[key]?.label ?? key;

  // Only subnets shaped as a full three-octet prefix (e.g. "10.6.13.",
  // equivalent to a /24) can have their valid addresses enumerated —
  // see isEnumerableSubnet. Register New IP Address only ever offers
  // these, since a broader prefix can't be turned into a concrete,
  // selectable address list.
  const usableSubnets = subnets.filter((s) => isEnumerableSubnet(s.prefix));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, subnet_id: usableSubnets[0]?.id ?? '' });
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      if (canWrite()) openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: IPAddress) => setViewing(rec);

  const openEdit = (rec: IPAddress) => {
    setEditing(rec);
    let extraData: Record<string, string> = {};
    if (rec.extra_data) {
      try {
        const parsed = typeof rec.extra_data === 'string' ? JSON.parse(rec.extra_data) : rec.extra_data;
        if (parsed && typeof parsed === 'object') extraData = parsed as Record<string, string>;
      } catch {
        extraData = {};
      }
    }
    setForm({
      subnet_id: rec.subnet_id ?? matchSubnet(rec.ip_address, subnets)?.id ?? '',
      ip_address: rec.ip_address,
      hostname: rec.hostname ?? '',
      department_id: rec.department_id ?? '',
      ip_owner: rec.ip_owner ?? '',
      mac_address: rec.mac_address ?? '',
      access_switch_port: rec.access_switch_port ?? '',
      patch_panel_label: rec.patch_panel_label ?? '',
      status: rec.status,
      notes: rec.notes ?? '',
      extra_data: extraData,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const requiredFields: [keyof typeof form, string][] = [
      ['subnet_id', 'IP Subnet'],
      ['ip_address', 'IP Address'],
      ...requiredBaseFields.map((key) => [key as keyof typeof form, fieldLabel(key)] as [keyof typeof form, string]),
    ];
    for (const [key, label] of requiredFields) {
      if (!String(form[key] ?? '').trim()) {
        toast(`${label} is required`, 'error');
        return;
      }
    }
    for (const field of extraFields) {
      const error = validateFieldValue(field, form.extra_data[field.key]);
      if (error) {
        toast(error, 'error');
        return;
      }
    }
    // Status defaults to Unassigned, but that's a placeholder - the
    // user must explicitly choose one of the real statuses to continue.
    if (form.status === 'unassigned') {
      toast('Select a status (other than Unassigned) to complete registration', 'error');
      return;
    }
    // The IP Address field is a dropdown of addresses generated from
    // the selected subnet, so these three checks should never actually
    // fail through normal use of the form — they're a safety net
    // against a stale selection (e.g. the subnet's prefix changed, or
    // someone else registered the address, while this modal was open).
    const chosenSubnet = subnets.find((s) => s.id === form.subnet_id);
    if (!chosenSubnet) {
      toast('Selected IP Subnet was not found. Configure one under Customization > IP Subnets.', 'error');
      return;
    }
    if (!isValidIPv4(form.ip_address)) {
      toast('IP Address must be a valid IPv4 address (e.g., 10.6.13.45)', 'error');
      return;
    }
    if (!form.ip_address.startsWith(chosenSubnet.prefix.trim())) {
      toast(`IP Address does not belong to the selected subnet (${chosenSubnet.prefix}).`, 'error');
      return;
    }
    const conflict = recordByIp.get(form.ip_address);
    if (conflict && conflict.id !== editing?.id) {
      toast('This IP Address is already registered/assigned. Choose a different available address.', 'error');
      return;
    }
    if (form.mac_address && !isValidMac(form.mac_address)) {
      toast('MAC Address must look like 00:1A:2B:3C:4D:5E', 'error');
      return;
    }
    if (form.hostname && !isValidHostname(form.hostname)) {
      toast('Hostname may only contain letters, numbers, hyphens and dots (e.g., PC-HQ-001)', 'error');
      return;
    }
    const hostnameConflict = form.hostname ? findHostnameConflict(form.hostname) : null;
    if (hostnameConflict) {
      if (!editing) {
        toast(`Hostname "${form.hostname.trim()}" is already registered. Continue in PC Registration to register this device.`, 'error');
        router.push(`/pc?create=${Date.now()}&hostname=${encodeURIComponent(form.hostname.trim())}&ip_address=${encodeURIComponent(form.ip_address.trim())}`);
        return;
      }
      toast(
        `Hostname "${form.hostname.trim()}" is already registered to ${hostnameConflict.ip_address} (${hostnameConflict.status}). Choose a different hostname, or free it up by marking that record Available/Decommissioned first.`,
        'error'
      );
      return;
    }
    if (form.ip_owner && !isValidEmployeeName(form.ip_owner)) {
      toast('Enter a valid employee name for the IP Address Owner', 'error');
      return;
    }
    if (form.access_switch_port && !isValidPortLabel(form.access_switch_port)) {
      toast('Access Switch Port / Interface Number contains invalid characters', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      hostname: form.hostname.trim(),
      department_id: form.department_id,
      ip_owner: form.ip_owner.trim(),
      mac_address: form.mac_address.trim(),
      access_switch_port: form.access_switch_port.trim(),
      patch_panel_label: form.patch_panel_label.trim(),
      notes: form.notes || null,
      extra_data: form.extra_data,
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
    const headers = ['IP Address', 'Subnet', 'Hostname', 'Department', 'Owner (Employee)', 'MAC Address', 'Access Switch Port', 'Patch Panel Label', 'Status', 'Registered'];
    const rows = records.map((r) => {
      const s = subnets.find((sn) => sn.id === r.subnet_id) ?? matchSubnet(r.ip_address, subnets);
      return [
        r.ip_address, s ? `${s.prefix}0/24` : '', r.hostname ?? '', r.department?.name ?? '', r.ip_owner ?? '', r.mac_address ?? '', r.access_switch_port ?? '', r.patch_panel_label ?? '', r.status,
        new Date(r.created_at).toLocaleDateString(),
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip_addresses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk import from Excel/CSV — see ImportModal. Mirrors the same
  // rules as Register New IP Address (subnet membership, MAC/hostname/
  // port format, hostname uniqueness against active records, and the
  // "must pick a real status" rule) so an imported batch can't slip
  // past checks the manual form enforces.
  const [importOpen, setImportOpen] = useState(false);
  const findByLabel = <T,>(list: T[], getLabel: (t: T) => string, needle: string) =>
    list.find((x) => getLabel(x).trim().toLowerCase() === needle.trim().toLowerCase());

  const importColumns: ImportColumn[] = [
    { key: 'ip_address', label: 'IP Address', required: true, example: '10.6.13.45' },
    { key: 'subnet', label: 'Subnet (Prefix)', example: subnets[0]?.prefix },
    { key: 'hostname', label: 'Hostname', required: true, example: 'PC-HQ-001' },
    { key: 'department', label: 'Department / Branch', required: true },
    { key: 'ip_owner', label: 'IP Address Owner (Employee)', required: true },
    { key: 'mac_address', label: 'MAC Address', required: true, example: '00:1A:2B:3C:4D:5E' },
    { key: 'access_switch_port', label: 'Access Switch Port / Interface Number', required: true, example: 'Gi0/1' },
    { key: 'patch_panel_label', label: 'Patch Panel Label / Number', required: true, example: patchPanelLabels[0]?.label },
    { key: 'status', label: 'Status (Assigned/Reserved/Available/Decommissioned)', required: true, example: 'Assigned' },
    { key: 'notes', label: 'Notes' },
  ];

  const importedIpsInBatch = new Set<string>();
  const importedHostnamesInBatch = new Set<string>();

  const validateImportRow = (raw: Record<string, string>) => {
    const preview = { ...raw };
    const errors: string[] = [];

    const ip = raw.ip_address.trim();
    if (!ip) errors.push('IP Address is required');
    else if (!isValidIPv4(ip)) errors.push('IP Address must be a valid IPv4 address');

    let subnet = raw.subnet ? subnets.find((s) => s.prefix.trim() === raw.subnet.trim()) : undefined;
    if (!subnet && ip && isValidIPv4(ip)) subnet = matchSubnet(ip, subnets) ?? undefined;
    if (!subnet) errors.push(raw.subnet ? `Subnet "${raw.subnet}" not found` : `No configured subnet matches ${ip || 'this IP'} — add one under Customization > IP Subnets`);
    else if (ip && isValidIPv4(ip) && !ip.startsWith(subnet.prefix.trim())) errors.push(`IP Address does not belong to subnet ${subnet.prefix}`);

    if (ip && isValidIPv4(ip)) {
      const existing = recordByIp.get(ip);
      if (existing) errors.push(`IP Address ${ip} is already registered`);
      else if (importedIpsInBatch.has(ip)) errors.push(`IP Address ${ip} is duplicated elsewhere in this file`);
    }

    let deptId: string | null = null;
    if (!raw.department) errors.push('Department / Branch is required');
    else {
      const dept = findByLabel(departments, (d) => d.name, raw.department);
      if (!dept) errors.push(`Department "${raw.department}" not found`);
      else deptId = dept.id;
    }

    if (!raw.ip_owner) errors.push('IP Address Owner (Employee) is required');
    else if (!isValidEmployeeName(raw.ip_owner)) errors.push('IP Address Owner contains invalid characters');

    if (!raw.mac_address) errors.push('MAC Address is required');
    else if (!isValidMac(raw.mac_address)) errors.push('MAC Address must look like 00:1A:2B:3C:4D:5E');

    if (!raw.hostname) errors.push('Hostname is required');
    else if (!isValidHostname(raw.hostname)) errors.push('Hostname may only contain letters, numbers, hyphens and dots');
    else {
      const hLower = raw.hostname.trim().toLowerCase();
      if (findHostnameConflict(raw.hostname)) errors.push(`Hostname "${raw.hostname.trim()}" is already registered to another active record`);
      else if (importedHostnamesInBatch.has(hLower)) errors.push(`Hostname "${raw.hostname.trim()}" is duplicated elsewhere in this file`);
    }

    if (!raw.access_switch_port) errors.push('Access Switch Port / Interface Number is required');
    else if (!isValidPortLabel(raw.access_switch_port)) errors.push('Access Switch Port / Interface Number contains invalid characters');

    let patchLabel: string | null = null;
    if (!raw.patch_panel_label) errors.push('Patch Panel Label / Number is required');
    else {
      const pl = findByLabel(patchPanelLabels, (p) => p.label, raw.patch_panel_label);
      if (!pl) errors.push(`Patch Panel Label "${raw.patch_panel_label}" not found`);
      else patchLabel = pl.label;
    }

    let statusValue: IPAddress['status'] | null = null;
    if (!raw.status) errors.push('Status is required');
    else {
      const match = statusOptions.find((s) => s.label.toLowerCase() === raw.status.trim().toLowerCase() || s.value === raw.status.trim().toLowerCase());
      if (!match || match.value === 'unassigned') errors.push(`Status must be one of Assigned, Reserved, Available, or Decommissioned`);
      else statusValue = match.value;
    }

    if (errors.length) return { preview, error: errors.join('; ') };

    if (ip) importedIpsInBatch.add(ip);
    if (raw.hostname) importedHostnamesInBatch.add(raw.hostname.trim().toLowerCase());

    const values = {
      subnet_id: subnet!.id,
      ip_address: ip,
      hostname: raw.hostname.trim(),
      department_id: deptId,
      ip_owner: raw.ip_owner.trim(),
      mac_address: raw.mac_address.trim(),
      access_switch_port: raw.access_switch_port.trim(),
      patch_panel_label: patchLabel,
      status: statusValue,
      notes: raw.notes || null,
      registered_by: profile?.id,
    };
    return { preview, values };
  };

  const importIpRow = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from('ip_addresses').insert(values);
    return error?.message ?? null;
  };

  // Standalone "Check IP Availability" modal - opens the IP Availability
  // Board, defaulting to whichever subnet is defined first (if any).
  const openCheckModal = () => {
    setCheckIp('');
    setCheckResult(null);
    setBoardFilter('all');
    setBoardSubnetId((current) => current || subnets[0]?.id || '');
    setCheckModalOpen(true);
  };

  // Jump straight from a free cell on the board into the registration
  // form, with that subnet + IP already selected.
  const openAddFromBoard = (ip: string) => {
    setCheckModalOpen(false);
    setEditing(null);
    setForm({ ...emptyForm, subnet_id: boardSubnetId, ip_address: ip });
    setModalOpen(true);
  };

  const openViewFromBoard = (rec: IPAddress) => {
    setCheckModalOpen(false);
    setViewing(rec);
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

  // Comprehensive search text: raw fields plus resolved department name
  // and matching subnet label, so a search by department or subnet
  // ("Head Office", "Server Room") finds the right IPs too.
  const ipSearchValue = (r: IPAddress) => {
    const subnet = subnets.find((s) => s.id === r.subnet_id) ?? matchSubnet(r.ip_address, subnets);
    return [
      r.ip_address, r.hostname, r.department?.name, r.ip_owner, r.mac_address,
      r.access_switch_port, r.patch_panel_label, r.status, subnet?.label,
      subnet?.prefix, r.notes,
    ].filter(Boolean).join(' ');
  };

  const columns: Column<IPAddress>[] = [
    { key: 'ip_address', label: 'Key', sortable: true, sortValue: (r) => r.ip_address, render: (r) => <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{r.ip_address}</span> },
    { key: 'hostname', label: 'Name', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.hostname ?? '-'}</span> },
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
          <button onClick={() => openView(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg transition-colors" title="View Details">
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button onClick={() => openEdit(r)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg transition-colors" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && (
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

  // --- IP Availability Board -------------------------------------------
  const recordByIp = useMemo(() => {
    const map = new Map<string, IPAddress>();
    records.forEach((r) => map.set(r.ip_address, r));
    return map;
  }, [records]);

  // Hostname autocomplete + duplicate guard: every hostname already
  // registered against another IP Address record, offered as a
  // selectable suggestion (via SearchableCombobox on the Hostname field) so
  // the user can pick an existing one instead of retyping it, and
  // matched against as they type. A hostname still tied to another
  // active record (assigned/reserved/unassigned) is blocked as a
  // duplicate at save time. A record that has since gone Available or
  // Decommissioned releases its hostname for reuse — same rule the IP
  // Availability Board already uses to treat those two statuses as
  // "free" — so re-registering a replacement device under a retired
  // hostname is still allowed.
  const hostnameOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    records.forEach((r) => {
      const h = (r.hostname ?? '').trim();
      if (h && !seen.has(h.toLowerCase())) {
        seen.add(h.toLowerCase());
        list.push(h);
      }
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // MAC address autocomplete: every MAC address already registered
  // against another IP Address record, offered as a selectable
  // suggestion (via SearchableCombobox on the MAC Address field) so the user
  // can pick an existing one instead of retyping it, and matched
  // against as they type — same pattern as the Hostname suggestions
  // above.
  const macOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    records.forEach((r) => {
      const m = (r.mac_address ?? '').trim();
      if (m && !seen.has(m.toLowerCase())) {
        seen.add(m.toLowerCase());
        list.push(m);
      }
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // IP owner autocomplete: every employee name already entered on
  // another IP Address record, offered as a selectable suggestion (via
  // SearchableCombobox on the Owner field) so the user can reuse an
  // existing name instead of retyping it - same pattern as the
  // Hostname/MAC suggestions above. This field has no admin-managed
  // Customization list backing it (unlike Device/Server Owner), so
  // existing values on file are the only source of suggestions.
  const ipOwnerOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    records.forEach((r) => {
      const o = (r.ip_owner ?? '').trim();
      if (o && !seen.has(o.toLowerCase())) {
        seen.add(o.toLowerCase());
        list.push(o);
      }
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const findHostnameConflict = (hostname: string) => {
    const h = hostname.trim().toLowerCase();
    if (!h) return null;
    return (
      records.find(
        (r) =>
          r.id !== editing?.id &&
          (r.hostname ?? '').trim().toLowerCase() === h &&
          r.status !== 'available' &&
          r.status !== 'decommissioned'
      ) ?? null
    );
  };

  // Register / Edit modal: once a subnet is selected, the IP Address
  // field only ever offers addresses that are (a) actually inside that
  // subnet and (b) not already registered to a different record. The
  // network/broadcast edge addresses (.0 / .255) are excluded unless
  // something is already registered against them (matches the board's
  // rule). The record currently being edited keeps its own address in
  // the list so editing without changing the IP still works.
  const formSubnet = subnets.find((s) => s.id === form.subnet_id) ?? null;
  const formSubnetEnumerable = !!formSubnet && isEnumerableSubnet(formSubnet.prefix);
  const formAvailableIps = useMemo(() => {
    if (!formSubnet || !formSubnetEnumerable) return [];
    return enumerateSubnetIps(formSubnet.prefix).filter((ip, octet) => {
      if (ip === editing?.ip_address) return true;
      const record = recordByIp.get(ip);
      if (record) return false; // already registered to another record
      if (octet === 0 || octet === 255) return false; // network/broadcast placeholder
      return true;
    });
  }, [formSubnet, formSubnetEnumerable, recordByIp, editing]);

  const selectedBoardSubnet = subnets.find((s) => s.id === boardSubnetId) ?? null;
  const boardSubnetEnumerable = !!selectedBoardSubnet && isEnumerableSubnet(selectedBoardSubnet.prefix);

  type BoardCell = { ip: string; octet: number; kind: 'network' | 'used' | 'free'; record: IPAddress | null };

  // Every address in the selected /24: an existing record with a status
  // other than "available" counts as used/assigned; everything else
  // (no record, or a record explicitly marked "available") is free to
  // hand out. The two edge addresses (.0 / .255) are shown as
  // network/broadcast placeholders unless something is actually
  // registered against them.
  const boardCells: BoardCell[] = useMemo(() => {
    if (!selectedBoardSubnet || !boardSubnetEnumerable) return [];
    return enumerateSubnetIps(selectedBoardSubnet.prefix).map((ip, octet) => {
      const record = recordByIp.get(ip) ?? null;
      if (!record && (octet === 0 || octet === 255)) {
        return { ip, octet, kind: 'network' as const, record: null };
      }
      if (record && record.status !== 'available') {
        return { ip, octet, kind: 'used' as const, record };
      }
      return { ip, octet, kind: 'free' as const, record };
    });
  }, [selectedBoardSubnet, boardSubnetEnumerable, recordByIp]);

  const boardUsedCount = boardCells.filter((c) => c.kind === 'used').length;
  const boardFreeCount = boardCells.filter((c) => c.kind === 'free').length;

  const visibleBoardCells = boardCells.filter((c) => {
    if (c.kind === 'network') return true;
    if (boardFilter === 'used') return c.kind === 'used';
    if (boardFilter === 'available') return c.kind === 'free';
    return true;
  });

  const boardCellStyles: Record<BoardCell['kind'], string> = {
    network: 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600 ring-1 ring-gray-100 cursor-not-allowed',
    used: 'bg-red-50 text-red-700 ring-1 ring-red-100 hover:ring-red-300 cursor-pointer',
    free: 'bg-green-50 text-green-700 ring-1 ring-green-100 hover:ring-green-400 cursor-pointer',
  };

  const setExtraField = (key: string, value: string) => {
    setForm((current) => ({ ...current, extra_data: { ...current.extra_data, [key]: value } }));
  };

  const viewSections: DetailSection[] = viewing ? [
    {
      title: 'IP Information',
      fields: [
        { label: 'IP Address', value: viewing.ip_address, mono: true },
        { label: 'Subnet', value: (() => {
          const s = subnets.find((sn) => sn.id === viewing.subnet_id) ?? matchSubnet(viewing.ip_address, subnets);
          return s ? `${s.prefix}0/24${s.label ? ` — ${s.label}` : ''}` : undefined;
        })() },
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
      ],
    },
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
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">IP Address Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{records.length} registered IP addresses</p>
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
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> Import
            </Button>
          )}
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register IP Address
            </Button>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statusCounts.map((s) => {
          const style = statusCardStyles[s.value];
          return (
            <div key={s.value} className="gbb-card-hover bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.count}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${style.color} text-white flex items-center justify-center shadow-soft shrink-0`}>
                  {style.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchValue={ipSearchValue}
          searchPlaceholder="Search by IP, hostname, owner, MAC, department, subnet..."
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
        onDelete={viewing && canWrite() ? () => { const rec = viewing; setViewing(null); handleDelete(rec); } : undefined}
        deleteLabel="Delete IP Address"
      />

      {/* Register / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit IP Address' : 'Register New IP Address'}
        size="lg"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="IP Subnet"
              required
              hint={
                usableSubnets.length === 0
                  ? 'No subnets configured yet — add one under Customization > IP Subnets.'
                  : 'Select the configured subnet this address belongs to.'
              }
            >
              <SearchableSelect
                options={usableSubnets.map((s) => ({ value: s.id, label: `${s.prefix}0/24${s.label ? ` — ${s.label}` : ''}` }))}
                value={form.subnet_id}
                onChange={(val) => setForm({ ...form, subnet_id: val, ip_address: '' })}
                placeholder="Select a subnet…"
                searchPlaceholder="Search subnets…"
                emptyMessage={usableSubnets.length === 0 ? 'No subnets configured.' : 'No matching subnets.'}
                required
                disabled={!!editing}
              />
            </Field>
            <Field
              label="IP Address"
              required
              hint={
                !formSubnet
                  ? 'Select a subnet first'
                  : formAvailableIps.length === 0
                  ? 'No available addresses left in this subnet'
                  : `${formAvailableIps.length} address${formAvailableIps.length === 1 ? '' : 'es'} available`
              }
            >
              <SearchableSelect
                options={formAvailableIps.map((ip) => ({ value: ip, label: `${ip}${ip === editing?.ip_address ? ' (current)' : ''}` }))}
                value={form.ip_address}
                onChange={(val) => setForm({ ...form, ip_address: val })}
                placeholder={!formSubnet ? 'Select a subnet first' : formAvailableIps.length === 0 ? 'No available addresses' : 'Select an available IP...'}
                searchPlaceholder="Search available IPs…"
                emptyMessage="No matching addresses."
                required
                disabled={!formSubnet || formAvailableIps.length === 0}
              />
            </Field>
            <Field
              label={fieldLabel('hostname')}
              required={requiredBaseFields.includes('hostname')}
              hint={hostnameOptions.length > 0 ? 'Start typing to see hostnames already in the system' : undefined}
            >
              <SearchableCombobox
                options={hostnameOptions.map((h) => ({ value: h }))}
                value={form.hostname}
                onChange={(val) => setForm({ ...form, hostname: val })}
                placeholder="e.g., PC-HQ-001"
                pattern={HOSTNAME_PATTERN}
                title="Letters, numbers, hyphens and dots only, e.g. PC-HQ-001"
                emptyMessage="No existing hostname matches — this will be entered as a new one."
                required
              />
            </Field>
            <Field label={fieldLabel('department_id')} required={requiredBaseFields.includes('department_id')}>
              <SearchableSelect
                options={departments.map((d) => ({ value: d.id, label: `${d.name}${d.is_branch ? ' (Branch)' : ''}` }))}
                value={form.department_id}
                onChange={(val) => setForm({ ...form, department_id: val })}
                placeholder="Select department/branch"
                searchPlaceholder="Search departments/branches…"
                emptyMessage="No matching departments."
                required
              />
            </Field>
            <Field
              label={fieldLabel('ip_owner')}
              required={requiredBaseFields.includes('ip_owner')}
              hint={ipOwnerOptions.length > 0 ? 'Start typing to see owners already in the system' : undefined}
            >
              <SearchableCombobox
                options={ipOwnerOptions.map((o) => ({ value: o }))}
                value={form.ip_owner}
                onChange={(val) => setForm({ ...form, ip_owner: val })}
                placeholder="Employee responsible for this IP"
                title="Enter the employee's name (letters only)"
                emptyMessage="No existing owner matches — this will be entered as a new one."
                required
              />
            </Field>
            <Field
              label={fieldLabel('mac_address')}
              required={requiredBaseFields.includes('mac_address')}
              hint={macOptions.length > 0 ? 'Start typing to see MAC addresses already in the system' : undefined}
            >
              <SearchableCombobox
                options={macOptions.map((m) => ({ value: m }))}
                value={form.mac_address}
                onChange={(val) => setForm({ ...form, mac_address: val })}
                placeholder="00:1A:2B:3C:4D:5E"
                pattern={MAC_PATTERN}
                title="Enter a valid MAC address, e.g. 00:1A:2B:3C:4D:5E"
                emptyMessage="No existing MAC address matches — this will be entered as a new one."
                required
              />
            </Field>
            <Field label={fieldLabel('access_switch_port')} required={requiredBaseFields.includes('access_switch_port')}>
              <TextInput
                value={form.access_switch_port}
                onChange={(e) => setForm({ ...form, access_switch_port: e.target.value })}
                placeholder="e.g., Gi1/0/24"
                pattern={PORT_LABEL_PATTERN}
                title="Letters, numbers and common separators only, e.g. Gi1/0/24"
                required
              />
            </Field>
            <Field
              label={fieldLabel('patch_panel_label')}
              required={requiredBaseFields.includes('patch_panel_label')}
              hint={
                patchPanelLabels.length === 0
                  ? 'No values defined yet - add one under Customization > Patch / Level Numbers.'
                  : undefined
              }
            >
              <SearchableSelect
                options={patchPanelLabels.map((l) => ({ value: l.label, label: l.label }))}
                value={form.patch_panel_label}
                onChange={(val) => setForm({ ...form, patch_panel_label: val })}
                placeholder="Select patch panel label"
                searchPlaceholder="Search patch panel labels…"
                emptyMessage={patchPanelLabels.length === 0 ? 'No patch panel labels defined yet.' : 'No matching labels.'}
                required
              />
            </Field>
            <Field
              label="Status"
              required
              hint={form.status === 'unassigned' ? 'Select a status to complete registration' : undefined}
            >
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IPAddress['status'] })}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value} disabled={s.value === 'unassigned'}>{s.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          {extraFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Additional Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    className={field.type === 'multiselect' || field.type === 'radio' || field.type === 'long_text' ? 'sm:col-span-2' : undefined}
                  >
                    <DynamicField
                      field={field}
                      value={form.extra_data[field.key] ?? ''}
                      onChange={(value) => setExtraField(field.key, value)}
                      departments={departments}
                      employees={employees}
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}
          <Field label={fieldLabel('notes')} required={requiredBaseFields.includes('notes')}>
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder={IP_BASE_FIELD_META.notes?.placeholder ?? 'Additional notes...'} required={requiredBaseFields.includes('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Update IP Address' : 'Register IP Address'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* IP Availability Board */}
      <Modal
        open={checkModalOpen}
        onClose={() => setCheckModalOpen(false)}
        title="IP Availability Board"
        subtitle="See every address in a subnet at a glance, or ping one address directly"
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Subnet" hint={subnets.length === 0 ? 'No subnets defined yet — add one under IP Subnet Management' : undefined}>
              <SearchableSelect
                options={subnets.map((s) => ({ value: s.id, label: `${s.prefix}* — ${s.label}` }))}
                value={boardSubnetId}
                onChange={(val) => setBoardSubnetId(val)}
                placeholder="Select a subnet…"
                searchPlaceholder="Search subnets…"
                emptyMessage={subnets.length === 0 ? 'No subnets defined yet.' : 'No matching subnets.'}
              />
            </Field>
            {boardSubnetEnumerable && (
              <div className="flex rounded-lg ring-1 ring-gray-200 overflow-hidden shrink-0" role="group" aria-label="IP usage filter">
                {([
                  { value: 'all', label: 'All' },
                  { value: 'used', label: 'Used' },
                  { value: 'available', label: 'Available' },
                ] as const).map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setBoardFilter(f.value)}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      boardFilter === f.value ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBoardSubnet && !boardSubnetEnumerable && (
            <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-4 text-sm text-amber-700">
              This subnet's prefix ("{selectedBoardSubnet.prefix}") describes more than 256 addresses, so it can't be
              drawn as a full board. Define it down to three octets (e.g. "10.6.13.") to enable the board view.
            </div>
          )}

          {selectedBoardSubnet && boardSubnetEnumerable && (
            <>
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <LayoutGrid size={15} className="text-brand-500" />
                  {selectedBoardSubnet.prefix}0 – {selectedBoardSubnet.prefix}255
                </span>
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle size={15} /> {boardUsedCount} Used
                </span>
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 size={15} /> {boardFreeCount} Available
                </span>
              </div>

              {/* Visual board: one cell per address, last octet shown, color-coded */}
              <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] sm:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
                {boardCells.map((cell) => {
                  const dimmed = boardFilter !== 'all' && cell.kind !== 'network' &&
                    ((boardFilter === 'used' && cell.kind !== 'used') || (boardFilter === 'available' && cell.kind !== 'free'));
                  return (
                    <button
                      key={cell.ip}
                      type="button"
                      disabled={cell.kind === 'network'}
                      onClick={() => {
                        if (cell.kind === 'used' && cell.record) openViewFromBoard(cell.record);
                        else if (cell.kind === 'free') openAddFromBoard(cell.ip);
                      }}
                      title={
                        cell.kind === 'network'
                          ? `${cell.ip} — network/broadcast address`
                          : cell.kind === 'used'
                          ? `${cell.ip} — ${cell.record?.hostname ?? 'in use'} (${cell.record?.status})`
                          : `${cell.ip} — available, click to register`
                      }
                      className={`aspect-square rounded-md text-[10px] font-mono font-semibold flex items-center justify-center transition-all ${
                        boardCellStyles[cell.kind]
                      } ${dimmed ? 'opacity-20 pointer-events-none' : ''}`}
                    >
                      {cell.octet}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 dark:text-gray-500 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-50 ring-1 ring-red-100 inline-block" /> Used / assigned</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-50 ring-1 ring-green-100 inline-block" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-50 dark:bg-gray-900 ring-1 ring-gray-100 inline-block" /> Network / broadcast</span>
              </div>

              {/* IP Usage table: same filter, listed as rows with detail */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                  <ListFilter size={14} /> IP Usage
                </p>
                <div className="border border-brand-600 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2 font-medium">IP Address</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Hostname</th>
                        <th className="px-3 py-2 font-medium">Owner</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleBoardCells.filter((c) => c.kind !== 'network').map((cell) => (
                        <tr
                          key={cell.ip}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                          onClick={() => (cell.kind === 'used' && cell.record ? openViewFromBoard(cell.record) : openAddFromBoard(cell.ip))}
                        >
                          <td className="px-3 py-1.5 font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{cell.ip}</td>
                          <td className="px-3 py-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              cell.record ? statusStyles[cell.record.status] : 'bg-green-50 text-green-700 ring-1 ring-green-100'
                            }`}>
                              {cell.record ? cell.record.status : 'Available'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{cell.record?.hostname ?? '-'}</td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{cell.record?.ip_owner ?? '-'}</td>
                          <td className="px-3 py-1.5 text-right text-brand-600 text-xs font-medium">
                            {cell.kind === 'used' ? 'View' : 'Register'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Live ping check - useful for one-off addresses outside any defined subnet */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Or ping a single address directly</p>
            <Field label="IP Address to check">
              <div className="flex gap-2">
                <TextInput
                  value={checkIp}
                  onChange={(e) => {
                    setCheckIp(e.target.value);
                    setCheckResult(null);
                  }}
                  placeholder="e.g., 10.6.1.75"
                  onKeyDown={(e) => e.key === 'Enter' && runCheck()}
                />
                <Button type="button" variant="outline" onClick={runCheck} loading={checking} className="shrink-0">
                  {!checking && <Radar size={16} />}
                  Ping
                </Button>
              </div>
            </Field>

            {checking && (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-400 dark:text-gray-500">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Pinging {checkIp}...</span>
              </div>
            )}

            {!checking && checkResult && (
              <div
                className={`rounded-xl p-4 flex items-start gap-3 ring-1 ${
                  checkResult.reachable ? 'bg-red-50 ring-red-100' : 'bg-green-50 ring-green-100'
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{checkResult.ip}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">
              A live ICMP ping — a host can be offline yet still reserved, so confirm against the board above before
              assigning.
            </p>
          </div>
        </div>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import IP Addresses from Excel / CSV"
        subtitle="Bring in IP addresses that are already assigned but not yet registered"
        columns={importColumns}
        templateFilename="ip_address_import_template"
        validateRow={validateImportRow}
        importRow={importIpRow}
        onImported={loadData}
      />
    </div>
  );
}
