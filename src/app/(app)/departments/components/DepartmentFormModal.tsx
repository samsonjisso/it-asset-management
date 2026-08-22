import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, TextArea, Button } from "@/components/FormControls";
import type { Department } from "@/lib/supabase";
import type { DepartmentForm } from "../types";

type Props = {
  open: boolean;
  editing: Department | null;
  saving: boolean;
  onClose: () => void;
  onCreate: (form: DepartmentForm) => Promise<void>;
  onUpdate: (id: number, form: DepartmentForm) => Promise<void>;
};

const emptyForm: DepartmentForm = {
  name: "",
  is_branch: false,
  description: "",
};

export function DepartmentFormModal({
  open,
  editing,
  saving,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<DepartmentForm>(emptyForm);

  useEffect(() => {
    setForm(
      editing
        ? {
            name: editing.name,
            is_branch: editing.is_branch,
            description: editing.description ?? "",
          }
        : emptyForm,
    );
  }, [editing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) await onUpdate(editing.id, form);
    else await onCreate(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Department" : "Add Department/Branch"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., IT Department, Hawassa Branch"
            required
          />
        </Field>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_branch"
            checked={form.is_branch}
            onChange={(e) =>
              setForm({ ...form, is_branch: e.target.checked })
            }
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
          />
          <label
            htmlFor="is_branch"
            className="text-sm font-medium text-gray-700"
          >
            This is a branch location
          </label>
        </div>

        <Field label="Description">
          <TextArea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={2}
            placeholder="Optional description"
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
