import { Download, Monitor, Plus } from "lucide-react";
import { Button } from "@/components/FormControls";

type Props = {
  count: number;
  canWrite: boolean;
  onCreate: () => void;
  onExport: () => void;
};

export function PCPageHeader({ count, canWrite, onCreate, onExport }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <Monitor size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">PC Registration</h1>
          <p className="text-sm text-gray-500">{count} registered PCs</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download size={16} /> Export CSV
        </Button>
        {canWrite && (
          <Button variant="primary" size="sm" onClick={onCreate}>
            <Plus size={16} /> Register PC
          </Button>
        )}
      </div>
    </div>
  );
}
