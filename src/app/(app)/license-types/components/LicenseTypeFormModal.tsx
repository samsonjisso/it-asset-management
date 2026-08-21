import { Modal } from "@/components/Modal";
import {
  Field,
  TextInput,
  Button,
} from "@/components/FormControls";
import type { LicenseTypeFormModalProps } from "../types";

export function LicenseTypeFormModal({
  open,
  editingType,
  typeLabel,
  saving,
  onChangeLabel,
  onClose,
  onSubmit,
}: LicenseTypeFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingType ? "Rename License Type" : "Add License Type"}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Name"
          required
          hint="e.g., Antivirus License, Firewall License"
        >
          <TextInput
            value={typeLabel}
            onChange={(e) => onChangeLabel(e.target.value)}
            placeholder="e.g., Antivirus License"
            required
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : editingType ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
