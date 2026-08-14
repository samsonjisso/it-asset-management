"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, License } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, KeyRound, Download, AlertTriangle, CheckCircle } from 'lucide-react';

const licenseTypes = [
  { value: 'operating_system', label: 'Operating System License', subtypes: ['Windows', 'Redhat', 'Ubuntu', 'Other'] },
  { value: 'email_365', label: 'Email / 365 License', subtypes: ['MS Business Standard', 'Exchange Online', 'MS Defender', 'Other'] },
  { value: 'veam_backup', label: 'VEAM Backup License', subtypes: ['VEAM Backup & Replication', 'VEAM One', 'Other'] },
  { value: 'vmware', label: 'VMware / vCenter License', subtypes: ['vSphere', 'vCenter Server', 'ESXi', 'Other'] },
  { value: 'other', label: 'Other License', subtypes: ['Other'] },
];

const emptyForm = {
  license_type: 'operating_system' as License['license_type'],
  license_subtype: '',
  vendor: '',
  license_key: '',
  number_of_licenses: '',
  effective_date: '',
  expiry_date: '',
  notes: '',
};

export function LicenseRegistrationPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipKey, setSkipKey] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('licenses').select('*').order('created_at', { ascending: false });
    if (data) setRecords(data as License[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setSkipKey(false);
    setModalOpen(true);
  };

  const openEdit = (rec: License) => {
    setEditing(rec);
    setForm({
      license_type: rec.license_type,
      license_subtype: rec.license_subtype ?? '',
      vendor: rec.vendor ?? '',
      license_key: rec.license_key ?? '',
      number_of_licenses: rec.number_of_licenses?.toString() ?? '',
      effective_date: rec.effective_date ?? '',
      expiry_date: rec.expiry_date ?? '',
      notes: rec.notes ?? '',
    });
    setSkipKey(!rec.license_key);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      license_type: form.license_type,
      license_subtype: form.license_subtype || null,
      vendor: form.vendor || null,
      license_key: skipKey ? null : form.license_key || null,
      number_of_licenses: form.number_of_licenses ? parseInt(form.number_of_licenses) : null,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('licenses').update(payload).eq('id', editing.id)
      : await supabase.from('licenses').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'License updated' : 'License registered', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: License) => {
    if (!confirm(`Delete license "${rec.license_subtype ?? rec.license_type}"?`)) return;
    const { error } = await supabase.from('licenses').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('License deleted', 'success');
      loadData();
    }
  };

  const getExpiryStatus = (rec: License) => {
    if (!rec.expiry_date) return null;
    const days = Math.ceil((new Date(rec.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Expired', color: 'text-red-600 bg-red-50', days };
    if (days <= 30) return { label: `Expires in ${days}d`, color: 'text-amber-600 bg-amber-50', days };
    if (days <= 60) return { label: `Expires in ${days}d`, color: 'text-blue-600 bg-blue-50', days };
    return { label: 'Active', color: 'text-green-600 bg-green-50', days };
  };

  const exportCSV = () => {
    const headers = ['License Type', 'Subtype', 'Vendor', 'License Key', 'Number of Licenses', 'Effective Date', 'Expiry Date', 'Status', 'Created At'];
    const rows = records.map((r) => {
      const status = getExpiryStatus(r);
      return [
        r.license_type, r.license_subtype ?? '', r.vendor ?? '', r.license_key ?? 'N/A',
        r.number_of_licenses ?? '', r.effective_date ?? '', r.expiry_date ?? '',
        status?.label ?? 'No expiry', new Date(r.created_at).toLocaleDateString(),
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentType = licenseTypes.find((t) => t.value === form.license_type);

  const columns: Column<License>[] = [
    { key: 'license_type', label: 'License Type', sortable: true, sortValue: (r) => r.license_type, render: (r) => licenseTypes.find((t) => t.value === r.license_type)?.label ?? r.license_type },
    { key: 'license_subtype', label: 'Subtype', render: (r) => r.license_subtype ?? '-' },
    { key: 'vendor', label: 'Vendor', render: (r) => r.vendor ?? '-' },
    { key: 'license_key', label: 'License Key', render: (r) => r.license_key ? <span className="font-mono text-xs">{r.license_key.slice(0, 12)}...</span> : <span className="text-gray-400 italic">No key</span> },
    { key: 'number_of_licenses', label: 'Quantity', render: (r) => r.number_of_licenses ?? '-' },
    { key: 'effective_date', label: 'Effective', render: (r) => r.effective_date ? new Date(r.effective_date).toLocaleDateString() : '-' },
    {
      key: 'expiry_date',
      label: 'Expiry',
      sortable: true,
      sortValue: (r) => r.expiry_date ?? '9999',
      render: (r) => {
        const status = getExpiryStatus(r);
        if (!r.expiry_date) return <span className="text-gray-400">No expiry</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs">{new Date(r.expiry_date).toLocaleDateString()}</span>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 w-fit ${status.color}`}>
                {status.days <= 30 && status.days >= 0 ? <AlertTriangle size={10} /> : status.days < 0 ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                {status.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) =>
        canWrite() ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
            {hasRole('admin', 'manager') && (
              <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
            )}
          </div>
        ) : <span className="text-gray-400 text-xs">Read only</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">License Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered licenses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register License</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['license_subtype', 'vendor', 'license_key']}
          searchPlaceholder="Search by subtype, vendor, key..."
          dateFilterKey="created_at"
          emptyMessage="No licenses registered yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit License' : 'Register New License'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="License Type" required>
              <SelectInput value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value as License['license_type'], license_subtype: '' })}>
                {licenseTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="License Subtype">
              <SelectInput value={form.license_subtype} onChange={(e) => setForm({ ...form, license_subtype: e.target.value })}>
                <option value="">Select subtype</option>
                {currentType?.subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
            <Field label="Vendor (Company)">
              <TextInput value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g., Microsoft, Redhat, VMware" />
            </Field>
            <Field label="Number of Licenses">
              <TextInput type="number" min="0" value={form.number_of_licenses} onChange={(e) => setForm({ ...form, number_of_licenses: e.target.value })} placeholder="Total purchased licenses" />
            </Field>
            <Field label="Effective Date (optional)">
              <TextInput type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </Field>
            <Field label="Expiry Date">
              <TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </Field>
          </div>
          <Field label="License Key" skip onSkip={() => setSkipKey(!skipKey)}>
            <TextInput
              value={form.license_key}
              onChange={(e) => setForm({ ...form, license_key: e.target.value })}
              placeholder={skipKey ? 'Skipped (no license key for this type)' : 'License key or number'}
              disabled={skipKey}
            />
          </Field>
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update License' : 'Register License'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
