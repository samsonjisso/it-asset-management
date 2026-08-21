import { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../../../../components/Modal';
import { Button } from '../../../../components/FormControls';
import type { Department, IPAddress } from '../../../../lib/supabase';
import type { IPFormData, IPFormCheckState } from '../types/ipManagement.types';
import { registrationRoutes } from '../utils/ipConstants';
import { IPFormFields } from './IPFormFields';

type Props = {
  open: boolean;
  editing: IPAddress | null;
  form: IPFormData;
  departments: Department[];
  saving: boolean;
  checkState: IPFormCheckState;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <K extends keyof IPFormData>(
    field: K,
    value: IPFormData[K],
  ) => void;
  onCheck: () => void;
  onRegistrationTypeChange?: (route: string) => void;
};

export function IPFormModal({
  open,
  editing,
  form,
  departments,
  saving,
  checkState,
  onClose,
  onSave,
  onFieldChange,
  onCheck,
  onRegistrationTypeChange,
}: Props) {
  const router = useRouter();

  const handleRegistrationType = (value: string) => {
    if (value === 'ip') return;
    const route = registrationRoutes[value];
    if (!route) return;

    onClose();
    onRegistrationTypeChange?.(route);
    if (!onRegistrationTypeChange) router.push(route);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit IP Address' : 'Register New IP Address'}
      size="lg"
    >
      <form onSubmit={onSave} className="space-y-4">
        <IPFormFields
          form={form}
          departments={departments}
          editing={editing}
          checkState={checkState}
          onFieldChange={onFieldChange}
          onCheck={onCheck}
          onRegistrationTypeChange={handleRegistrationType}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {editing ? 'Update IP Address' : 'Register IP Address'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
