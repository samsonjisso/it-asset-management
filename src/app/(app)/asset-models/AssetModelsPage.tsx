"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase, AssetModel, DeviceType } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { Modal } from '../../../components/Modal';
import { Field, TextInput, TextArea, SelectInput, Button } from '../../../components/FormControls';
import { ImageInput } from '../../../components/ImageInput';
import { ZoomImage } from '../../../components/ZoomImage';
import { Plus, Pencil, Trash2, Boxes, Monitor, HardDrive } from 'lucide-react';

const emptyForm = { target: 'pc' as AssetModel['target'], device_type: '', name: '', manufacturer: '', image: null as string | null, notes: '' };

// Customization: define computer/device models up front (with a
// reference photo) so that when registering a PC or device, the user
// just picks the model from a dropdown instead of uploading a photo
// and typing manufacturer/model details every single time.
export function AssetModelsPage() {
  const { canWrite, hasRole } = useAuth();
  const { toast } = useToast();
  const [models, setModels] = useState<AssetModel[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pc' | 'device'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetModel | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [modelsRes, typesRes] = await Promise.all([
      supabase.from('asset_models').select('*').order('name'),
      supabase.from('device_types').select('*').order('label'),
    ]);
    if (modelsRes.data) setModels(modelsRes.data as AssetModel[]);
    if (typesRes.data) setDeviceTypes(typesRes.data as DeviceType[]);
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

  const openEdit = (m: AssetModel) => {
    setEditing(m);
    setForm({
      target: m.target,
      device_type: m.device_type ?? '',
      name: m.name,
      manufacturer: m.manufacturer ?? '',
      image: m.image ?? null,
      notes: m.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Model name is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      target: form.target,
      device_type: form.target === 'device' ? form.device_type || null : null,
      name: form.name.trim(),
      manufacturer: form.manufacturer || null,
      image: form.image,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('asset_models').update(payload).eq('id', editing.id)
      : await supabase.from('asset_models').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Model updated' : 'Model added', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (m: AssetModel) => {
    if (!confirm(`Delete model "${m.name}"?`)) return;
    const { error } = await supabase.from('asset_models').delete().eq('id', m.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Model deleted', 'success');
      loadData();
    }
  };

  const visible = models.filter((m) => filter === 'all' || m.target === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Asset Model Management</h1>
            <p className="text-sm text-gray-500">
              {models.length} model{models.length === 1 ? '' : 's'} defined — selectable (with photo) when registering a PC or device
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Model
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'pc', 'device'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f === 'pc' ? 'PC Models' : 'Device Models'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No models defined yet. Add one with a reference photo so it can be picked directly on the PC or Device
          Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {m.image ? (
                    <ZoomImage src={m.image} size={48} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {m.target === 'pc' ? <Monitor size={20} className="text-gray-300" /> : <HardDrive size={20} className="text-gray-300" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">
                      {m.target === 'pc' ? 'PC' : 'Device'}
                      {m.manufacturer ? ` · ${m.manufacturer}` : ''}
                    </p>
                  </div>
                </div>
                {canWrite() && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                      <Pencil size={16} />
                    </button>
                    {hasRole('admin') && (
                      <button onClick={() => handleDelete(m)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Model' : 'Add Model'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Register This Model Under" required>
            <SelectInput value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as AssetModel['target'] })}>
              <option value="pc">PC Registration</option>
              <option value="device">Device Registration</option>
            </SelectInput>
          </Field>
          {form.target === 'device' && (
            <Field label="Device Type" hint="Optional — narrows this model to a specific device type">
              <SelectInput value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
                <option value="">Any device type</option>
                {deviceTypes.map((t) => <option key={t.id} value={t.code}>{t.label}</option>)}
              </SelectInput>
            </Field>
          )}
          <Field label="Model Name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Dell OptiPlex 7010" required autoFocus />
          </Field>
          <Field label="Manufacturer">
            <TextInput value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g., Dell, HP, Cisco" />
          </Field>
          <ImageInput value={form.image} onChange={(dataUrl) => setForm({ ...form, image: dataUrl })} hint="Shown as the default photo when this model is selected" />
          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
