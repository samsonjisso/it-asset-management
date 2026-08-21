"use client";

import { IPSubnet } from "../../../../lib/supabase";
import { Modal } from "../../../../components/Modal";
import {
  Field,
  TextInput,
  TextArea,
  Button,
} from "../../../../components/FormControls";
import { digitsAndDotsKeyDown } from "../../../../lib/validation";
import { SubnetFormState } from "../types";

interface SubnetFormModalProps {
  open: boolean;
  editing: IPSubnet | null;
  form: SubnetFormState;
  saving: boolean;
  onClose: () => void;
  onChange: (form: SubnetFormState) => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}

export function SubnetFormModal({
  open,
  editing,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: SubnetFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Subnet" : "Add Subnet"}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="IP Prefix"
          required
          hint='e.g., "10.6.13." matches any IP starting with 10.6.13'
        >
          <TextInput
            value={form.prefix}
            onChange={(e) => onChange({ ...form, prefix: e.target.value })}
            onKeyDown={digitsAndDotsKeyDown}
            placeholder="10.6.13."
            required
            autoFocus
          />
        </Field>

        <Field label="Label" required hint="What this subnet is / where it is">
          <TextInput
            value={form.label}
            onChange={(e) => onChange({ ...form, label: e.target.value })}
            placeholder="e.g., Head Office - Server Room"
            required
          />
        </Field>

        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
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
