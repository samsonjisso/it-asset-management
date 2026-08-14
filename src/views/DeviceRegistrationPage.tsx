"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, Device } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, HardDrive, Download, Network, Server, Wifi, Router, Shield, Wind, Battery, Tv, Server as Rack, Camera, Printer, ScanLine, Boxes, Monitor } from 'lucide-react';
import { ReactNode } from 'react';

const deviceTypes: { value: string; label: string; icon: ReactNode }[] = [
  { value: 'network', label: 'Network Device', icon: <Network size={18} /> },
  { value: 'physical_server', label: 'Physical Server', icon: <Server size={18} /> },
  { value: 'storage_server', label: 'Storage Server', icon: <Boxes size={18} /> },
  { value: 'wifi_access_point', label: 'WiFi Access Point', icon: <Wifi size={18} /> },
  { value: 'core_switch', label: 'Core Switch', icon: <Network size={18} /> },
  { value: 'access_switch', label: 'Access Switch', icon: <Network size={18} /> },
  { value: 'ethiotelecom_epon', label: 'Ethiotelecom EPON', icon: <Wifi size={18} /> },
  { value: 'ethiotelecom_gpon', label: 'Ethiotelecom GPON', icon: <Wifi size={18} /> },
  { value: 'edge_router', label: 'Edge Router', icon: <Router size={18} /> },
  { value: 'distribution_switch', label: 'Distribution Switch', icon: <Network size={18} /> },
  { value: 'fire_extinguisher', label: 'Fire Extinguisher', icon: <Shield size={18} /> },
  { value: 'ac', label: 'AC Unit', icon: <Wind size={18} /> },
  { value: 'ups', label: 'UPS', icon: <Battery size={18} /> },
  { value: 'monitoring_tv', label: 'Monitoring TV', icon: <Tv size={18} /> },
  { value: 'rack', label: 'Rack', icon: <Rack size={18} /> },
  { value: 'cctv_camera', label: 'CCTV Camera', icon: <Camera size={18} /> },
  { value: 'digital_signage', label: 'Digital Signage', icon: <Monitor size={18} /> },
  { value: 'printer_photocopy', label: 'Printer / Photocopier', icon: <Printer size={18} /> },
  { value: 'check_scanner', label: 'Check Scanner', icon: <ScanLine size={18} /> },
  { value: 'normal_scanner', label: 'Normal Scanner', icon: <ScanLine size={18} /> },
];

const ownerOptions = [
  { value: 'infrastructure_management', label: 'Infrastructure Management' },
  { value: 'application_management', label: 'Application Management' },
  { value: 'information_security', label: 'Information Security' },
];

const emptyForm = {
  device_type: 'network',
  device_owner: 'infrastructure_management' as Device['device_owner'],
  device_model: '',
  hostname: '',
  ip_address: '',
  serial_number: '',
  mac_address: '',
  location: '',
  rack_number: '',
  notes: '',
};

export function DeviceRegistrationPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipIP, setSkipIP] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data) setRecords(data as Device[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setSkipIP(false);
    setModalOpen(true);
  };

  const openEdit = (rec: Device) => {
    setEditing(rec);
    setForm({
      device_type: rec.device_type,
      device_owner: rec.device_owner,
      device_model: rec.device_model ?? '',
      hostname: rec.hostname,
      ip_address: rec.ip_address ?? '',
      serial_number: rec.serial_number ?? '',
      mac_address: rec.mac_address ?? '',
      location: rec.location ?? '',
      rack_number: rec.rack_number ?? '',
      notes: rec.notes ?? '',
    });
    setSkipIP(!rec.ip_address);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast('Hostname is required (use serial number if device has no hostname)', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      ip_address: skipIP ? null : form.ip_address || null,
      device_model: form.device_model || null,
      serial_number: form.serial_number || null,
      mac_address: form.mac_address || null,
      location: form.location || null,
      rack_number: form.rack_number || null,
      notes: form.notes || null,
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
    const headers = ['Device Type', 'Owner', 'Model', 'Hostname', 'IP Address', 'Serial Number', 'MAC Address', 'Location', 'Rack Number', 'Created At'];
    const rows = records.map((r) => [
      deviceTypes.find((t) => t.value === r.device_type)?.label ?? r.device_type,
      ownerOptions.find((o) => o.value === r.device_owner)?.label ?? r.device_owner,
      r.device_model ?? '', r.hostname, r.ip_address ?? '', r.serial_number ?? '', r.mac_address ?? '',
      r.location ?? '', r.rack_number ?? '', new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: string) => deviceTypes.find((t) => t.value === type)?.icon ?? <HardDrive size={16} />;

  const columns: Column<Device>[] = [
    { key: 'device_type', label: 'Type', sortable: true, sortValue: (r) => r.device_type, render: (r) => (
      <div className="flex items-center gap-2">
        <span className="text-[#343494]">{getDeviceIcon(r.device_type)}</span>
        <span>{deviceTypes.find((t) => t.value === r.device_type)?.label ?? r.device_type}</span>
      </div>
    )},
    { key: 'device_owner', label: 'Owner', render: (r) => ownerOptions.find((o) => o.value === r.device_owner)?.label ?? r.device_owner },
    { key: 'device_model', label: 'Model', render: (r) => r.device_model ?? '-' },
    { key: 'hostname', label: 'Hostname', sortable: true, sortValue: (r) => r.hostname },
    { key: 'ip_address', label: 'IP Address', render: (r) => r.ip_address ?? <span className="text-gray-400 italic">N/A</span> },
    { key: 'serial_number', label: 'Serial Number', render: (r) => r.serial_number ?? '-' },
    { key: 'location', label: 'Location', render: (r) => r.location ?? '-' },
    { key: 'rack_number', label: 'Rack', render: (r) => r.rack_number ?? '-' },
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
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><HardDrive size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">Device Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered devices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Device</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['hostname', 'serial_number', 'ip_address', 'device_model', 'location']}
          searchPlaceholder="Search by hostname, serial, IP, model..."
          dateFilterKey="created_at"
          emptyMessage="No devices registered yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Device' : 'Register New Device'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Device type grid selector */}
          <Field label="Device Type" required>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {deviceTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, device_type: t.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                    form.device_type === t.value
                      ? 'border-[#343494] bg-[#343494] text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#343494]/40 hover:bg-gray-50'
                  }`}
                >
                  {t.icon}
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Device Owner / Department" required>
              <SelectInput value={form.device_owner} onChange={(e) => setForm({ ...form, device_owner: e.target.value as Device['device_owner'] })}>
                {ownerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Device Model (Detail Specification)">
              <TextInput value={form.device_model} onChange={(e) => setForm({ ...form, device_model: e.target.value })} placeholder="e.g., Dell PowerEdge R740" />
            </Field>
            <Field label="Device Hostname" required>
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="Insert serial number if no hostname" required />
            </Field>
            <Field label="Device IP Address" skip onSkip={() => setSkipIP(!skipIP)}>
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder={skipIP ? 'Skipped' : 'IP address'} disabled={skipIP} />
            </Field>
            <Field label="Device Serial Number">
              <TextInput value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial number" />
            </Field>
            <Field label="Device MAC Address">
              <TextInput value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="MAC address" />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Datacenter, floor, or branch" />
            </Field>
            <Field label="Rack Number">
              <TextInput value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} placeholder="e.g., 1, 2, 3" />
            </Field>
          </div>
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
