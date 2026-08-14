"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, IPAddress, Department } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Network, Download, Wifi, Loader2 } from 'lucide-react';

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
    const headers = ['IP Address', 'Hostname', 'Department', 'Owner (Employee)', 'MAC Address', 'Status', 'Registered'];
    const rows = records.map((r) => [
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
    count: records.filter((r) => r.status === s.value).length,
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
            <p className="text-sm text-gray-500">{records.length} registered IP addresses</p>
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

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCounts.map((s) => (
          <div key={s.value} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['ip_address', 'hostname', 'ip_owner', 'mac_address']}
          searchPlaceholder="Search by IP, hostname, owner, MAC..."
          dateFilterKey="created_at"
          emptyMessage="No IP addresses registered yet"
        />
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
