import type { DeviceType, DeviceTypeField } from "@/lib/supabase";

export type EditorMode = "create" | "edit";
export type ExtraFieldType = "text" | "number" | "date";

export interface DeviceTypeFormState {
  label: string;
  icon: string;
  baseFields: string[];
  requiredBaseFields: string[];
  coreFields: string[];
  requiredCoreFields: string[];
  fieldLabels: Record<string, string>;
  extraFields: DeviceTypeField[];
}

export interface NewExtraFieldState {
  label: string;
  required: boolean;
  type: ExtraFieldType;
}

export interface DeviceTypeEditorState extends DeviceTypeFormState {
  mode: EditorMode;
  editingTypeId: string | null;
  editingStdFieldKey: string | null;
  editingStdFieldLabel: string;
  editingFieldKey: string | null;
  editingFieldLabel: string;
  newField: NewExtraFieldState;
  saving: boolean;
  open: boolean;
}

export type DeviceTypePayload = Omit<
  DeviceType,
  "id" | "created_at" | "updated_at"
>;

export interface DeviceTypeValidationResult {
  ok: boolean;
  value?: DeviceTypePayload;
}


export type DeviceTypeEditorActions = {
  patch: (changes: Partial<DeviceTypeEditorState>) => void;
  openCreate: () => void;
  openEdit: (type: DeviceType) => void;
  close: () => void;
  validate: (existing?: DeviceType[]) => DeviceTypeValidationResult;
  toggleStandardIncluded: (key: string) => void;
  toggleStandardRequired: (key: string) => void;
  addExtraField: () => void;
  removeExtraField: (key: string) => void;
  cycleExtraFieldType: (key: string) => void;
  toggleExtraFieldRequired: (key: string) => void;
  startRenameExtraField: (field: DeviceTypeField) => void;
  saveRenameExtraField: () => void;
  startRenameStandardField: (key: string) => void;
  saveRenameStandardField: () => void;
  cancelRenameStandardField: () => void;
  setSaving: (saving: boolean) => void;
};
