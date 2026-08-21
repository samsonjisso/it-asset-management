import type { LicenseType, LicenseSubtype } from "../../../lib/supabase";

export type { LicenseType, LicenseSubtype };

export type SubtypeDraftMap = Record<string, string>;

export interface LicenseTypeCardProps {
  type: LicenseType;
  subtypes: LicenseSubtype[];
  canManage: boolean;
  subtypeDraft: string;
  savingSubtype: boolean;
  onChangeDraft: (typeId: string, value: string) => void;
  onAddSubtype: (typeId: string) => void;
  onDeleteSubtype: (subtype: LicenseSubtype) => void;
  onEditType: (type: LicenseType) => void;
  onDeleteType: (type: LicenseType) => void;
}

export interface SubtypeChipProps {
  subtype: LicenseSubtype;
  canManage: boolean;
  onDelete: (subtype: LicenseSubtype) => void;
}

export interface LicenseTypeFormModalProps {
  open: boolean;
  editingType: LicenseType | null;
  typeLabel: string;
  saving: boolean;
  onChangeLabel: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}
