import type { FormEvent } from "react";
import type {
  AssetModel,
  Device,
  DeviceOwner,
  DeviceType,
} from "@/lib/supabase";
import { Modal } from "@/components/Modal";
import { Button, Field, TextArea } from "@/components/FormControls";
import { ImageInput } from "@/components/ImageInput";
import type { DeviceForm } from "../types/device";
import { parseExtraFields } from "@/lib/deviceTypeFields";
type ExtraField = ReturnType<typeof parseExtraFields>[number];
import { DeviceTypeSelector } from "./DeviceTypeSelector";
import { DeviceCoreFields } from "./DeviceCoreFields";
import { DeviceExtraFields } from "./DeviceExtraFields";

type Props = {
  open: boolean;
  editing: Device | null;
  form: DeviceForm;
  types: DeviceType[];
  owners: DeviceOwner[];
  models: AssetModel[];
  selectedType: DeviceType | null;
  coreFields: string[];
  requiredCoreFields: string[];
  baseFields: string[];
  requiredBaseFields: string[];
  extraFields: ExtraField[];
  skipIP: boolean;
  saving: boolean;
  fieldLabel: (key: string) => string;
  placeholder: (key: string) => string | undefined;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onChange: (patch: Partial<DeviceForm>) => void;
  onType: (code: string) => void;
  onExtra: (key: string, value: string) => void;
  onModel: (id: string) => void;
  onToggleIP: () => void;
  typeManager?: () => void;
  ownerManager: React.ComponentProps<typeof DeviceCoreFields>["ownerManager"];
};
export function DeviceFormModal(p: Props) {
  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      title={p.editing ? "Edit Device" : "Register New Device"}
      size="lg"
    >
      <form onSubmit={p.onSubmit} className="space-y-4">
        {p.editing?.asset_id && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-medium text-gray-500">Asset ID</span>
            <span className="font-mono text-sm font-semibold text-brand-700">
              {p.editing.asset_id}
            </span>
          </div>
        )}
        <DeviceTypeSelector
          types={p.types}
          value={p.form.device_type}
          onChange={p.onType}
          onNavigate={p.typeManager ? () => p.typeManager?.() : undefined}
          canManage={!!p.typeManager}
        />
        <DeviceCoreFields
          form={p.form}
          owners={p.owners}
          models={p.models}
          coreFields={p.coreFields}
          requiredCoreFields={p.requiredCoreFields}
          baseFields={p.baseFields}
          requiredBaseFields={p.requiredBaseFields}
          fieldLabel={p.fieldLabel}
          placeholder={p.placeholder}
          skipIP={p.skipIP}
          onChange={p.onChange}
          onToggleIP={p.onToggleIP}
          onModel={p.onModel}
          ownerManager={p.ownerManager}
        />
        <DeviceExtraFields
          title={p.selectedType?.label}
          fields={p.extraFields}
          form={p.form}
          onChange={p.onExtra}
        />
        <ImageInput
          value={p.form.image}
          onChange={(image) => p.onChange({ image })}
          label="Device Photo"
          hint="Optional — helps identify this specific unit"
        />
        <Field label="Notes">
          <TextArea
            value={p.form.notes}
            onChange={(e) => p.onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={p.onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={p.saving}>
            {p.saving
              ? "Saving..."
              : p.editing
                ? "Update Device"
                : "Register Device"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
