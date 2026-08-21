import type { Department } from '../../../../lib/supabase';
import { Field, SelectInput, TextInput } from '../../../../components/FormControls';
import { Search, Wifi, WifiOff } from 'lucide-react';
import type { IPFormData, IPFormCheckState } from '../types/ipManagement.types';

type Props = {
  form: IPFormData;
  departments: Department[];
  checkState: IPFormCheckState;
  onFieldChange: <K extends keyof IPFormData>(field: K, value: IPFormData[K]) => void;
  onCheck: () => void;
};

export function IPCoreFields({ form, departments, checkState, onFieldChange, onCheck }: Props) {
  return (
    <>
      <Field label="IP Address" required>
        <div className="flex gap-2">
          <TextInput
            value={form.ip_address}
            onChange={(event) => onFieldChange('ip_address', event.target.value)}
            placeholder="e.g., 10.6.1.50"
            required
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={checkState === 'checking'}
            className="shrink-0 px-3 border border-gray-300 rounded-lg"
            title="Ping this IP to see if it's in use"
          >
            <Search size={16} />
          </button>
        </div>
        {checkState === 'assigned' && (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <WifiOff size={13} /> This IP responded to a ping — it's already assigned.
          </p>
        )}
        {checkState === 'available' && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Wifi size={13} /> This IP is available (no response).
          </p>
        )}
      </Field>

      <Field label="Hostname">
        <TextInput value={form.hostname} onChange={(e) => onFieldChange('hostname', e.target.value)} placeholder="e.g., PC-HQ-001" />
      </Field>

      <Field label="Department / Branch">
        <SelectInput value={form.department_id} onChange={(e) => onFieldChange('department_id', e.target.value)}>
          <option value="">Select department/branch</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name} {department.is_branch ? '(Branch)' : ''}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="IP Address Owner (Employee)">
        <TextInput value={form.ip_owner} onChange={(e) => onFieldChange('ip_owner', e.target.value)} placeholder="Employee responsible for this IP" />
      </Field>
    </>
  );
}
