import { Plus } from "lucide-react";
import { Button, SelectInput, TextInput } from "@/components/FormControls";
import type { DeviceTypeField } from "@/lib/supabase";
import type { DeviceTypeEditorActions, DeviceTypeEditorState } from "../types";
import { ExtraFieldItem } from "./ExtraFieldItem";

interface Props {
  editor: DeviceTypeEditorState & DeviceTypeEditorActions;
}

export function ExtraFieldsEditor({ editor }: Props) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-1.5">
        Your own fields — add exactly what this device type needs.
      </p>

      {editor.extraFields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {editor.extraFields.map((field) => (
            <ExtraFieldItem key={field.key} field={field} editor={editor} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          value={editor.newField.label}
          onChange={(event) =>
            editor.patch({
              newField: { ...editor.newField, label: event.target.value },
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editor.addExtraField();
            }
          }}
          placeholder="e.g., CPU, Capacity, Expiry Date"
          className="flex-1 min-w-[160px]"
        />

        <SelectInput
          value={editor.newField.type}
          onChange={(event) =>
            editor.patch({
              newField: {
                ...editor.newField,
                type: event.target.value as "text" | "number" | "date",
              },
            })
          }
          className="!w-auto text-xs !py-2"
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </SelectInput>

        <label className="flex items-center gap-1.5 text-xs font-medium">
          <input
            type="checkbox"
            checked={editor.newField.required}
            onChange={(event) =>
              editor.patch({
                newField: {
                  ...editor.newField,
                  required: event.target.checked,
                },
              })
            }
          />
          Mandatory
        </label>

        <Button type="button" variant="outline" size="sm" onClick={editor.addExtraField}>
          <Plus size={14} /> Add Field
        </Button>
      </div>
    </section>
  );
}
