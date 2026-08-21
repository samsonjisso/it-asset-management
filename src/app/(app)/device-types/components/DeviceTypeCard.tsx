import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DeviceType } from "@/lib/supabase";

interface Props {
  type: DeviceType;
  fieldCount: number;
  icon: ReactNode;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeviceTypeCard({
  type,
  fieldCount,
  icon,
  canManage,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{type.label}</p>
            <p className="text-xs text-gray-400">
              {fieldCount} field{fieldCount === 1 ? "" : "s"} ·{" "}
              <span className="font-mono">{type.code}</span>
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit fields"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
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
