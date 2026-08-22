"use client";
import { Modal } from "../../../../components/Modal";
import { Field, TextInput, Button } from "../../../../components/FormControls";
import { ReminderTypeModalProps } from "../types";

export function ReminderTypeModal({
  open,
  editing,
  label,
  saving,
  onLabelChange,
  onClose,
  onSave,
}: ReminderTypeModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Rename Reminder Type" : "Add Reminder Type"}
      size="sm"
    >
      <form onSubmit={onSave} className="space-y-4">
        <Field
          label="Name"
          required
          hint="e.g., Certificate Renewal, Vendor Contract Review"
        >
          <TextInput
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g., Certificate Renewal"
            required
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
