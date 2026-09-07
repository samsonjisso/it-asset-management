'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, PatchLevel } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Field, TextInput, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

// Patch / Level Number Customization (Customization > Patch / Level
// Numbers, admin-managed): a single shared list of values used by
// BOTH the PC Registration form's "Patch / Level Number" field AND
// the IP Management form's "Patch Panel Label / Number" field, rather
// than free text or two separate lists — mirrors the
// AccessSwitchesPage pattern exactly.
export function PatchLevelsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const [levels, setLevels] = useState<PatchLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PatchLevel | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('patch_levels').select('*').order('label');
    if (data) setLevels(data as PatchLevel[]);
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

  const openEdit = (l: PatchLevel) => {
    setEditing(l);
    setLabel(l.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast('Value is required', 'error');
      return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase.from('patch_levels').update({ label: label.trim() }).eq('id', editing.id)
      : await supabase.from('patch_levels').insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Patch/level value updated' : 'Patch/level value added', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (l: PatchLevel) => {
    if (!confirm(`Delete patch/level value "${l.label}"?`)) return;
    const { error } = await supabase.from('patch_levels').delete().eq('id', l.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Patch/level value deleted', 'success');
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Tag size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Patch / Level Number Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {levels.length} value{levels.length === 1 ? '' : 's'} available on the PC Registration and IP Management forms
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Patch/Level Value
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : levels.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No patch/level values yet. Add one to make it available on the PC Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((l) => (
            <div key={l.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                    <Tag size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{l.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{l.code}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(l)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg" title="Rename">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(l)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Rename Patch/Level Value' : 'Add Patch/Level Value'} size="sm">
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field label="Value" required hint="e.g., Patch 12, Level 3, 2026-Q1">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Patch 12" required autoFocus />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
