import { Pencil, Trash2, Layers, Plus } from "lucide-react";
import { TextInput, Button } from "@/components/FormControls";
import { SubtypeChip } from "./SubtypeChip";
import type { LicenseTypeCardProps } from "../types";

export function LicenseTypeCard({
  type,
  subtypes,
  canManage,
  subtypeDraft,
  savingSubtype,
  onChangeDraft,
  onAddSubtype,
  onDeleteSubtype,
  onEditType,
  onDeleteType,
}: LicenseTypeCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{type.label}</p>
            <p className="text-xs text-gray-400 font-mono">{type.code}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button
              onClick={() => onEditType(type)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Rename"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDeleteType(type)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Subtypes</p>
        {subtypes.length === 0 ? (
          <p className="text-xs text-gray-400 italic mb-2">No subtypes yet</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {subtypes.map((s) => (
              <SubtypeChip
                key={s.id}
                subtype={s}
                canManage={canManage}
                onDelete={onDeleteSubtype}
              />
            ))}
          </div>
        )}
        {canManage && (
          <div className="flex gap-2">
            <TextInput
              value={subtypeDraft}
              onChange={(e) => onChangeDraft(type.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddSubtype(type.id);
                }
              }}
              placeholder="New subtype name"
              className="flex-1 !py-2 !text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddSubtype(type.id)}
              loading={savingSubtype}
            >
              <Plus size={14} /> Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
