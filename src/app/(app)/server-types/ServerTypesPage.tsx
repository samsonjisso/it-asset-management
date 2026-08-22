"use client";
import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/FormControls';
import { useServerTypes } from './hooks/useServerTypes';
import { ServerTypeGrid } from './components/ServerTypeGrid';
import { ServerTypeModal } from './components/ServerTypeModal';
import type { ServerType } from './types';

export default function ServerTypesPage() {
  const { hasRole, canWrite } = useAuth();
  const canManage = hasRole('admin');
  const { toast } = useToast();
  const { types, loading, saving, saveServerType, deleteServerType } = useServerTypes();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerType | null>(null);
  const [label, setLabel] = useState('');

  const openAdd = () => {
    setEditing(null);
    setLabel('');
    setModalOpen(true);
  };

  const openEdit = (t: ServerType) => {
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
    const { error } = await saveServerType(label.trim(), editing);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Server type updated' : 'Server type added', 'success');
      setModalOpen(false);
    }
  };

  const handleDelete = async (t: ServerType) => {
    if (!confirm(`Delete server type "${t.label}"?`)) return;
    const { error } = await deleteServerType(t);
    if (error) toast(error.message, 'error');
    else toast('Server type deleted', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Tags size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Server Type Management</h1>
            <p className="text-sm text-gray-500">
              {types.length} server type{types.length === 1 ? '' : 's'} available on the Server Registration form
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Server Type
          </Button>
        )}
      </div>

      <ServerTypeGrid
        types={types}
        loading={loading}
        canManage={canManage}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <ServerTypeModal
        open={modalOpen}
        editing={editing}
        label={label}
        saving={saving}
        onLabelChange={setLabel}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
