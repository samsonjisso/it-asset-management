"use client";

import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/Modal';
import { Field, TextInput, SelectInput, Button } from '../../../../components/FormControls';
import { useToast } from '../../../../components/Toast';
import { EditUserForm, UserRole, Profile, roleOptions } from '../types';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onSave: (userId: string, form: EditUserForm) => Promise<{ error: any }>;
}

export function EditUserModal({ open, onClose, user, onSave }: EditUserModalProps) {
  const { toast } = useToast();
  const [editForm, setEditForm] = useState<EditUserForm>({ full_name: '', role: 'register_user', phone: '', is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({ full_name: user.full_name, role: user.role, phone: user.phone ?? '', is_active: user.is_active });
    }
  }, [user]);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await onSave(user.id, editForm);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast('User updated', 'success');
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit User" size="md">
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
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
