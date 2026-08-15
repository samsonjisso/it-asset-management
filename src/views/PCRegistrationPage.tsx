"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, PCRegistration, Department } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Monitor, Download } from 'lucide-react';

const emptyForm = {
  hostname: '',
  monitor_serial: '',
  asset_tag: '',
  service_tag: '',
  mac_address: '',
  product_key: '',
  ip_address: '',
  department_id: '',
  floor_number: '',
  switch_port_number: '',
  access_switch_ip: '',
  access_switch_name: '',
  patch_level_number: '',
  notes: '',
};

function isValidIpv4(value: string) {
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(value.trim());
}

function isValidMacAddress(value: string) {
  const trimmed = value.trim();
  return (
    /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(trimmed) ||
    /^(?:[0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$/.test(trimmed) ||
    /^[0-9A-Fa-f]{12}$/.test(trimmed)
  );
}

function containsUnsafeScript(value: string) {
  return /<\s*(script|iframe|object|embed|svg|img)|javascript\s*:|vbscript\s*:|on\w+\s*=|<\s*\/?\s*[a-z]+\s*>/i.test(value);
}

function validatePCForm(form: typeof emptyForm) {
  const entries = Object.entries(form) as [string, string][];

  for (const [key, value] of entries) {
    const text = value.trim();
    if (!text) continue;
    if (containsUnsafeScript(text)) {
      throw new Error(`${key.replace(/_/g, ' ')} contains invalid or unsafe script characters.`);
    }
  }

  if (form.hostname.trim() && !/^GBBIT01[0-9A-Z-]*$/i.test(form.hostname.trim())) {
    throw new Error('PC hostname must start with GBBIT01 and use letters, numbers, or hyphens only.');
  }

  if (form.mac_address.trim() && !isValidMacAddress(form.mac_address)) {
    throw new Error('MAC address must be valid and use either colon-separated or 12-character hex format.');
  }

  if (form.ip_address.trim() && !isValidIpv4(form.ip_address)) {
    throw new Error('IP address must be a valid IPv4 address like 10.6.1.12.');
  }

  if (form.floor_number.trim() && !/^\d+$/.test(form.floor_number.trim())) {
    throw new Error('Floor number must contain only numbers.');
  }

  if (form.switch_port_number.trim() && !/^\d+$/.test(form.switch_port_number.trim())) {
    throw new Error('Switch port number must contain only numbers.');
  }

  if (form.access_switch_name.trim() && !/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(form.access_switch_name.trim())) {
    throw new Error('Access switch name must be a valid text value without script content.');
  }

  if (form.patch_level_number.trim() && !/^\d+$/.test(form.patch_level_number.trim())) {
    throw new Error('Patch number must contain only numbers.');
  }

  if (form.access_switch_ip.trim() && !isValidIpv4(form.access_switch_ip)) {
    throw new Error('Access switch IP address must be a valid IPv4 address.');
  }
}

export function PCRegistrationPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<PCRegistration[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PCRegistration | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipAssetTag, setSkipAssetTag] = useState(false);
  const [skipFloor, setSkipFloor] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pcRes, deptRes] = await Promise.all([
      supabase.from('pc_registrations').select('*, department:departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (pcRes.data) setRecords(pcRes.data as PCRegistration[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
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

  const openEdit = (rec: PCRegistration) => {
    setEditing(rec);
    setForm({
      hostname: rec.hostname,
      monitor_serial: rec.monitor_serial ?? '',
      asset_tag: rec.asset_tag ?? '',
      service_tag: rec.service_tag ?? '',
      mac_address: rec.mac_address ?? '',
      product_key: rec.product_key ?? '',
      ip_address: rec.ip_address ?? '',
      department_id: rec.department_id ?? '',
      floor_number: rec.floor_number ?? '',
      switch_port_number: rec.switch_port_number ?? '',
      access_switch_ip: rec.access_switch_ip ?? '',
      access_switch_name: rec.access_switch_name ?? '',
      patch_level_number: rec.patch_level_number ?? '',
      notes: rec.notes ?? '',
    });
    setSkipAssetTag(!rec.asset_tag);
    setSkipFloor(!rec.floor_number);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      validatePCForm(form);
    } catch (error) {
      toast((error as Error).message, 'error');
      return;
    }

    if (!form.hostname) {
      toast('Hostname is required', 'error');
      return;
    }
    if (!form.department_id) {
      toast('Department is required for all PC registration entries', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      asset_tag: skipAssetTag ? null : form.asset_tag || null,
      floor_number: skipFloor ? null : form.floor_number || null,
      department_id: form.department_id || null,
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
    const headers = ['Hostname', 'Monitor Serial', 'Asset Tag', 'Service Tag', 'MAC Address', 'IP Address', 'Department', 'Floor', 'Switch Port', 'Access Switch', 'Patch Level', 'Created At'];
    const rows = records.map((r) => [
      r.hostname, r.monitor_serial ?? '', r.asset_tag ?? '', r.service_tag ?? '', r.mac_address ?? '', r.ip_address ?? '',
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
    { key: 'hostname', label: 'Hostname', sortable: true, sortValue: (r) => r.hostname },
    { key: 'service_tag', label: 'Service Tag', render: (r) => r.service_tag ?? '-' },
    { key: 'asset_tag', label: 'Asset Tag', render: (r) => r.asset_tag ?? <span className="text-gray-400 italic">N/A</span> },
    { key: 'mac_address', label: 'MAC Address', render: (r) => r.mac_address ?? '-' },
    { key: 'ip_address', label: 'IP Address', render: (r) => r.ip_address ?? '-' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'floor_number', label: 'Floor', render: (r) => r.floor_number ?? '-' },
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

  const selectedDept = departments.find((d) => d.id === form.department_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center">
            <Monitor size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">PC Registration</h1>
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
          <div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'service_tag', 'asset_tag', 'mac_address', 'ip_address']}
          searchPlaceholder="Search by hostname, tag, MAC, IP..."
          dateFilterKey="created_at"
          emptyMessage="No PCs registered yet"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit PC Registration' : 'Register New PC'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
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
              <TextInput value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="00:1A:2B:3C:4D:5E" />
            </Field>
            <Field label="Product Key / License">
              <TextInput value={form.product_key} onChange={(e) => setForm({ ...form, product_key: e.target.value })} placeholder="Product key (link to license)" />
            </Field>
            <Field label="IP Address">
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="10.6.x.x" />
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
              <TextInput value={form.access_switch_ip} onChange={(e) => setForm({ ...form, access_switch_ip: e.target.value })} placeholder="e.g., 10.6.1.103" />
            </Field>
            <Field label="Patch / Level Number">
              <TextInput value={form.patch_level_number} onChange={(e) => setForm({ ...form, patch_level_number: e.target.value })} placeholder="Patch level number" />
            </Field>
          </div>
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
