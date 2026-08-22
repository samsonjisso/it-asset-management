import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Field, TextInput } from "@/components/FormControls";
import { ServerEnvironment } from "../types";

interface ServerEnvironmentModalProps {
  open: boolean;
  editing: ServerEnvironment | null;
  onClose: () => void;
  onSave: (label: string, editingId?: string) => Promise<boolean>;
}

export function ServerEnvironmentModal({
  open,
  editing,
  onClose,
  onSave,
}: ServerEnvironmentModalProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Mirrors the original component's behavior of seeding the label field
  // from `editing` (or blank, for "add") whenever the modal is opened.
  useEffect(() => {
    if (open) setLabel(editing ? editing.label : "");
  }, [open, editing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await onSave(label, editing?.id);
    setSaving(false);
    if (success) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Rename Server Environment" : "Add Server Environment"}
      size="sm"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Name" required hint="e.g., Production, Test, Standby, DR">
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Staging"
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
