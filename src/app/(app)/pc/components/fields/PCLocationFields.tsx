import { Field, SelectInput, TextInput } from "@/components/FormControls";
import type { Department, AssetModel } from "@/lib/supabase";
import type { PCFormData } from "../../types/pcRegistration.types";

type Props = {
  form: PCFormData;
  departments: Department[];
  pcModels: AssetModel[];
  skipFloor: boolean;
  onChange: <K extends keyof PCFormData>(
    field: K,
    value: PCFormData[K],
  ) => void;
  onToggleFloor: () => void;
  onSelectModel: (id: string) => void;
};

export function PCLocationFields({
  form,
  departments,
  pcModels,
  skipFloor,
  onChange,
  onToggleFloor,
  onSelectModel,
}: Props) {
  const department = departments.find((d) => d.id === form.department_id);
  const branch = !!department?.is_branch;
  return (
    <>
      <Field label="Department / Branch">
        <SelectInput
          value={form.department_id}
          onChange={(e) => onChange("department_id", e.target.value)}
        >
          <option value="">Select department/branch</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.is_branch ? " (Branch)" : ""}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field
        label="Floor Number / Location"
        skip={branch}
        onSkip={onToggleFloor}
      >
        <TextInput
          value={form.floor_number}
          onChange={(e) => onChange("floor_number", e.target.value)}
          placeholder={
            skipFloor || branch ? "Skipped (branch location)" : "Floor number"
          }
          disabled={skipFloor || branch}
        />
      </Field>
      <Field
        label="Model"
        hint={
          pcModels.length === 0
            ? "No PC models defined yet — add one under Customization > Asset Models."
            : "Selecting a model fills in its default photo"
        }
      >
        <SelectInput
          value={form.model_id}
          onChange={(e) => onSelectModel(e.target.value)}
        >
          <option value="">Select model (optional)</option>
          {pcModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.manufacturer ? ` (${m.manufacturer})` : ""}
            </option>
          ))}
        </SelectInput>
      </Field>
    </>
  );
}
