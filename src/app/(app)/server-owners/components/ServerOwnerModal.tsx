import { Modal } from "../../../../components/Modal";
import { Field, TextInput, Button } from "../../../../components/FormControls";
import type { ServerOwnerModalProps } from "../types";

export function ServerOwnerModal({
  open,
  editing,
  label,
  saving,
  onLabelChange,
  onClose,
  onSubmit,
}: ServerOwnerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Rename Server Owner" : "Add Server Owner"}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Name"
          required
          hint="e.g., Infrastructure Management, Application, Information Security"
        >
          <TextInput
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g., Network Operations"
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
