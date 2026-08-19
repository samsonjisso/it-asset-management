"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase, IPSubnet } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Field, TextInput, TextArea, Button } from '../components/FormControls';
import { isValidIPPrefix, digitsAndDotsKeyDown } from '../lib/validation';
import { Plus, Pencil, Trash2, Network } from 'lucide-react';

const emptyForm = { prefix: '', label: '', notes: '' };

// Customization: lets an admin define IP subnet prefixes (e.g. "10.6.13.")
// and label them (e.g. "Head Office - Server Room"), so registration
// forms with an IP address field (starting with Server Registration)
// can automatically show which network segment an entered IP belongs to.
export function IPSubnetsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPSubnet | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ip_subnets').select('*').order('prefix');
    if (data) setSubnets(data as IPSubnet[]);
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

  const openEdit = (s: IPSubnet) => {
    setEditing(s);
    setForm({ prefix: s.prefix, label: s.label, notes: s.notes ?? '' });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prefix.trim() || !form.label.trim()) {
      toast('IP prefix and label are required', 'error');
      return;
    }
    if (!isValidIPPrefix(form.prefix)) {
      toast('IP prefix must contain only numbers and dots, e.g. 10.6.13.', 'error');
      return;
    }
    setSaving(true);
    const payload = { prefix: form.prefix.trim(), label: form.label.trim(), notes: form.notes || null };
    const { error } = editing
      ? await supabase.from('ip_subnets').update(payload).eq('id', editing.id)
      : await supabase.from('ip_subnets').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Subnet updated' : 'Subnet added', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (s: IPSubnet) => {
    if (!confirm(`Delete subnet "${s.prefix}" (${s.label})?`)) return;
    const { error } = await supabase.from('ip_subnets').delete().eq('id', s.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Subnet deleted', 'success');
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">IP Subnet Management</h1>
            <p className="text-sm text-gray-500">
              {subnets.length} subnet{subnets.length === 1 ? '' : 's'} defined — used to identify which network an IP address belongs to
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Subnet
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : subnets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No subnets defined yet. Add one, e.g. prefix "10.6.13." labeled "Head Office - Server Room", and IP
          addresses starting with that prefix will be identified automatically on the Server Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subnets.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Network size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-gray-800">{s.prefix}*</p>
                    <p className="text-sm text-gray-600 truncate">{s.label}</p>
                    {s.notes && <p className="text-xs text-gray-400 truncate">{s.notes}</p>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subnet' : 'Add Subnet'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="IP Prefix" required hint='e.g., "10.6.13." matches any IP starting with 10.6.13'>
            <TextInput value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} onKeyDown={digitsAndDotsKeyDown} placeholder="10.6.13." required autoFocus />
          </Field>
          <Field label="Label" required hint="What this subnet is / where it is">
            <TextInput value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g., Head Office - Server Room" required />
          </Field>
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
