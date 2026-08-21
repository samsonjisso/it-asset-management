import { Pencil, Trash2, Monitor, HardDrive } from "lucide-react";
import { AssetModel } from "@/lib/supabase";
import { ZoomImage } from "@/components/ZoomImage";

interface AssetModelCardProps {
  model: AssetModel;
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (model: AssetModel) => void;
  onDelete: (model: AssetModel) => void;
}

// Renders one model tile: thumbnail (or a fallback icon), name,
// target/manufacturer subtitle, and edit/delete actions gated by
// the caller's permission flags.
export function AssetModelCard({
  model,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: AssetModelCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {model.image ? (
            <ZoomImage src={model.image} size={48} />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {model.target === "pc" ? (
                <Monitor size={20} className="text-gray-300" />
              ) : (
                <HardDrive size={20} className="text-gray-300" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{model.name}</p>
            <p className="text-xs text-gray-400">
              {model.target === "pc" ? "PC" : "Device"}
              {model.manufacturer ? ` · ${model.manufacturer}` : ""}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(model)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(model)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
