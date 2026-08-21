import { Check, Trash2 } from "lucide-react";
import { Button, TextInput } from "@/components/FormControls";
import { Modal } from "@/components/Modal";
import { ICON_OPTIONS } from "@/lib/deviceTypeFields";
import type { DeviceType } from "@/lib/supabase";
import type { DeviceTypeEditorActions, DeviceTypeEditorState } from "../types";
import { ExtraFieldsEditor } from "./ExtraFieldsEditor";
import { StandardFieldsEditor } from "./StandardFieldsEditor";

interface Props {
  editor: DeviceTypeEditorState & DeviceTypeEditorActions;
  deviceTypes: DeviceType[];
  onSubmit: () => void;
  onDelete: (id: string) => void;
}

export function DeviceTypeEditor({
  editor,
  deviceTypes,
  onSubmit,
  onDelete,
}: Props) {
  const currentType = deviceTypes.find(
    (type) => type.id === editor.editingTypeId,
  );

  return (
    <Modal
      open={editor.open}
      onClose={editor.close}
      title={
        editor.mode === "edit"
          ? `Editing "${editor.label || "this type"}"`
          : "Add Device Type"
      }
      size="lg"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
        className="space-y-4"
      >
        <TextInput
          value={editor.label}
          onChange={(event) => editor.patch({ label: event.target.value })}
          placeholder="Device type name, e.g., Biometric Scanner"
          autoFocus
        />

        <IconPicker editor={editor} />

        <StandardFieldsEditor editor={editor} />
        <ExtraFieldsEditor editor={editor} />

        <footer className="flex justify-between items-center gap-2 pt-2 border-t border-gray-200">
          {editor.mode === "edit" && currentType ? (
            <button
              type="button"
              onClick={() => void onDelete(currentType.id)}
              className="text-xs font-medium text-red-500 inline-flex items-center gap-1"
            >
              <Trash2 size={13} /> Delete this device type
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={editor.close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={editor.saving}>
              {editor.saving
                ? "Saving..."
                : editor.mode === "edit"
                  ? "Save Changes"
                  : "Add Device Type"}
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}

function IconPicker({ editor }: { editor: DeviceTypeEditorState & DeviceTypeEditorActions }) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-1.5">
        Choose an icon
      </p>

      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-32 overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-200">
        {ICON_OPTIONS.map((option) => (
          <button
            key={option.name}
            type="button"
            title={option.name}
            onClick={() => editor.patch({ icon: option.name })}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border ${
              editor.icon === option.name
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            {option.icon}
            {editor.icon === option.name && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gold-400 text-brand-950 flex items-center justify-center">
                <Check size={9} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
