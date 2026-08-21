import { Modal } from '@/components/Modal';
import { Field, TextInput, TextArea, SelectInput, Button } from '@/components/FormControls';
import { ImageInput } from '@/components/ImageInput';
import { AssetModel, DeviceType } from '@/lib/supabase';
import { AssetModelForm } from '../types/assetModel.types';

interface AssetModelFormModalProps {
  open: boolean;
  editing: AssetModel | null;
  form: AssetModelForm;
  setForm: (form: AssetModelForm) => void;
  deviceTypes: DeviceType[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}

// Presentational add/edit form. All state lives in useAssetModelForm;
// this component only renders inputs and forwards change events, so
// swapping the modal's layout later doesn't touch any business logic.
export function AssetModelFormModal({
  open,
  editing,
  form,
  setForm,
  deviceTypes,
  saving,
  onClose,
  onSubmit,
}: AssetModelFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Model' : 'Add Model'} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Register This Model Under" required>
          <SelectInput
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value as AssetModel['target'] })}
          >
            <option value="pc">PC Registration</option>
            <option value="device">Device Registration</option>
          </SelectInput>
        </Field>
        {form.target === 'device' && (
          <Field label="Device Type" hint="Optional — narrows this model to a specific device type">
            <SelectInput value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
              <option value="">Any device type</option>
              {deviceTypes.map((t) => (
                <option key={t.id} value={t.code}>{t.label}</option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label="Model Name" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Dell OptiPlex 7010"
            required
            autoFocus
          />
        </Field>
        <Field label="Manufacturer">
          <TextInput
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            placeholder="e.g., Dell, HP, Cisco"
          />
        </Field>
        <ImageInput
          value={form.image}
          onChange={(dataUrl) => setForm({ ...form, image: dataUrl })}
          hint="Shown as the default photo when this model is selected"
        />
        <Field label="Notes">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
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
