import { AssetModel } from '@/lib/supabase';

// Shape of the create/edit form. Kept separate from AssetModel because
// the form always deals with strings/nulls for controlled inputs.
export interface AssetModelForm {
  target: AssetModel['target'];
  device_type: string;
  name: string;
  manufacturer: string;
  image: string | null;
  notes: string;
}

export const emptyForm: AssetModelForm = {
  target: 'pc',
  device_type: '',
  name: '',
  manufacturer: '',
  image: null,
  notes: '',
};

export type AssetFilter = 'all' | 'pc' | 'device';

export const FILTER_OPTIONS: AssetFilter[] = ['all', 'pc', 'device'];

export function filterLabel(f: AssetFilter): string {
  if (f === 'all') return 'All';
  if (f === 'pc') return 'PC Models';
  return 'Device Models';
}

// Converts a form's current values into the payload shape expected by
// the `asset_models` table. Centralized here so the insert/update path
// in useAssetModelForm and any future callers stay in sync.
export function toPayload(form: AssetModelForm) {
  return {
    target: form.target,
    device_type: form.target === 'device' ? form.device_type || null : null,
    name: form.name.trim(),
    manufacturer: form.manufacturer || null,
    image: form.image,
    notes: form.notes || null,
  };
}
