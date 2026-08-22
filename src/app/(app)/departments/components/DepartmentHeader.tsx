import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/FormControls";

type Props = {
  count: number;
  canWrite: boolean;
  onAdd: () => void;
};

export function DepartmentHeader({ count, canWrite, onAdd }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <Building2 size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">
            Departments & Branches
          </h1>
          <p className="text-sm text-gray-500">
            {count} departments/branches
          </p>
        </div>
      </div>
      {canWrite && (
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus size={16} /> Add Department
        </Button>
      )}
    </div>
  );
}
