"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, IPAddress, Department } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { DepartmentCardStat } from './DepartmentsPage';
import { Plus, Pencil, Trash2, Network, Download, Wifi, Loader2, Search, X, ArrowRight } from 'lucide-react';

const statusOptions: { value: IPAddress['status']; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'available', label: 'Available' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const statusStyles: Record<IPAddress['status'], string> = {
  assigned: 'bg-green-50 text-green-700',
  reserved: 'bg-amber-50 text-amber-700',
  available: 'bg-blue-50 text-blue-700',
  decommissioned: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  ip_address: '',
  hostname: '',
  department_id: '',
  ip_owner: '',
  mac_address: '',
  status: 'assigned' as IPAddress['status'],
  notes: '',
};

const IPV4_ASSIGNABLE_POOL = 254;

function IPDepartmentCardGrid({
  departments,
  selectedDepartmentId,
  onSelectDepartment,
  searchTerm = '',
}: {
  departments: DepartmentCardStat[];
  selectedDepartmentId?: string | null;
  onSelectDepartment?: (departmentId: string | null) => void;
  searchTerm?: string;
}) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleDepartments = normalizedSearch
    ? departments.filter((dept) => {
        const searchable = [dept.name, dept.description ?? '', dept.is_branch ? 'branch' : 'department']
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedSearch);
      })
    : departments;

  if (visibleDepartments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        No departments match this search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {visibleDepartments.map((dept) => {
        const isSelected = selectedDepartmentId === dept.id;

        return (
          <button
            key={dept.id}
            type="button"
            onClick={() => onSelectDepartment?.(isSelected ? null : dept.id)}
            className={`group rounded-2xl border p-4 text-left transition-all duration-200 ${
              isSelected
                ? 'border-[#343494] bg-[#343494] text-white shadow-lg shadow-[#343494]/15'
                : 'border-gray-200 bg-white hover:border-[#343494]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    dept.is_branch
                      ? isSelected
                        ? 'bg-amber-400/20 text-amber-100'
                        : 'bg-amber-50 text-amber-600'
                      : isSelected
                        ? 'bg-blue-400/20 text-blue-100'
                        : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {dept.is_branch ? <span className="text-lg">📍</span> : <span className="text-lg">🏢</span>}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-base font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                    {dept.name}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected
                        ? 'bg-white/12 text-white'
                        : dept.is_branch
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {dept.is_branch ? 'Branch' : 'Department'}
                  </span>
                </div>
              </div>
              <ArrowRight
                size={18}
                className={`shrink-0 transition-transform ${isSelected ? 'rotate-90 text-white' : 'text-gray-400 group-hover:text-[#343494]'}`}
              />
            </div>

            {dept.description && (
              <p className={`mt-3 line-clamp-2 text-sm ${isSelected ? 'text-blue-50' : 'text-gray-600'}`}>
                {dept.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-current/10 pt-3">
              <div>
                <p className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dept.total_ips}</p>
                <span className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>Total</span>
              </div>
              <div>
                <p className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dept.assigned_ips}</p>
                <span className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>Assigned</span>
              </div>
              <div>
                <p className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dept.available_ips}</p>
                <span className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>Free</span>
              </div>
            </div>

            <div className={`mt-3 flex items-center justify-between text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
              <span className="inline-flex items-center gap-1">{dept.reserved_ips} reserved</span>
              <span>{isSelected ? 'Selected' : 'View IPs'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function parseIPv4LastOctet(ip: string | null | undefined): number | null {
  if (!ip) return null;
  const match = /^\d{1,3}(?:\.\d{1,3}){3}$/.exec(ip.trim());
  if (!match) return null;
  const octets = ip.trim().split('.').map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return null;
  return octets[3] ?? null;
}

function deriveDepartmentNetworkPrefix(records: IPAddress[]): string {
  const validRecord = records.find((record) => parseIPv4LastOctet(record.ip_address) !== null);
  if (!validRecord) return '10.6.1';
  const parts = validRecord.ip_address.split('.');
  if (parts.length !== 4) return '10.6.1';
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

export function IPManagementPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<IPAddress[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPAddress | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [checkingIp, setCheckingIp] = useState(false);
  const [ipCheckResult, setIpCheckResult] = useState<{ available: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

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

  const departmentCards = useMemo<DepartmentCardStat[]>(() => {
    return departments.map((department) => {
      const deptRecords = records.filter((record) => record.department_id === department.id);
      const usedIps = deptRecords.filter((record) => {
        const lastOctet = parseIPv4LastOctet(record.ip_address);
        return lastOctet !== null && lastOctet >= 1 && lastOctet <= 254 && ['assigned', 'reserved', 'decommissioned'].includes(record.status);
      }).length;

      return {
        ...department,
        total_ips: IPV4_ASSIGNABLE_POOL,
        assigned_ips: deptRecords.filter((record) => record.status === 'assigned').length,
        reserved_ips: deptRecords.filter((record) => record.status === 'reserved').length,
        available_ips: Math.max(0, IPV4_ASSIGNABLE_POOL - usedIps),
      };
    });
  }, [departments, records]);

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === selectedDepartmentId) ?? null,
    [departments, selectedDepartmentId]
  );

  const selectedDepartmentSlots = useMemo(() => {
    if (!selectedDepartmentId) return [];

    const deptRecords = records.filter((record) => record.department_id === selectedDepartmentId);
    const prefix = deriveDepartmentNetworkPrefix(deptRecords);
    const map = new Map<number, IPAddress>();

    deptRecords.forEach((record) => {
      const lastOctet = parseIPv4LastOctet(record.ip_address);
      if (lastOctet !== null && lastOctet >= 1 && lastOctet <= 254) {
        map.set(lastOctet, record);
      }
    });

    return Array.from({ length: IPV4_ASSIGNABLE_POOL }, (_, index) => {
      const slot = index + 1;
      const record = map.get(slot);
      const ip = `${prefix}.${slot}`;

      return {
        slot,
        ip,
        status: record?.status ?? 'available',
        id: record?.id ?? `slot-${slot}`,
      };
    });
  }, [records, selectedDepartmentId]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesDepartment =
        !selectedDepartmentId || record.department_id === selectedDepartmentId;

      if (!matchesDepartment) return false;

      if (!q) return true;

      const searchableText = [
        record.ip_address,
        record.hostname ?? '',
        record.ip_owner ?? '',
        record.mac_address ?? '',
        record.department?.name ?? '',
        record.status,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [records, search, selectedDepartmentId]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setIpCheckResult(null);
    setModalOpen(true);
  };

  const openEdit = (rec: IPAddress) => {
    setEditing(rec);
    setForm({
      ip_address: rec.ip_address,
      hostname: rec.hostname ?? '',
      department_id: rec.department_id ?? '',
      ip_owner: rec.ip_owner ?? '',
      mac_address: rec.mac_address ?? '',
      status: rec.status,
      notes: rec.notes ?? '',
    });
    setIpCheckResult(null);
    setModalOpen(true);
  };

  const handleCheckAvailability = async () => {
    if (!form.ip_address) {
      toast('Enter an IP address first', 'error');
      return;
    }
    setCheckingIp(true);
    setIpCheckResult(null);
    const { data, error } = await api.get<{ available: boolean; message: string }>(
      `/ip/check-availability?ip=${encodeURIComponent(form.ip_address)}`
    );
    setCheckingIp(false);
    if (error) {
      toast(error.message, 'error');
    } else if (data) {
      setIpCheckResult(data);
    }
  };

  const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.ip_address) {
      toast('IP address is required', 'error');
      return;
    }
    if (!form.department_id) {
      toast('Department is required for all IP address entries', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      hostname: form.hostname || null,
      department_id: form.department_id || null,
      ip_owner: form.ip_owner || null,
      mac_address: form.mac_address || null,
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
    const dataToExport = selectedDepartmentId ? filteredRecords : records;
    const headers = ['IP Address', 'Hostname', 'Department', 'Owner (Employee)', 'MAC Address', 'Status', 'Registered'];
    const rows = dataToExport.map((r) => [
      r.ip_address, r.hostname ?? '', r.department?.name ?? '', r.ip_owner ?? '', r.mac_address ?? '', r.status,
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

  const columns: Column<IPAddress>[] = [
    { key: 'ip_address', label: 'IP Address', sortable: true, sortValue: (r) => r.ip_address },
    { key: 'hostname', label: 'Hostname', render: (r) => r.hostname ?? '-' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'ip_owner', label: 'Owner (Employee)', render: (r) => r.ip_owner ?? '-' },
    { key: 'mac_address', label: 'MAC Address', render: (r) => r.mac_address ?? '-' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusStyles[r.status]}`}>
          {r.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) =>
        canWrite() ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
              <Pencil size={16} />
            </button>
            {hasRole('admin', 'manager') && (
              <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Read only</span>
        ),
    },
  ];

  const statusCounts = statusOptions.map((s) => ({
    ...s,
    count: selectedDepartmentId
      ? filteredRecords.filter((r) => r.status === s.value).length
      : records.filter((r) => r.status === s.value).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">IP Address Management</h1>
            <p className="text-sm text-gray-500">
              {selectedDepartmentId && selectedDepartment
                ? `${filteredRecords.length} IPs in ${selectedDepartment.name}`
                : `${records.length} registered IP addresses`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={selectedDepartment ? `Search ${selectedDepartment.name} IP records...` : 'Search departments or IP addresses...'}
              className="gbb-input w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-10 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {selectedDepartment && (
            <Button variant="secondary" size="sm" onClick={() => setSelectedDepartmentId(null)}>
              Show all departments
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCounts.map((s) => (
          <div key={s.value} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Departments</h2>
          <span className="text-sm text-gray-500">{departmentCards.length} cards</span>
        </div>
        <IPDepartmentCardGrid
          departments={departmentCards}
          selectedDepartmentId={selectedDepartmentId}
          onSelectDepartment={setSelectedDepartmentId}
          searchTerm={search}
        />
      </div>

      {selectedDepartment && !loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Available IP slots for {selectedDepartment.name}</h3>
              <p className="text-sm text-gray-500">
                {selectedDepartmentSlots.filter((slot) => slot.status === 'available').length} free of {IPV4_ASSIGNABLE_POOL}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-500" /> Assigned</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-400" /> Reserved</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-gray-300" /> Available</span>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 md:grid-cols-12 xl:grid-cols-16">
            {selectedDepartmentSlots.map((slot) => {
              const colorClass =
                slot.status === 'assigned'
                  ? 'bg-green-500 text-white border-green-500'
                  : slot.status === 'reserved'
                    ? 'bg-amber-400 text-amber-950 border-amber-400'
                    : slot.status === 'decommissioned'
                      ? 'bg-slate-400 text-white border-slate-400'
                      : 'bg-gray-200 text-gray-700 border-gray-200';

              return (
                <div
                  key={slot.id}
                  title={`${slot.ip} (${slot.status})`}
                  className={`flex h-8 items-center justify-center rounded-md border text-[10px] font-semibold ${colorClass}`}
                >
                  {slot.slot}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedDepartment ? `${selectedDepartment.name} IP records` : 'All IP records'}
            </h2>
            <span className="text-sm text-gray-500">{filteredRecords.length} matches</span>
          </div>
          <DataTable
            columns={columns}
            data={filteredRecords}
            dateFilterKey="created_at"
            emptyMessage={selectedDepartment ? `No IP records found for ${selectedDepartment.name}` : 'No IP addresses registered yet'}
          />
        </div>
      )}

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
                    setIpCheckResult(null);
                  }}
                  placeholder="e.g., 10.6.1.50"
                  required
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCheckAvailability} disabled={checkingIp}>
                  {checkingIp ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                  Check
                </Button>
              </div>
              {ipCheckResult && (
                <p className={`text-xs mt-1.5 font-medium ${ipCheckResult.available ? 'text-green-600' : 'text-red-600'}`}>
                  {ipCheckResult.message}
                </p>
              )}
            </Field>
            <Field label="Hostname">
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="e.g., PC-HQ-001" />
            </Field>
            <Field label="Department / Branch" required>
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
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update IP Address' : 'Register IP Address'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
