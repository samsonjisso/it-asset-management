import { Modal } from "../../../../components/Modal";
import {
  Field,
  TextInput,
  SelectInput,
  TextArea,
  Button,
} from "../../../../components/FormControls";
import { Reminder, ReminderFormState, ReminderType } from "../types";

interface ReminderFormModalProps {
  open: boolean;
  editing: Reminder | null;
  form: ReminderFormState;
  setForm: (form: ReminderFormState) => void;
  saving: boolean;
  reminderTypes: ReminderType[];
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export function ReminderFormModal({
  open,
  editing,
  form,
  setForm,
  saving,
  reminderTypes,
  onClose,
  onSave,
}: ReminderFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Reminder" : "Create New Reminder"}
      size="md"
    >
      <form onSubmit={onSave} className="space-y-4">
        <Field label="Reminder Name / Title" required>
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Quarterly Server Maintenance"
            required
          />
        </Field>
        <Field label="Reminder Type" required>
          <SelectInput
            value={form.reminder_type}
            onChange={(e) =>
              setForm({ ...form, reminder_type: e.target.value })
            }
            required
          >
            {reminderTypes.map((t) => (
              <option key={t.id} value={t.label}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Remind Date & Time" required>
          <TextInput
            type="datetime-local"
            value={form.remind_at}
            onChange={(e) => setForm({ ...form, remind_at: e.target.value })}
            required
          />
        </Field>
        <Field label="Detail">
          <TextArea
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
            rows={3}
            placeholder="Write details about this reminder..."
          />
        </Field>
        <Field label="Alert Email (optional)">
          <TextInput
            type="email"
            value={form.alert_email}
            onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
            placeholder="e.g., it-alerts@gohbetochbank.com"
          />
        </Field>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          The system will notify you in a popup one week before the reminder
          date and when the date arrives.
          {form.alert_email
            ? " An automated email will also be sent to the address above once the reminder date/time is reached."
            : " Add an alert email above to also receive an automated email when the reminder is due."}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Submit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
