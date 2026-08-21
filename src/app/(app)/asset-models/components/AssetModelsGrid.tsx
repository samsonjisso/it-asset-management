import { AssetModel } from "@/lib/supabase";
import { AssetModelCard } from "./AssetModelCard";

interface AssetModelsGridProps {
  loading: boolean;
  models: AssetModel[];
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (model: AssetModel) => void;
  onDelete: (model: AssetModel) => void;
}

// Handles the three visual states for the model list: a spinner while
// loading, an empty-state message, or the responsive card grid. Kept
// separate from the page so the loading/empty logic doesn't clutter
// the page's top-level composition.
export function AssetModelsGrid({
  loading,
  models,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: AssetModelsGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
        No models defined yet. Add one with a reference photo so it can be
        picked directly on the PC or Device Registration form.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((m) => (
        <AssetModelCard
          key={m.id}
          model={m}
          canWrite={canWrite}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
