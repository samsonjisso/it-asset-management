import type { Department, IPAddress } from '../../../../lib/supabase';
import { Field, SelectInput } from '../../../../components/FormControls';
import type { IPFormData, IPFormCheckState } from '../types/ipManagement.types';
import { IPCoreFields } from './IPCoreFields';
import { IPNetworkFields } from './IPNetworkFields';

type Props = {
  form: IPFormData;
  departments: Department[];
  editing: IPAddress | null;
  checkState: IPFormCheckState;
  onFieldChange: <K extends keyof IPFormData>(field: K, value: IPFormData[K]) => void;
  onCheck: () => void;
  onRegistrationTypeChange: (value: string) => void;
};

export function IPFormFields(props: Props) {
  const { form, departments, editing, checkState, onFieldChange, onCheck, onRegistrationTypeChange } = props;

  return (
    <>
      {!editing && (
        <Field label="Registration Type" required hint="Choose the asset form to open">
          <SelectInput value="ip" onChange={(e) => onRegistrationTypeChange(e.target.value)}>
            <option value="ip">IP Address</option>
            <option value="pc">PC</option>
            <option value="device">Device</option>
            <option value="server">Server</option>
          </SelectInput>
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IPCoreFields
          form={form}
          departments={departments}
          checkState={checkState}
          onFieldChange={onFieldChange}
          onCheck={onCheck}
        />
        <IPNetworkFields form={form} onFieldChange={onFieldChange} />
      </div>
    </>
  );
}
