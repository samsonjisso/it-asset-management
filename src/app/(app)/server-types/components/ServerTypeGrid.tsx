import { ServerTypeCard } from './ServerTypeCard';
import type { ServerType } from '../types';

interface ServerTypeGridProps {
  types: ServerType[];
  loading: boolean;
  canManage: boolean;
  onEdit: (t: ServerType) => void;
  onDelete: (t: ServerType) => void;
}

export function ServerTypeGrid({ types, loading, canManage, onEdit, onDelete }: ServerTypeGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
        No server types yet. Add one to make it available on the Server Registration form.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {types.map((t) => (
        <ServerTypeCard key={t.id} type={t} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
