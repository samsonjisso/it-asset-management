"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, Department } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Field, TextInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Building2, MapPin } from 'lucide-react';

export function DepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', is_branch: false, description: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data as Department[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', is_branch: false, description: '' });
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({ name: dept.name, is_branch: dept.is_branch, description: dept.description ?? '' });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast('Department name is required', 'error');
      return;
    }
    setSaving(true);
    const payload = { name: form.name, is_branch: form.is_branch, description: form.description || null };
    const { error } = editing
      ? await supabase.from('departments').update(payload).eq('id', editing.id)
      : await supabase.from('departments').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(editing ? 'Department updated' : 'Department created', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    const { error } = await supabase.from('departments').delete().eq('id', dept.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Department deleted', 'success');
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><Building2 size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">Departments & Branches</h1>
            <p className="text-sm text-gray-500">{departments.length} departments/branches</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Add Department</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 gbb-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dept.is_branch ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {dept.is_branch ? <MapPin size={20} /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{dept.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dept.is_branch ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {dept.is_branch ? 'Branch' : 'Department'}
                    </span>
                  </div>
                </div>
              </div>
              {dept.description && <p className="text-sm text-gray-600 mt-3">{dept.description}</p>}
              <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => openEdit(dept)} className="flex-1"><Pencil size={14} /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(dept)} className="flex-1 text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department/Branch'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., IT Department, Hawassa Branch" required />
          </Field>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_branch"
              checked={form.is_branch}
              onChange={(e) => setForm({ ...form, is_branch: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-[#343494] focus:ring-[#343494]"
            />
            <label htmlFor="is_branch" className="text-sm font-medium text-gray-700">This is a branch location</label>
          </div>
          <Field label="Description">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
