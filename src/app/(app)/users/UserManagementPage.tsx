"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile, UserRole } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { Modal } from '../../../components/Modal';
import { Field, TextInput, SelectInput, Button } from '../../../components/FormControls';
import { Plus, Pencil, Users, UserCheck, UserX, Mail } from 'lucide-react';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'register_user', label: 'Register User' },
  { value: 'assessor', label: 'Assessor (Read Only)' },
];

export function UserManagementPage() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'register_user' as UserRole, phone: '' });
  const [editForm, setEditForm] = useState({ full_name: '', role: 'register_user' as UserRole, phone: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast('All fields are required', 'error');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUser.email,
      password: newUser.password,
      email_confirm: true,
      user_metadata: { full_name: newUser.full_name, role: newUser.role },
    });
    if (error) {
      toast(error.message, 'error');
      setSaving(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone || null,
      }).eq('id', data.user.id);
    }
    setSaving(false);
    toast('User created successfully', 'success');
    setModalOpen(false);
    setNewUser({ email: '', full_name: '', password: '', role: 'register_user', phone: '' });
    loadData();
  };

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name, role: user.role, phone: user.phone ?? '', is_active: user.is_active });
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      role: editForm.role,
      phone: editForm.phone || null,
      is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', editingUser.id);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast('User updated', 'success');
      setEditModalOpen(false);
      loadData();
    }
  };

  const toggleActive = async (user: Profile) => {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    loadData();
  };

  const roleColors: Record<string, string> = {
    admin: 'text-red-700 bg-red-50 border-red-200',
    manager: 'text-blue-700 bg-blue-50 border-blue-200',
    register_user: 'text-green-700 bg-green-50 border-green-200',
    assessor: 'text-gray-700 bg-gray-50 border-gray-200',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator', manager: 'Manager', register_user: 'Register User', assessor: 'Assessor',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><Users size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">User Management</h1>
            <p className="text-sm text-gray-500">{users.length} users registered</p>
          </div>
        </div>
        {hasRole('admin') && <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Create User</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 gbb-card-hover ${!user.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#343494] to-[#4e4ec1] text-white flex items-center justify-center font-semibold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{user.full_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} />{user.email}</p>
                  </div>
                </div>
                {user.id === profile?.id && <span className="text-xs text-[#ffc800] font-medium">You</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[user.role]}`}>{roleLabels[user.role]}</span>
                <span className={`text-xs ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {hasRole('admin') && (
                <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="flex-1"><Pencil size={14} /> Edit</Button>
                  {user.id !== profile?.id && (
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(user)} className="flex-1">
                      {user.is_active ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create user modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Full Name" required>
            <TextInput value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Full name" required />
          </Field>
          <Field label="Email Address" required>
            <TextInput type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@gohbetochbank.com" required />
          </Field>
          <Field label="Password" required>
            <TextInput type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Temporary password" required minLength={6} />
          </Field>
          <Field label="Role" required>
            <SelectInput value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
              {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Phone (optional)">
            <TextInput value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="Phone number" />
          </Field>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            The user will be created with the selected role. They can sign in immediately with the provided credentials.
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User" size="md">
        <form onSubmit={handleEditUser} className="space-y-4">
          <Field label="Full Name" required>
            <TextInput value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
          </Field>
          <Field label="Role" required>
            <SelectInput value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}>
              {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Phone">
            <TextInput value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
