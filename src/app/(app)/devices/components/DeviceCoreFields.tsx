import type { AssetModel, DeviceOwner } from "@/lib/supabase";
import {
  Field,
  NumberInput,
  SelectInput,
  TextInput,
} from "@/components/FormControls";
import type { DeviceForm } from "../types/device";
import { DeviceOwnerManager } from "./DeviceOwnerManager";

type Props = {
  form: DeviceForm;
  owners: DeviceOwner[];
  models: AssetModel[];
  coreFields: string[];
  requiredCoreFields: string[];
  baseFields: string[];
  requiredBaseFields: string[];
  fieldLabel: (key: string) => string;
  placeholder: (key: string) => string | undefined;
  skipIP: boolean;
  onChange: (patch: Partial<DeviceForm>) => void;
  onToggleIP: () => void;
  onModel: (id: string) => void;
  ownerManager: React.ComponentProps<typeof DeviceOwnerManager>;
};
export function DeviceCoreFields(p: Props) {
  const req = (key: string) => p.requiredCoreFields.includes(key);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {p.coreFields.includes("device_owner") && (
        <Field
          label={p.fieldLabel("device_owner")}
          required={req("device_owner")}
        >
          <SelectInput
            value={p.form.device_owner}
            onChange={(e) => p.onChange({ device_owner: e.target.value })}
            required={req("device_owner")}
          >
            <option value="">Select owner/department...</option>
            {p.owners.map((o) => (
              <option key={o.id} value={o.code}>
                {o.label}
              </option>
            ))}
          </SelectInput>
          {p.ownerManager && <DeviceOwnerManager {...p.ownerManager} />}
        </Field>
      )}
      {p.coreFields.includes("device_model") && (
        <Field
          label={p.fieldLabel("device_model")}
          required={req("device_model")}
          hint={
            p.models.length > 0
              ? "Pick a predefined model to auto-fill this and the photo"
              : undefined
          }
        >
          <TextInput
            value={p.form.device_model}
            onChange={(e) =>
              p.onChange({ device_model: e.target.value, model_id: "" })
            }
            placeholder={p.placeholder("device_model")}
            required={req("device_model")}
          />
        </Field>
      )}
      {p.models.length > 0 && (
        <Field
          label="Predefined Model"
          hint="Optional — defined under Customization > Asset Models"
        >
          <SelectInput
            value={p.form.model_id}
            onChange={(e) => p.onModel(e.target.value)}
          >
            <option value="">Choose a model...</option>
            {p.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.manufacturer ? ` (${m.manufacturer})` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
      {p.coreFields.includes("hostname") && (
        <Field label={p.fieldLabel("hostname")} required={req("hostname")}>
          <TextInput
            value={p.form.hostname}
            onChange={(e) => p.onChange({ hostname: e.target.value })}
            placeholder={p.placeholder("hostname")}
            required={req("hostname")}
          />
        </Field>
      )}
      {p.baseFields.includes("ip_address") && (
        <Field
          label={p.fieldLabel("ip_address")}
          required={p.requiredBaseFields.includes("ip_address")}
          skip={!p.requiredBaseFields.includes("ip_address")}
          onSkip={p.onToggleIP}
        >
          <TextInput
            value={p.form.ip_address}
            onChange={(e) => p.onChange({ ip_address: e.target.value })}
            placeholder={p.skipIP ? "Skipped" : p.placeholder("ip_address")}
            disabled={p.skipIP}
            required={p.requiredBaseFields.includes("ip_address")}
          />
        </Field>
      )}
      {p.baseFields.includes("serial_number") && (
        <Field
          label={p.fieldLabel("serial_number")}
          required={p.requiredBaseFields.includes("serial_number")}
        >
          <TextInput
            value={p.form.serial_number}
            onChange={(e) => p.onChange({ serial_number: e.target.value })}
            placeholder={p.placeholder("serial_number")}
            required={p.requiredBaseFields.includes("serial_number")}
          />
        </Field>
      )}
      {p.baseFields.includes("mac_address") && (
        <Field
          label={p.fieldLabel("mac_address")}
          required={p.requiredBaseFields.includes("mac_address")}
        >
          <TextInput
            value={p.form.mac_address}
            onChange={(e) => p.onChange({ mac_address: e.target.value })}
            placeholder={p.placeholder("mac_address")}
            required={p.requiredBaseFields.includes("mac_address")}
          />
        </Field>
      )}
      {p.baseFields.includes("location") && (
        <Field
          label={p.fieldLabel("location")}
          required={p.requiredBaseFields.includes("location")}
        >
          <TextInput
            value={p.form.location}
            onChange={(e) => p.onChange({ location: e.target.value })}
            placeholder={p.placeholder("location")}
            required={p.requiredBaseFields.includes("location")}
          />
        </Field>
      )}
      {p.baseFields.includes("rack_number") && (
        <Field
          label={p.fieldLabel("rack_number")}
          required={p.requiredBaseFields.includes("rack_number")}
        >
          <NumberInput
            value={p.form.rack_number}
            onChange={(e) => p.onChange({ rack_number: e.target.value })}
            placeholder={p.placeholder("rack_number")}
            required={p.requiredBaseFields.includes("rack_number")}
          />
        </Field>
      )}
    </div>
  );
}
