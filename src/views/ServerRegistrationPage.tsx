"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, Server } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Server as ServerIcon, Download, Cpu, MemoryStick, HardDrive as StorageIcon } from 'lucide-react';

const serverTypes = [
  { value: 'redhat', label: 'Redhat' },
  { value: 'ubuntu', label: 'Ubuntu' },
  { value: 'windows_server', label: 'Windows Server' },
  { value: 'other', label: 'Other' },
];

const environments = [
  { value: 'production', label: 'Production' },
  { value: 'test', label: 'Test' },
  { value: 'standby', label: 'Standby' },
];

const ownerOptions = [
  { value: 'application', label: 'Application' },
  { value: 'information_security', label: 'Information Security' },
  { value: 'infrastructure_management', label: 'Infrastructure Management' },
];

const emptyForm = {
  server_type: 'redhat' as Server['server_type'],
  server_type_other: '',
  hostname: '',
  ip_address: '',
  ssh_port: '22',
  environment: 'production' as Server['environment'],
  server_owner: 'infrastructure_management' as Server['server_owner'],
  ram: '',
  cpu: '',
  storage: '',
  os_release: '',
  host_location: '',
  notes: '',
};

export function ServerRegistrationPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('servers').select('*').order('created_at', { ascending: false });
    if (data) setRecords(data as Server[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (rec: Server) => {
    setEditing(rec);
    setForm({
      server_type: rec.server_type,
      server_type_other: rec.server_type_other ?? '',
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
      notes: rec.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast('Server hostname is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      server_type: form.server_type,
      server_type_other: form.server_type === 'other' ? form.server_type_other || null : null,
      hostname: form.hostname,
      ip_address: form.ip_address || null,
      ssh_port: parseInt(form.ssh_port) || 22,
      environment: form.environment,
      server_owner: form.server_owner,
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
    const headers = ['Server Type', 'Hostname', 'IP Address', 'SSH Port', 'Environment', 'Owner', 'RAM', 'CPU', 'Storage', 'OS Release', 'Host Location', 'Created At'];
    const rows = records.map((r) => [
      serverTypes.find((t) => t.value === r.server_type)?.label ?? r.server_type,
      r.hostname, r.ip_address ?? '', r.ssh_port, environments.find((e) => e.value === r.environment)?.label ?? r.environment,
      ownerOptions.find((o) => o.value === r.server_owner)?.label ?? r.server_owner,
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

  const columns: Column<Server>[] = [
    { key: 'hostname', label: 'Hostname', sortable: true, sortValue: (r) => r.hostname, render: (r) => (
      <div className="flex items-center gap-2">
        <ServerIcon size={16} className="text-[#343494]" />
        <span className="font-medium">{r.hostname}</span>
      </div>
    )},
    { key: 'server_type', label: 'Type', sortable: true, sortValue: (r) => r.server_type, render: (r) => r.server_type === 'other' ? r.server_type_other ?? 'Other' : serverTypes.find((t) => t.value === r.server_type)?.label ?? r.server_type },
    { key: 'ip_address', label: 'IP Address', render: (r) => r.ip_address ?? '-' },
    { key: 'ssh_port', label: 'SSH Port', render: (r) => r.ssh_port },
    { key: 'environment', label: 'Environment', render: (r) => (
      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${envColors[r.environment]}`}>{environments.find((e) => e.value === r.environment)?.label}</span>
    )},
    { key: 'server_owner', label: 'Owner', render: (r) => ownerOptions.find((o) => o.value === r.server_owner)?.label ?? r.server_owner },
    { key: 'ram', label: 'RAM', render: (r) => r.ram ? <span className="flex items-center gap-1"><MemoryStick size={12} />{r.ram}</span> : '-' },
    { key: 'cpu', label: 'CPU', render: (r) => r.cpu ? <span className="flex items-center gap-1"><Cpu size={12} />{r.cpu}</span> : '-' },
    { key: 'storage', label: 'Storage', render: (r) => r.storage ? <span className="flex items-center gap-1"><StorageIcon size={12} />{r.storage}</span> : '-' },
    { key: 'os_release', label: 'OS Release', render: (r) => r.os_release ?? '-' },
    { key: 'host_location', label: 'Host Location', render: (r) => r.host_location ?? '-' },
    { key: 'created_at', label: 'Registered', sortable: true, sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => canWrite() ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
          {hasRole('admin', 'manager') && <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
        </div>
      ) : <span className="text-gray-400 text-xs">Read only</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><ServerIcon size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">Server Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered servers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Server</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'ip_address', 'os_release', 'host_location']}
          searchPlaceholder="Search by hostname, IP, OS..."
          dateFilterKey="created_at"
          emptyMessage="No servers registered yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Server' : 'Register New Server'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Server Type" required>
              <SelectInput value={form.server_type} onChange={(e) => setForm({ ...form, server_type: e.target.value as Server['server_type'] })}>
                {serverTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectInput>
            </Field>
            {form.server_type === 'other' && (
              <Field label="Specify Other Type" required>
                <TextInput value={form.server_type_other} onChange={(e) => setForm({ ...form, server_type_other: e.target.value })} placeholder="Specify server type" required />
              </Field>
            )}
            <Field label="Server Name / Hostname" required>
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="e.g., PROD-APP-01" required />
            </Field>
            <Field label="Server IP Address">
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="10.6.x.x" />
            </Field>
            <Field label="SSH Port Number">
              <TextInput type="number" value={form.ssh_port} onChange={(e) => setForm({ ...form, ssh_port: e.target.value })} placeholder="22" />
            </Field>
            <Field label="Server Environment" required>
              <SelectInput value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as Server['environment'] })}>
                {environments.map((env) => <option key={env.value} value={env.value}>{env.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Server Owner" required>
              <SelectInput value={form.server_owner} onChange={(e) => setForm({ ...form, server_owner: e.target.value as Server['server_owner'] })}>
                {ownerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
