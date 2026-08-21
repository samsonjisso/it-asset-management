"use client";

import { IPSubnet } from '../../../../lib/supabase';
import { Pencil, Trash2, Network } from 'lucide-react';

interface SubnetCardProps {
  subnet: IPSubnet;
  canManage: boolean;
  onEdit: (subnet: IPSubnet) => void;
  onDelete: (subnet: IPSubnet) => void;
}

export function SubnetCard({ subnet, canManage, onEdit, onDelete }: SubnetCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Network size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-semibold text-gray-800">{subnet.prefix}*</p>
            <p className="text-sm text-gray-600 truncate">{subnet.label}</p>
            {subnet.notes && <p className="text-xs text-gray-400 truncate">{subnet.notes}</p>}
          </div>
        </div>

        {canManage && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(subnet)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(subnet)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
