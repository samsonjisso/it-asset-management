import { Layers, Pencil, Trash2 } from "lucide-react";
import { ServerEnvironment } from "../types";

interface ServerEnvironmentCardProps {
  environment: ServerEnvironment;
  canManage: boolean;
  onEdit: (t: ServerEnvironment) => void;
  onDelete: (t: ServerEnvironment) => void;
}

export function ServerEnvironmentCard({
  environment,
  canManage,
  onEdit,
  onDelete,
}: ServerEnvironmentCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{environment.label}</p>
            <p className="text-xs text-gray-400 font-mono">
              {environment.code}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(environment)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Rename"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(environment)}
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
