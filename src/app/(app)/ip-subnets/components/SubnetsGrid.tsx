"use client";

import { IPSubnet } from '../../../../lib/supabase';
import { SubnetCard } from './SubnetCard';

interface SubnetsGridProps {
  subnets: IPSubnet[];
  loading: boolean;
  canManage: boolean;
  onEdit: (subnet: IPSubnet) => void;
  onDelete: (subnet: IPSubnet) => void;
}

function LoadingState() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
      No subnets defined yet. Add one, e.g. prefix "10.6.13." labeled "Head Office - Server Room", and IP
      addresses starting with that prefix will be identified automatically on the Server Registration form.
    </div>
  );
}

export function SubnetsGrid({ subnets, loading, canManage, onEdit, onDelete }: SubnetsGridProps) {
  if (loading) return <LoadingState />;
  if (subnets.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subnets.map((s) => (
        <SubnetCard key={s.id} subnet={s} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
