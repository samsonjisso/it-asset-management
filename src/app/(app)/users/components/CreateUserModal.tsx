"use client";

import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, TextInput, SelectInput, Button } from '@/components/FormControls';
import { useToast } from '@/components/Toast';
import { NewUserForm, UserRole, roleOptions } from '../types';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (newUser: NewUserForm) => Promise<{ error: any }>;
}

const emptyForm: NewUserForm = { email: '', full_name: '', password: '', role: 'register_user', phone: '' };

export function CreateUserModal({ open, onClose, onCreate }: CreateUserModalProps) {
  const { toast } = useToast();
  const [newUser, setNewUser] = useState<NewUserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast('All fields are required', 'error');
      return;
    }
    setSaving(true);
    const { error } = await onCreate(newUser);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('User created successfully', 'success');
    setNewUser(emptyForm);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New User" size="md">
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
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button>
        </div>
      </form>
    </Modal>
  );
}
