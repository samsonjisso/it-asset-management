import {
  AssetFilter,
  FILTER_OPTIONS,
  filterLabel,
} from "../types/assetModel.types";

interface AssetModelsFilterProps {
  value: AssetFilter;
  onChange: (filter: AssetFilter) => void;
}

// Simple segmented control for narrowing the grid to PC or Device
// models. Kept dumb/controlled so the active filter lives in the
// parent page alongside the model list it's filtering.
export function AssetModelsFilter({ value, onChange }: AssetModelsFilterProps) {
  return (
    <div className="flex gap-2">
      {FILTER_OPTIONS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === f
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {filterLabel(f)}
        </button>
      ))}
    </div>
  );
}
