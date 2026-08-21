import type { IPAddress } from '../../../../lib/supabase';
import { Field, SelectInput, TextArea, TextInput } from '../../../../components/FormControls';
import type { IPFormData } from '../types/ipManagement.types';
import { statusOptions } from '../utils/ipConstants';

type Props = {
  form: IPFormData;
  onFieldChange: <K extends keyof IPFormData>(field: K, value: IPFormData[K]) => void;
};

export function IPNetworkFields({ form, onFieldChange }: Props) {
  return (
    <>
      <Field label="MAC Address">
        <TextInput value={form.mac_address} onChange={(e) => onFieldChange('mac_address', e.target.value)} placeholder="00:1A:2B:3C:4D:5E" />
      </Field>

      <Field label="Access Switch Port / Interface Number">
        <TextInput value={form.access_switch_port} onChange={(e) => onFieldChange('access_switch_port', e.target.value)} placeholder="e.g., Gi1/0/24" />
      </Field>

      <Field label="Patch Panel Label / Number">
        <TextInput value={form.patch_panel_label} onChange={(e) => onFieldChange('patch_panel_label', e.target.value)} placeholder="e.g., PP-3F-A12" />
      </Field>

      <Field label="Status">
        <SelectInput value={form.status} onChange={(e) => onFieldChange('status', e.target.value as IPAddress['status'])}>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Notes">
        <TextArea value={form.notes} onChange={(e) => onFieldChange('notes', e.target.value)} rows={2} placeholder="Additional notes..." />
      </Field>
    </>
  );
}
