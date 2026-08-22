import { Pencil, Trash2, BellRing } from "lucide-react";
import { ReminderTypeCardProps } from "../types";

export function ReminderTypeCard({
  type,
  canManage,
  onEdit,
  onDelete,
}: ReminderTypeCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <BellRing size={20} />
          </div>
          <p className="font-semibold text-gray-800">{type.label}</p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(type)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Rename"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(type)}
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
