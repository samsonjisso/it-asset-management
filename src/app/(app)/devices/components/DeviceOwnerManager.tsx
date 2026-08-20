import type { DeviceOwner } from "@/lib/supabase";
import { Button, TextInput } from "@/components/FormControls";
import { Check, Plus } from "lucide-react";

type Props = {
  owners: DeviceOwner[];
  open: boolean;
  onToggle: () => void;
  editingId: string | null;
  editingLabel: string;
  newLabel: string;
  saving: boolean;
  onNewLabel: (v: string) => void;
  onEditingLabel: (v: string) => void;
  onAdd: () => void;
  onStartRename: (owner: DeviceOwner) => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onDelete: (owner: DeviceOwner) => void;
};
export function DeviceOwnerManager(p: Props) {
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={p.onToggle}
        className="text-xs text-brand-600 hover:text-brand-500 font-medium underline underline-offset-2"
      >
        {p.open ? "Close" : "Manage options"}
      </button>
      {p.open && (
        <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            {p.owners.map((owner) =>
              p.editingId === owner.id ? (
                <span
                  key={owner.id}
                  className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-lg bg-white border border-brand-300"
                >
                  <TextInput
                    value={p.editingLabel}
                    onChange={(e) => p.onEditingLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        p.onSaveRename();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        p.onCancelRename();
                      }
                    }}
                    autoFocus
                    className="!py-1 !px-2 text-xs w-32"
                  />
                  <button
                    type="button"
                    onClick={p.onSaveRename}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand-50 text-brand-600"
                    title="Save"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={p.onCancelRename}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                    title="Cancel"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span
                  key={owner.id}
                  className="relative flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs font-medium text-brand-700"
                >
                  <button
                    type="button"
                    onClick={() => p.onStartRename(owner)}
                    title="Rename"
                    className="hover:underline underline-offset-2"
                  >
                    {owner.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => p.onDelete(owner)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-100 text-brand-500"
                    title="Delete"
                  >
                    ×
                  </button>
                </span>
              ),
            )}
          </div>
          <div className="flex items-center gap-2">
            <TextInput
              value={p.newLabel}
              onChange={(e) => p.onNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  p.onAdd();
                }
              }}
              placeholder="e.g., Network Operations"
              className="flex-1 min-w-[140px] !py-1.5 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={p.onAdd}
              loading={p.saving}
            >
              <Plus size={13} /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
