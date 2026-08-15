"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase, Asset, Department } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { DataTable, Column } from '../../../components/DataTable';
import { Modal } from '../../../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../../../components/FormControls';
import { Plus, Pencil, Trash2, Boxes, Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

const assetTypeOptions = [
  'Desktop Computer',
  'Laptop',
  'Monitor',
  'Printer',
  'Scanner',
  'Networking Equipment',
  'Server',
  'UPS',
  'Furniture',
  'Software',
  'Peripheral',
  'Mobile Device',
  'Other',
];

const emptyForm = {
  asset_name: '',
  asset_type: assetTypeOptions[0],
  department_id: '',
  owner: '',
  location: '',
  model: '',
  hostname: '',
  serial_number: '',
  manufacturer: '',
  supplier: '',
  operating_system: '',
  ip_address: '',
  notes: '',
};

// Maps flexible spreadsheet header text (lowercased, letters/digits only)
// to the asset field it represents, so the template is forgiving of
// spacing/casing/underscore differences (e.g. "Asset Type", "asset_type").
const IMPORT_HEADER_MAP: Record<string, string> = {
  assetname: 'asset_name',
  name: 'asset_name',
  assettype: 'asset_type',
  type: 'asset_type',
  department: 'department',
  departmentbranch: 'department',
  branch: 'department',
  owner: 'owner',
  location: 'location',
  model: 'model',
  hostname: 'hostname',
  serialnumber: 'serial_number',
  serial: 'serial_number',
  manufacturer: 'manufacturer',
  supplier: 'supplier',
  vendor: 'supplier',
  operatingsystem: 'operating_system',
  os: 'operating_system',
  ipaddress: 'ip_address',
  ip: 'ip_address',
  notes: 'notes',
  note: 'notes',
};

const IMPORT_TEMPLATE_HEADERS = [
  'Asset Name', 'Asset Type', 'Department', 'Owner', 'Location', 'Model',
  'Hostname', 'Serial Number', 'Manufacturer', 'Supplier', 'Operating System',
  'IP Address', 'Notes',
];

function normalizeHeader(h: string) {
  return String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export function AssetsPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [assetRes, deptRes] = await Promise.all([
      supabase.from('assets').select('*, department:departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (assetRes.data) setRecords(assetRes.data as Asset[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
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

  const openEdit = (rec: Asset) => {
    setEditing(rec);
    setForm({
      asset_name: rec.asset_name,
      asset_type: rec.asset_type,
      department_id: rec.department_id ?? '',
      owner: rec.owner ?? '',
      location: rec.location ?? '',
      model: rec.model ?? '',
      hostname: rec.hostname ?? '',
      serial_number: rec.serial_number ?? '',
      manufacturer: rec.manufacturer ?? '',
      supplier: rec.supplier ?? '',
      operating_system: rec.operating_system ?? '',
      ip_address: rec.ip_address ?? '',
      notes: rec.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_name || !form.asset_type) {
      toast('Asset name and asset type are required', 'error');
      return;
    }
    if (!form.department_id) {
      toast('Department is required for all asset entries', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      department_id: form.department_id || null,
      owner: form.owner || null,
      location: form.location || null,
      model: form.model || null,
      hostname: form.hostname || null,
      serial_number: form.serial_number || null,
      manufacturer: form.manufacturer || null,
      supplier: form.supplier || null,
      operating_system: form.operating_system || null,
      ip_address: form.ip_address || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from('assets').update(payload).eq('id', editing.id)
      : await supabase.from('assets').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(editing ? 'Asset updated' : 'Asset registered', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Asset) => {
    if (!confirm(`Delete asset "${rec.asset_name}"?`)) return;
    const { error } = await supabase.from('assets').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Asset deleted', 'success');
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = ['Asset Name', 'Asset Type', 'Department', 'Owner', 'Location', 'Model', 'Hostname', 'Serial Number', 'Manufacturer', 'Supplier', 'Operating System', 'IP Address', 'Registered'];
    const rows = records.map((r) => [
      r.asset_name, r.asset_type, r.department?.name ?? '', r.owner ?? '', r.location ?? '', r.model ?? '',
      r.hostname ?? '', r.serial_number ?? '', r.manufacturer ?? '', r.supplier ?? '', r.operating_system ?? '',
      r.ip_address ?? '', new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      IMPORT_TEMPLATE_HEADERS,
      ['HQ Front Desk Laptop', 'Laptop', departments[0]?.name ?? 'IT Department', 'Jane Doe', '3rd Floor', 'Latitude 5420', 'PC-HQ-010', 'SVC-TAG-001', 'Dell', 'Dell Ethiopia', 'Windows 11 Pro', '10.6.1.10', 'Optional notes'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, 'asset_registration_template.xlsx');
  };

  function validateRow(raw: Record<string, string>, rowNumber: number): ImportRow {
    const errors: string[] = [];

    const assetName = (raw.asset_name || '').trim();
    if (!assetName) errors.push('Asset Name is required');

    const rawType = (raw.asset_type || '').trim();
    const matchedType = assetTypeOptions.find((t) => t.toLowerCase() === rawType.toLowerCase());
    if (!rawType) errors.push('Asset Type is required');
    else if (!matchedType) errors.push(`Unrecognized Asset Type "${rawType}"`);

    let departmentId = '';
    const rawDept = (raw.department || '').trim();
    if (rawDept) {
      const matchedDept = departments.find((d) => d.name.toLowerCase() === rawDept.toLowerCase());
      if (!matchedDept) errors.push(`Unknown Department "${rawDept}"`);
      else departmentId = matchedDept.id;
    }

    const rawIp = (raw.ip_address || '').trim();
    if (rawIp && !IPV4_RE.test(rawIp)) errors.push(`Invalid IP Address "${rawIp}"`);

    return {
      rowNumber,
      data: {
        asset_name: assetName,
        asset_type: matchedType || rawType,
        department_id: departmentId,
        department_label: rawDept,
        owner: (raw.owner || '').trim(),
        location: (raw.location || '').trim(),
        model: (raw.model || '').trim(),
        hostname: (raw.hostname || '').trim(),
        serial_number: (raw.serial_number || '').trim(),
        manufacturer: (raw.manufacturer || '').trim(),
        supplier: (raw.supplier || '').trim(),
        operating_system: (raw.operating_system || '').trim(),
        ip_address: rawIp,
        notes: (raw.notes || '').trim(),
      },
      errors,
    };
  }

  const handleFileSelected = async (file: File) => {
    setImportFileName(file.name);
    setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (raw.length === 0) {
        toast('The selected file has no data rows', 'error');
        setImportRows([]);
        return;
      }

      const rows = raw.map((r, idx) => {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(r)) {
          const field = IMPORT_HEADER_MAP[normalizeHeader(key)];
          if (field) normalized[field] = String(value ?? '').trim();
        }
        return validateRow(normalized, idx + 2); // +2: header row + 1-based
      });
      setImportRows(rows);
    } catch {
      toast('Could not read that file. Please upload a valid .xlsx or .csv file.', 'error');
      setImportRows([]);
    }
  };

  const validImportRows = importRows.filter((r) => r.errors.length === 0);
  const invalidImportRows = importRows.filter((r) => r.errors.length > 0);

  const confirmImport = async () => {
    if (validImportRows.length === 0) return;
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const row of validImportRows) {
      const { department_label, ...rest } = row.data;
      void department_label;
      const payload = {
        ...rest,
        department_id: rest.department_id || null,
        owner: rest.owner || null,
        location: rest.location || null,
        model: rest.model || null,
        hostname: rest.hostname || null,
        serial_number: rest.serial_number || null,
        manufacturer: rest.manufacturer || null,
        supplier: rest.supplier || null,
        operating_system: rest.operating_system || null,
        ip_address: rest.ip_address || null,
        notes: rest.notes || null,
        registered_by: profile?.id,
      };
      const { error } = await supabase.from('assets').insert(payload);
      if (error) failed += 1;
      else success += 1;
    }
    setImporting(false);
    setImportResult({ success, failed });
    if (success > 0) loadData();
    if (failed === 0) {
      toast(`Imported ${success} asset${success === 1 ? '' : 's'} successfully`, 'success');
    } else {
      toast(`Imported ${success} asset(s), ${failed} failed on save`, 'warning');
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportRows([]);
    setImportFileName('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const columns: Column<Asset>[] = [
    { key: 'asset_name', label: 'Asset Name', sortable: true, sortValue: (r) => r.asset_name },
    { key: 'asset_type', label: 'Asset Type', sortable: true, sortValue: (r) => r.asset_type },
    { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
    { key: 'owner', label: 'Owner', render: (r) => r.owner ?? '-' },
    { key: 'location', label: 'Location', render: (r) => r.location ?? '-' },
    { key: 'model', label: 'Model', render: (r) => r.model ?? '-' },
    { key: 'hostname', label: 'Hostname', render: (r) => r.hostname ?? '-' },
    { key: 'serial_number', label: 'Serial Number', render: (r) => r.serial_number ?? '-' },
    { key: 'manufacturer', label: 'Manufacturer', render: (r) => r.manufacturer ?? '-' },
    { key: 'supplier', label: 'Supplier', render: (r) => r.supplier ?? '-' },
    { key: 'operating_system', label: 'Operating System', render: (r) => r.operating_system ?? '-' },
    { key: 'ip_address', label: 'IP Address', render: (r) => r.ip_address ?? '-' },
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
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><Boxes size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">Asset Registration</h1>
            <p className="text-sm text-gray-500">{records.length} registered assets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={16} /> Export CSV</Button>
          {canWrite() && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> Import Excel
            </Button>
          )}
          {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Register Asset</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['asset_name', 'asset_type', 'hostname', 'serial_number', 'manufacturer', 'supplier', 'owner', 'ip_address']}
          searchPlaceholder="Search by name, type, hostname, serial, owner, IP..."
          dateFilterKey="created_at"
          emptyMessage="No assets registered yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Asset' : 'Register New Asset'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Asset Name" required>
              <TextInput value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} placeholder="e.g., HQ Front Desk Laptop" required />
            </Field>
            <Field label="Asset Type" required>
              <SelectInput value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                {assetTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectInput>
            </Field>
            <Field label="Department" required>
              <SelectInput value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Select department/branch</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} {d.is_branch ? '(Branch)' : ''}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Owner">
              <TextInput value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Employee or team responsible" />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Datacenter, floor, or branch" />
            </Field>
            <Field label="Model">
              <TextInput value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g., Latitude 5420" />
            </Field>
            <Field label="Hostname">
              <TextInput value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} placeholder="Hostname (if applicable)" />
            </Field>
            <Field label="Serial Number">
              <TextInput value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial number" />
            </Field>
            <Field label="Manufacturer">
              <TextInput value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g., Dell, HP, Cisco" />
            </Field>
            <Field label="Supplier">
              <TextInput value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Vendor / supplier name" />
            </Field>
            <Field label="Operating System">
              <TextInput value={form.operating_system} onChange={(e) => setForm({ ...form, operating_system: e.target.value })} placeholder="e.g., Windows 11 Pro" />
            </Field>
            <Field label="IP Address">
              <TextInput value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="10.6.x.x" />
            </Field>
          </div>
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Asset' : 'Register Asset'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={closeImport} title="Import Assets from Excel" size="xl">
        <div className="space-y-4">
          {importRows.length === 0 ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-[#f5f5fc] border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  Upload an <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file. The first
                  row must contain column headers (Asset Name, Asset Type, Department, Owner, Location, Model,
                  Hostname, Serial Number, Manufacturer, Supplier, Operating System, IP Address, Notes).
                </div>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
                  <Download size={16} /> Download Template
                </Button>
              </div>
              <Field label="Excel / CSV File" required>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  className="gbb-input w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm"
                />
              </Field>
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={closeImport}>Cancel</Button>
              </div>
            </>
          ) : importResult ? (
            <>
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle2 className="text-green-600 shrink-0" size={22} />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-green-800">Import complete</p>
                  <p>{importResult.success} asset(s) registered successfully.</p>
                  {importResult.failed > 0 && (
                    <p className="text-amber-700">{importResult.failed} row(s) failed while saving to the server.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <Button type="button" variant="primary" onClick={closeImport}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-gray-500">File: <strong>{importFileName}</strong></span>
                <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  <CheckCircle2 size={14} /> {validImportRows.length} valid
                </span>
                {invalidImportRows.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                    <AlertTriangle size={14} /> {invalidImportRows.length} with errors (won't be imported)
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Row</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Asset Name</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Asset Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Department</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((r) => (
                      <tr key={r.rowNumber} className={`border-t border-gray-100 ${r.errors.length ? 'bg-red-50/60' : ''}`}>
                        <td className="px-3 py-2 text-gray-500">{r.rowNumber}</td>
                        <td className="px-3 py-2">{r.data.asset_name || <span className="text-gray-400 italic">blank</span>}</td>
                        <td className="px-3 py-2">{r.data.asset_type || <span className="text-gray-400 italic">blank</span>}</td>
                        <td className="px-3 py-2">{r.data.department_label || '-'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0 ? (
                            <span className="text-green-700">Ready</span>
                          ) : (
                            <span className="text-red-700">{r.errors.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setImportRows([]); setImportFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  Choose a different file
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={closeImport}>Cancel</Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={validImportRows.length === 0 || importing}
                    onClick={confirmImport}
                  >
                    {importing ? 'Importing...' : `Import ${validImportRows.length} Asset${validImportRows.length === 1 ? '' : 's'}`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
