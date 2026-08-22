import { Pencil, Trash2, Server as ServerIcon } from 'lucide-react';
import type { ServerType } from '../types';

interface ServerTypeCardProps {
  type: ServerType;
  canManage: boolean;
  onEdit: (t: ServerType) => void;
  onDelete: (t: ServerType) => void;
}

export function ServerTypeCard({ type: t, canManage, onEdit, onDelete }: ServerTypeCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <ServerIcon size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{t.label}</p>
            <p className="text-xs text-gray-400 font-mono">{t.code}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button onClick={() => onEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Rename">
              <Pencil size={16} />
            </button>
            <button onClick={() => onDelete(t)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
