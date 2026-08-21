import { Check, Plus } from "lucide-react";
import { TextInput } from "@/components/FormControls";
import { ALL_STD_FIELDS, STD_FIELD_META } from "@/lib/deviceTypeFields";
import type { DeviceTypeEditorActions, DeviceTypeEditorState } from "../types";
import { getStandardFieldLabel, isCoreField } from "../utils/editorFieldHelpers";

type Editor = DeviceTypeEditorState & DeviceTypeEditorActions;

export function StandardFieldsEditor({ editor }: { editor: Editor }) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-1.5">
        Standard fields — toggle inclusion, rename fields, and mark them
        mandatory with *.
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_STD_FIELDS.map((key) => (
          <StandardField key={key} fieldKey={key} editor={editor} />
        ))}
      </div>
    </section>
  );
}

function StandardField({
  fieldKey,
  editor,
}: {
  fieldKey: string;
  editor: Editor;
}) {
  const isCore = isCoreField(fieldKey);
  const included = isCore
    ? editor.coreFields.includes(fieldKey)
    : editor.baseFields.includes(fieldKey);
  const required = isCore
    ? editor.requiredCoreFields.includes(fieldKey)
    : editor.requiredBaseFields.includes(fieldKey);
  const label = getStandardFieldLabel(fieldKey, editor.fieldLabels);

  if (editor.editingStdFieldKey === fieldKey) {
    return (
      <span className="flex items-center gap-1 p-1 rounded-lg bg-white border border-brand-300">
        <TextInput
          value={editor.editingStdFieldLabel}
          onChange={(event) =>
            editor.patch({ editingStdFieldLabel: event.target.value })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editor.saveRenameStandardField();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              editor.cancelRenameStandardField();
            }
          }}
          autoFocus
          className="!py-1 !px-2 text-xs w-36"
        />
        <button type="button" onClick={editor.saveRenameStandardField}>
          <Check size={12} />
        </button>
        <button type="button" onClick={editor.cancelRenameStandardField}>
          ×
        </button>
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center gap-1 pl-1 pr-2.5 py-1 rounded-lg border text-xs font-medium ${
        included
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-gray-200 bg-white text-gray-500"
      }`}
    >
      <button
        type="button"
        onClick={() => editor.toggleStandardIncluded(fieldKey)}
        title={included ? "Remove field" : "Add field"}
        className="w-4 h-4 flex items-center justify-center rounded-full border"
      >
        {included ? <Check size={10} /> : <Plus size={10} />}
      </button>

      <button
        type="button"
        onClick={() => editor.startRenameStandardField(fieldKey)}
        title={`Rename ${STD_FIELD_META[fieldKey]?.label ?? fieldKey}`}
        className="hover:underline"
      >
        {label}
      </button>

      {included && (
        <button
          type="button"
          onClick={() => editor.toggleStandardRequired(fieldKey)}
          title={required ? "Make optional" : "Make mandatory"}
          className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold ${
            required
              ? "bg-red-500 text-white"
              : "bg-white border border-gray-300 text-gray-400"
          }`}
        >
          *
        </button>
      )}
    </span>
  );
}
