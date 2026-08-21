import { ALL_CORE_FIELDS } from "@/lib/deviceTypeFields";
import type { DeviceTypeEditorState } from "../types";

export const createInitialEditorState = (): DeviceTypeEditorState => ({
  mode: "create",
  editingTypeId: null,
  label: "",
  icon: "HardDrive",
  baseFields: [],
  requiredBaseFields: [],
  coreFields: [...ALL_CORE_FIELDS],
  requiredCoreFields: ["device_owner", "hostname"],
  fieldLabels: {},
  extraFields: [],
  editingStdFieldKey: null,
  editingStdFieldLabel: "",
  editingFieldKey: null,
  editingFieldLabel: "",
  newField: {
    label: "",
    required: false,
    type: "text",
  },
  saving: false,
  open: false,
});
