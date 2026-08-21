import type { SubtypeChipProps } from "../types";

export function SubtypeChip({
  subtype,
  canManage,
  onDelete,
}: SubtypeChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
      {subtype.label}
      {canManage && (
        <button
          onClick={() => onDelete(subtype)}
          className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Delete subtype"
        >
          ×
        </button>
      )}
    </span>
  );
}
