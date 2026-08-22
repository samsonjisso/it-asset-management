"use client";

import { Pencil, UserCheck, UserX, Mail } from 'lucide-react';
import { Button } from '../../../../components/FormControls';
import { Profile, roleColors, roleLabels } from '../types';

interface UserCardProps {
  user: Profile;
  currentUserId?: string;
  isAdmin: boolean;
  onEdit: (user: Profile) => void;
  onToggleActive: (user: Profile) => void;
}

export function UserCard({ user, currentUserId, isAdmin, onEdit, onToggleActive }: UserCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 gbb-card-hover ${!user.is_active ? 'opacity-60' : ''}`}>
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
        {user.id === currentUserId && <span className="text-xs text-[#ffc800] font-medium">You</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[user.role]}`}>{roleLabels[user.role]}</span>
        <span className={`text-xs ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      {isAdmin && (
        <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={() => onEdit(user)} className="flex-1"><Pencil size={14} /> Edit</Button>
          {user.id !== currentUserId && (
            <Button variant="ghost" size="sm" onClick={() => onToggleActive(user)} className="flex-1">
              {user.is_active ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
