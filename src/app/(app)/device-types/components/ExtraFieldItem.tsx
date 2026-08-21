import type { DeviceTypeField } from "@/lib/supabase";
import type { DeviceTypeEditorActions, DeviceTypeEditorState } from "../types";
import { TextInput } from "@/components/FormControls";

type Editor = DeviceTypeEditorState & DeviceTypeEditorActions;

interface Props {
  field: DeviceTypeField;
  editor: Editor;
}

export function ExtraFieldItem({ field, editor }: Props) {
  if (editor.editingFieldKey === field.key) {
    return <RenameField editor={editor} />;
  }

  return (
    <span className="relative flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs font-medium text-brand-700">
      <button
        type="button"
        onClick={() => editor.startRenameExtraField(field)}
        className="hover:underline"
      >
        {field.label}
      </button>

      <button
        type="button"
        onClick={() => editor.cycleExtraFieldType(field.key)}
        className="px-1 h-4 rounded text-[9px] font-bold uppercase bg-white border"
      >
        {field.type === "number" ? "123" : field.type === "date" ? "DATE" : "ABC"}
      </button>

      <button
        type="button"
        onClick={() => editor.toggleExtraFieldRequired(field.key)}
        className={`w-4 h-4 rounded-full text-[10px] font-bold border ${
          field.required ? "bg-red-500 text-white" : "bg-white text-gray-400"
        }`}
      >
        *
      </button>

      <button
        type="button"
        onClick={() => editor.removeExtraField(field.key)}
        className="w-4 h-4 rounded-full hover:bg-brand-100"
        title="Delete field"
      >
        ×
      </button>
    </span>
  );
}

function RenameField({ editor }: { editor: Editor }) {
  return (
    <span className="flex items-center gap-1 p-1 rounded-lg bg-white border border-brand-300">
      <TextInput
        value={editor.editingFieldLabel}
        onChange={(event) =>
          editor.patch({ editingFieldLabel: event.target.value })
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.saveRenameExtraField();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            editor.patch({ editingFieldKey: null, editingFieldLabel: "" });
          }
        }}
        autoFocus
        className="!py-1 !px-2 text-xs w-32"
      />
      <button type="button" onClick={editor.saveRenameExtraField}>
        ✓
      </button>
      <button
        type="button"
        onClick={() =>
          editor.patch({ editingFieldKey: null, editingFieldLabel: "" })
        }
      >
        ×
      </button>
    </span>
  );
}
