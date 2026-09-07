'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, DeviceType, DeviceTypeField } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { TextInput, Button } from '../components/FormControls';
import { DeviceFieldEditor } from '../components/DeviceFieldEditor';
import { Plus, Pencil, Trash2, Check, HardDrive } from 'lucide-react';
import {
  ICON_OPTIONS,
  ALL_STD_FIELDS,
  ALL_CORE_FIELDS,
  STD_FIELD_META,
  parseBaseFields,
  parseRequiredBaseFields,
  parseCoreFields,
  parseRequiredCoreFields,
  parseFieldLabels,
  parseExtraFields,
  getDeviceTypeIcon,
} from '../lib/deviceTypeFields';

// Device Type Management (Customization): the set of device types
// offered on the Device Registration form, and every field each one
// shows — including Device Owner, Device Model and Hostname, which
// used to be fixed on every type — is configured here rather than
// inline on the registration form, so it can be managed separately
// and existing types can be edited without opening a "Register
// Device" form first.
export function DeviceTypesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('HardDrive');
  const [baseFields, setBaseFields] = useState<string[]>([]);
  const [requiredBaseFields, setRequiredBaseFields] = useState<string[]>([]);
  const [coreFields, setCoreFields] = useState<string[]>(ALL_CORE_FIELDS);
  const [requiredCoreFields, setRequiredCoreFields] = useState<string[]>(['device_owner', 'hostname']);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [editingStdFieldKey, setEditingStdFieldKey] = useState<string | null>(null);
  const [editingStdFieldLabel, setEditingStdFieldLabel] = useState('');
  const [extraFields, setExtraFields] = useState<DeviceTypeField[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('device_types').select('*').order('label');
    if (data) setDeviceTypes(data as DeviceType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetEditor = () => {
    setEditorMode('create');
    setEditingTypeId(null);
    setLabel('');
    setIcon('HardDrive');
    setBaseFields([]);
    setRequiredBaseFields([]);
    setCoreFields(ALL_CORE_FIELDS);
    setRequiredCoreFields(['device_owner', 'hostname']);
    setFieldLabels({});
    setEditingStdFieldKey(null);
    setEditingStdFieldLabel('');
    setExtraFields([]);
  };

  const openAdd = () => {
    resetEditor();
    setModalOpen(true);
  };

  const openEdit = (type: DeviceType) => {
    setEditorMode('edit');
    setEditingTypeId(type.id);
    setLabel(type.label);
    setIcon(type.icon || 'HardDrive');
    setBaseFields(parseBaseFields(type));
    setRequiredBaseFields(parseRequiredBaseFields(type));
    setCoreFields(parseCoreFields(type));
    setRequiredCoreFields(parseRequiredCoreFields(type));
    setFieldLabels(parseFieldLabels(type));
    setEditingStdFieldKey(null);
    setEditingStdFieldLabel('');
    setExtraFields(parseExtraFields(type));
    setModalOpen(true);
  };

  const toggleBaseField = (key: string) => {
    setBaseFields((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (!next.includes(key)) setRequiredBaseFields((r) => r.filter((k) => k !== key));
      return next;
    });
  };

  const toggleRequiredBaseField = (key: string) => {
    setRequiredBaseFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleCoreField = (key: string) => {
    setCoreFields((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (!next.includes(key)) setRequiredCoreFields((r) => r.filter((k) => k !== key));
      return next;
    });
  };

  const toggleRequiredCoreField = (key: string) => {
    setRequiredCoreFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // Unified helpers so the editor can treat core fields (Owner/Model/
  // Hostname) and base fields (IP/Serial/MAC/Location/Rack) identically
  // for include/require/rename.
  const isCoreField = (key: string) => ALL_CORE_FIELDS.includes(key);
  const stdFieldIncluded = (key: string) => (isCoreField(key) ? coreFields.includes(key) : baseFields.includes(key));
  const stdFieldRequired = (key: string) => (isCoreField(key) ? requiredCoreFields.includes(key) : requiredBaseFields.includes(key));
  const toggleStdFieldIncluded = (key: string) => (isCoreField(key) ? toggleCoreField(key) : toggleBaseField(key));
  const toggleStdFieldRequired = (key: string) => (isCoreField(key) ? toggleRequiredCoreField(key) : toggleRequiredBaseField(key));
  const stdFieldLabel = (key: string) => fieldLabels[key] ?? STD_FIELD_META[key].label;

  const startRenameStdField = (key: string) => {
    setEditingStdFieldKey(key);
    setEditingStdFieldLabel(stdFieldLabel(key));
  };

  const cancelRenameStdField = () => {
    setEditingStdFieldKey(null);
    setEditingStdFieldLabel('');
  };

  const saveRenameStdField = () => {
    const newLabel = editingStdFieldLabel.trim();
    if (!editingStdFieldKey) {
      cancelRenameStdField();
      return;
    }
    setFieldLabels((prev) => {
      const next = { ...prev };
      if (!newLabel || newLabel === STD_FIELD_META[editingStdFieldKey].label) delete next[editingStdFieldKey];
      else next[editingStdFieldKey] = newLabel;
      return next;
    });
    cancelRenameStdField();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast('Device type name is required', 'error');
      return;
    }
    const exists = deviceTypes.some(
      (t) => t.label.toLowerCase() === trimmedLabel.toLowerCase() && t.id !== editingTypeId
    );
    if (exists) {
      toast('That device type already exists', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      label: trimmedLabel,
      icon,
      base_fields: JSON.stringify(baseFields),
      required_base_fields: JSON.stringify(requiredBaseFields),
      core_fields: JSON.stringify(coreFields),
      required_core_fields: JSON.stringify(requiredCoreFields),
      field_labels: JSON.stringify(fieldLabels),
      fields: JSON.stringify(extraFields),
    };
    const { data, error } =
      editorMode === 'edit' && editingTypeId
        ? await supabase.from('device_types').update(payload).eq('id', editingTypeId)
        : await supabase.from('device_types').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    const saved = data as DeviceType;
    toast(editorMode === 'edit' ? 'Device type updated' : 'Device type added', 'success');
    setDeviceTypes((prev) => {
      const next = editorMode === 'edit' ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
      return next.sort((a, b) => a.label.localeCompare(b.label));
    });
    setModalOpen(false);
    resetEditor();
  };

  const handleDelete = async (type: DeviceType) => {
    if (!confirm(`Delete device type "${type.label}"? Devices already registered under it are unaffected, but this type — and its fields — won't be selectable anymore.`)) return;
    const { error } = await supabase.from('device_types').delete().eq('id', type.id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Device type deleted', 'success');
    setDeviceTypes((prev) => prev.filter((t) => t.id !== type.id));
    if (modalOpen && editingTypeId === type.id) {
      setModalOpen(false);
      resetEditor();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <HardDrive size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Device Type Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {deviceTypes.length} device type{deviceTypes.length === 1 ? '' : 's'} available on the Device Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Device Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : deviceTypes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No device types yet. Add one to make it available on the Device Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deviceTypes.map((t) => {
            const tCoreFields = parseCoreFields(t);
            const tBaseFields = parseBaseFields(t);
            const tExtraFields = parseExtraFields(t);
            const fieldCount = tCoreFields.length + tBaseFields.length + tExtraFields.length;
            return (
              <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                      {getDeviceTypeIcon(deviceTypes, t.code)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{t.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {fieldCount} field{fieldCount === 1 ? '' : 's'} · <span className="font-mono">{t.code}</span>
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="Edit fields">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editorMode === 'edit' ? `Editing "${label || 'this type'}"` : 'Add Device Type'} size="lg">
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-2">
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Device type name, e.g., Biometric Scanner"
              autoFocus
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Choose an icon</p>
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-32 overflow-y-auto p-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-brand-600">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  title={opt.name}
                  onClick={() => setIcon(opt.name)}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                    icon === opt.name
                      ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {opt.icon}
                  {icon === opt.name && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gold-400 text-brand-950 flex items-center justify-center">
                      <Check size={9} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Standard fields — click the toggle to include/remove one, click its name to rename it, or click
              the <span className="font-semibold text-red-500">*</span> badge to mark it mandatory. These cover
              Device Owner, Device Model and Hostname as well as IP/Serial/MAC/Location/Rack.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STD_FIELDS.map((key) => {
                const included = stdFieldIncluded(key);
                const required = stdFieldRequired(key);
                const fLabel = stdFieldLabel(key);
                if (editingStdFieldKey === key) {
                  return (
                    <span key={key} className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-lg bg-white dark:bg-gray-900 border border-brand-300">
                      <TextInput
                        value={editingStdFieldLabel}
                        onChange={(e) => setEditingStdFieldLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); saveRenameStdField(); }
                          if (e.key === 'Escape') { e.preventDefault(); cancelRenameStdField(); }
                        }}
                        autoFocus
                        className="!py-1 !px-2 text-xs w-36"
                      />
                      <button type="button" onClick={saveRenameStdField} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand-50 dark:hover:bg-brand-900/40 text-brand-600" title="Save">
                        <Check size={12} />
                      </button>
                      <button type="button" onClick={cancelRenameStdField} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500" title="Cancel">
                        ×
                      </button>
                    </span>
                  );
                }
                return (
                  <span
                    key={key}
                    className={`relative inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      included
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-brand-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStdFieldIncluded(key)}
                      title={included ? 'Included — click to remove' : 'Not included — click to add'}
                      className={`w-4 h-4 flex items-center justify-center rounded-full border ${
                        included ? 'border-white/60 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-brand-400 hover:text-brand-600'
                      }`}
                    >
                      {included ? <Check size={10} /> : <Plus size={10} />}
                    </button>
                    <button type="button" onClick={() => startRenameStdField(key)} title="Rename field" className="hover:underline underline-offset-2">
                      {fLabel}
                    </button>
                    {included && (
                      <button
                        type="button"
                        onClick={() => toggleStdFieldRequired(key)}
                        title={required ? 'Mandatory — click to make optional' : 'Optional — click to make mandatory'}
                        className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center border shadow-sm ${
                          required
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:border-red-300'
                        }`}
                      >
                        *
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Your own fields — add exactly what this type needs. Choose from 19 field types (including
              Dropdown, Multi-select, Image, File Upload, and Employee/Department/Branch selection), set
              which are mandatory, and reorder them with the arrows — no development work required.
            </p>
            <DeviceFieldEditor fields={extraFields} onChange={setExtraFields} />
          </div>
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            {editorMode === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  const type = deviceTypes.find((t) => t.id === editingTypeId);
                  if (type) handleDelete(type);
                }}
                className="text-xs font-medium text-red-500 hover:text-red-600 inline-flex items-center gap-1"
              >
                <Trash2 size={13} /> Delete this device type
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editorMode === 'edit' ? 'Save Changes' : 'Add Device Type'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
