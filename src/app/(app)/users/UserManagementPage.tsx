"use client";

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/FormControls';
import { useUsers } from './hooks/useUsers';
import { Profile } from './types';
import { UserCard } from './components/UserCard';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';

export function UserManagementPage() {
  const { profile, hasRole } = useAuth();
  const { users, loading, createUser, editUser, toggleActive } = useUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    setEditModalOpen(true);
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
            <UserCard
              key={user.id}
              user={user}
              currentUserId={profile?.id}
              isAdmin={hasRole('admin')}
              onEdit={openEdit}
              onToggleActive={toggleActive}
            />
          ))}
        </div>
      )}

      <CreateUserModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createUser} />
      <EditUserModal open={editModalOpen} onClose={() => setEditModalOpen(false)} user={editingUser} onSave={editUser} />
    </div>
  );
}
