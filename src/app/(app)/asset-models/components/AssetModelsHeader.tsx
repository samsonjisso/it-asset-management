import { Plus, Boxes } from "lucide-react";
import { Button } from "@/components/FormControls";

interface AssetModelsHeaderProps {
  modelCount: number;
  canAdd: boolean;
  onAdd: () => void;
}

// Top banner: icon, title, live count, and the primary "Add Model"
// action (hidden entirely for viewers without write access).
export function AssetModelsHeader({
  modelCount,
  canAdd,
  onAdd,
}: AssetModelsHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <Boxes size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">
            Asset Model Management
          </h1>
          <p className="text-sm text-gray-500">
            {modelCount} model{modelCount === 1 ? "" : "s"} defined — selectable
            (with photo) when registering a PC or device
          </p>
        </div>
      </div>
      {canAdd && (
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus size={16} /> Add Model
        </Button>
      )}
    </div>
  );
}
