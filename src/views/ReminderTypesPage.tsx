"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase, ReminderType } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Field, TextInput, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, BellRing } from 'lucide-react';

export function ReminderTypesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const [types, setTypes] = useState<ReminderType[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderType | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reminder_types').select('*').order('label');
    if (data) setTypes(data as ReminderType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setLabel('');
    setModalOpen(true);
  };

  const openEdit = (t: ReminderType) => {
    setEditing(t);
    setLabel(t.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast('Name is required', 'error');
      return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase.from('reminder_types').update({ label: label.trim() }).eq('id', editing.id)
      : await supabase.from('reminder_types').insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Reminder type updated' : 'Reminder type created', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (t: ReminderType) => {
    if (!confirm(`Delete reminder type "${t.label}"?`)) return;
    const { error } = await supabase.from('reminder_types').delete().eq('id', t.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Reminder type deleted', 'success');
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <BellRing size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Reminder Type Management</h1>
            <p className="text-sm text-gray-500">
              {types.length} reminder type{types.length === 1 ? '' : 's'} available on the Reminders form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Reminder Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No reminder types yet. Add one to make it available on the Reminders form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <BellRing size={20} />
                  </div>
                  <p className="font-semibold text-gray-800">{t.label}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Rename">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(t)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Rename Reminder Type' : 'Add Reminder Type'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name" required hint="e.g., Certificate Renewal, Vendor Contract Review">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Certificate Renewal" required autoFocus />
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
