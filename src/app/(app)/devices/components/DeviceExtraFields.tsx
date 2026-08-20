import type { DeviceForm } from "../types/device";
import { parseExtraFields } from "@/lib/deviceTypeFields";
type ExtraField = ReturnType<typeof parseExtraFields>[number];
import { Field, NumberInput, TextInput } from "@/components/FormControls";

type Props = {
  title?: string;
  fields: ExtraField[];
  form: DeviceForm;
  onChange: (key: string, value: string) => void;
};
export function DeviceExtraFields({ title, fields, form, onChange }: Props) {
  if (!fields.length) return null;
  return (
    <div className="space-y-2 pt-2 border-t border-dashed border-gray-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {title} Details
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <Field key={field.key} label={field.label} required={field.required}>
            {field.type === "number" ? (
              <NumberInput
                value={form.extra_data[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : (
              <TextInput
                type={field.type === "date" ? "date" : "text"}
                value={form.extra_data[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}
