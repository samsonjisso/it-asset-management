"use client";

import { Plus, Network } from 'lucide-react';
import { Button } from '../../../../components/FormControls';

interface SubnetsPageHeaderProps {
  count: number;
  canManage: boolean;
  onAdd: () => void;
}

export function SubnetsPageHeader({ count, canManage, onAdd }: SubnetsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <Network size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">IP Subnet Management</h1>
          <p className="text-sm text-gray-500">
            {count} subnet{count === 1 ? '' : 's'} defined — used to identify which network an IP address
            belongs to
          </p>
        </div>
      </div>

      {canManage && (
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus size={16} /> Add Subnet
        </Button>
      )}
    </div>
  );
}
