import { useCallback, useState } from "react";
import {
  parseBaseFields,
  parseCoreFields,
  parseExtraFields,
  parseFieldLabels,
  parseRequiredBaseFields,
  parseRequiredCoreFields,
} from "@/lib/deviceTypeFields";
import { useToast } from "@/components/Toast";
import type { DeviceType } from "@/lib/supabase";
import { createInitialEditorState } from "../utils/editorDefaults";
import { validateDeviceType } from "../utils/deviceTypeValidation";
import type { DeviceTypeEditorState } from "../types";
import { useStandardFieldActions } from "./useStandardFieldActions";
import { useExtraFieldActions } from "./useExtraFieldActions";

export function useDeviceTypeEditor() {
  const { toast } = useToast();
  const [state, setState] = useState<DeviceTypeEditorState>(
    createInitialEditorState(),
  );

  const patch = useCallback(
    (changes: Partial<DeviceTypeEditorState>) =>
      setState((current) => ({ ...current, ...changes })),
    [],
  );

  const openCreate = useCallback(() => {
    setState({ ...createInitialEditorState(), open: true });
  }, []);

  const openEdit = useCallback((type: DeviceType) => {
    setState({
      ...createInitialEditorState(),
      open: true,
      mode: "edit",
      editingTypeId: type.id,
      label: type.label,
      icon: type.icon || "HardDrive",
      baseFields: parseBaseFields(type),
      requiredBaseFields: parseRequiredBaseFields(type),
      coreFields: parseCoreFields(type),
      requiredCoreFields: parseRequiredCoreFields(type),
      fieldLabels: parseFieldLabels(type),
      extraFields: parseExtraFields(type),
    });
  }, []);

  const close = useCallback(() => {
    setState(createInitialEditorState());
  }, []);

  const validate = useCallback(
    (existing: DeviceType[] = []) => {
      const result = validateDeviceType(state, existing);
      if (!result.ok) toast(result.message, "error");
      return result;
    },
    [state, toast],
  );

  const setSaving = (saving: boolean) => patch({ saving });

  const standard = useStandardFieldActions(state, setState);
  const extra = useExtraFieldActions(state, setState);

  return {
    ...state,
    patch,
    openCreate,
    openEdit,
    close,
    validate,
    setSaving,
    ...standard,
    ...extra,
  };
}
