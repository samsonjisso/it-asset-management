import { Modal } from '../../../../components/Modal';
import { Field, TextInput, Button } from '../../../../components/FormControls';
import type { ServerType } from '../types';

interface ServerTypeModalProps {
  open: boolean;
  editing: ServerType | null;
  label: string;
  saving: boolean;
  onLabelChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ServerTypeModal({
  open,
  editing,
  label,
  saving,
  onLabelChange,
  onClose,
  onSubmit,
}: ServerTypeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Rename Server Type' : 'Add Server Type'} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" required hint="e.g., Redhat, Ubuntu, Windows Server, AIX">
          <TextInput
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g., CentOS"
            required
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
