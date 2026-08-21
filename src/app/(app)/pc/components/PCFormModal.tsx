import type { SubmitEvent } from "react";
import type { AssetModel, Department, PCRegistration } from "@/lib/supabase";
import { Modal } from "@/components/Modal";
import { Button, Field, TextArea } from "@/components/FormControls";
import { ImageInput } from "@/components/ImageInput";
import type { PCFormData } from "../types/pcRegistration.types";
import { PCFormFields } from "./PCFormFields";

type Props = {
  open: boolean;
  editing: PCRegistration | null;
  form: PCFormData;
  departments: Department[];
  pcModels: AssetModel[];
  skipAssetTag: boolean;
  skipFloor: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof PCFormData>(
    field: K,
    value: PCFormData[K],
  ) => void;
  onToggleAssetTag: () => void;
  onToggleFloor: () => void;
  onSelectModel: (id: string) => void;
};

export function PCFormModal({
  open,
  editing,
  form,
  departments,
  pcModels,
  skipAssetTag,
  skipFloor,
  saving,
  onClose,
  onSubmit,
  onChange,
  onToggleAssetTag,
  onToggleFloor,
  onSelectModel,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit PC Registration" : "Register New PC"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {editing?.asset_id && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-medium text-gray-500">Asset ID</span>
            <span className="font-mono text-sm font-semibold text-brand-700">
              {editing.asset_id}
            </span>
          </div>
        )}
        <PCFormFields
          form={form}
          departments={departments}
          pcModels={pcModels}
          skipAssetTag={skipAssetTag}
          skipFloor={skipFloor}
          onChange={onChange}
          onToggleAssetTag={onToggleAssetTag}
          onToggleFloor={onToggleFloor}
          onSelectModel={onSelectModel}
        />
        <ImageInput
          value={form.image}
          onChange={(value) => onChange("image", value)}
          label="PC Photo"
          hint="Optional — helps identify this specific unit"
        />
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            rows={2}
            placeholder="Additional notes..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update PC" : "Register PC"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
