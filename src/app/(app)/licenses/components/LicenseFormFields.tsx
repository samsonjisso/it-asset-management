"use client";
import {
  Field,
  TextInput,
  NumberInput,
  SelectInput,
} from "../../../../components/FormControls";
import { LicenseType, LicenseSubtype } from "../../../../lib/supabase";
import { LicenseFormData } from "../types";

interface LicenseFormFieldsProps {
  form: LicenseFormData;
  setForm: React.Dispatch<React.SetStateAction<LicenseFormData>>;
  licenseTypeOptions: LicenseType[];
  licenseSubtypes: LicenseSubtype[];
}

export function LicenseFormFields({
  form,
  setForm,
  licenseTypeOptions,
  licenseSubtypes,
}: LicenseFormFieldsProps) {
  const currentType = licenseTypeOptions.find((t) => t.code === form.license_type);
  const currentSubtypes = licenseSubtypes.filter((s) => s.license_type_id === currentType?.id);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="License Type" required>
        <SelectInput
          value={form.license_type}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, license_type: e.target.value, license_subtype: "" }))
          }
          required
        >
          {licenseTypeOptions.length === 0 && (
            <option value="">No license types configured</option>
          )}
          {licenseTypeOptions.map((t) => (
            <option key={t.id} value={t.code}>{t.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="License Subtype">
        <SelectInput
          value={form.license_subtype}
          onChange={(e) => setForm((prev) => ({ ...prev, license_subtype: e.target.value }))}
        >
          <option value="">Select subtype</option>
          {currentSubtypes.map((s) => (
            <option key={s.id} value={s.label}>{s.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Vendor (Company)">
        <TextInput
          value={form.vendor}
          onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
          placeholder="e.g., Microsoft, Redhat, VMware"
        />
      </Field>
      <Field label="Number of Licenses">
        <NumberInput
          min={0}
          value={form.number_of_licenses}
          onChange={(e) => setForm((prev) => ({ ...prev, number_of_licenses: e.target.value }))}
          placeholder="Total purchased licenses"
        />
      </Field>
      <Field label="Effective Date (optional)">
        <TextInput
          type="date"
          value={form.effective_date}
          onChange={(e) => setForm((prev) => ({ ...prev, effective_date: e.target.value }))}
        />
      </Field>
      <Field label="Expiry Date">
        <TextInput
          type="date"
          value={form.expiry_date}
          onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
        />
      </Field>
    </div>
  );
}
