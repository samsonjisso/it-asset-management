"use client";
import { KeyRound, Plus, Download } from "lucide-react";
import { Button } from "../../../../components/FormControls";

interface LicenseHeaderProps {
  count: number;
  onExport: () => void;
  onAdd: () => void;
  canWrite: boolean;
}

export function LicenseHeader({ count, onExport, onAdd, canWrite }: LicenseHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <KeyRound size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">License Registration</h1>
          <p className="text-sm text-gray-500">{count} registered licenses</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download size={16} /> Export CSV
        </Button>
        {canWrite && (
          <Button variant="primary" size="sm" onClick={onAdd}>
            <Plus size={16} /> Register License
          </Button>
        )}
      </div>
    </div>
  );
}
