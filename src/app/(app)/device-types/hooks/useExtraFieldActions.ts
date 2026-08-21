import type { Dispatch, SetStateAction } from "react";
import type { DeviceTypeField } from "@/lib/supabase";
import type { DeviceTypeEditorState } from "../types";
import { makeFieldKey, nextExtraFieldType } from "../utils/editorFieldHelpers";

export function useExtraFieldActions(
  state: DeviceTypeEditorState,
  setState: Dispatch<SetStateAction<DeviceTypeEditorState>>,
) {
  const updateField = (
    key: string,
    updater: (field: DeviceTypeField) => DeviceTypeField,
  ) => {
    setState((current) => ({
      ...current,
      extraFields: current.extraFields.map((field) =>
        field.key === key ? updater(field) : field,
      ),
    }));
  };

  const addExtraField = () => {
    const label = state.newField.label.trim();
    if (!label) return;

    const field: DeviceTypeField = {
      key: makeFieldKey(label, state.extraFields),
      label,
      required: state.newField.required,
      type: state.newField.type,
    };

    setState((current) => ({
      ...current,
      extraFields: [...current.extraFields, field],
      newField: { label: "", required: false, type: "text" },
    }));
  };

  const removeExtraField = (key: string) => {
    setState((current) => ({
      ...current,
      extraFields: current.extraFields.filter((field) => field.key !== key),
      editingFieldKey:
        current.editingFieldKey === key ? null : current.editingFieldKey,
      editingFieldLabel:
        current.editingFieldKey === key ? "" : current.editingFieldLabel,
    }));
  };

  const cycleExtraFieldType = (key: string) => {
    updateField(key, (field) => ({
      ...field,
      type: nextExtraFieldType(field.type),
    }));
  };

  const toggleExtraFieldRequired = (key: string) => {
    updateField(key, (field) => ({
      ...field,
      required: !field.required,
    }));
  };

  const startRenameExtraField = (field: DeviceTypeField) => {
    setState((current) => ({
      ...current,
      editingFieldKey: field.key,
      editingFieldLabel: field.label,
    }));
  };

  const saveRenameExtraField = () => {
    const key = state.editingFieldKey;
    const label = state.editingFieldLabel.trim();

    if (!key || !label) {
      setState((current) => ({
        ...current,
        editingFieldKey: null,
        editingFieldLabel: "",
      }));
      return;
    }

    updateField(key, (field) => ({ ...field, label }));
    setState((current) => ({
      ...current,
      editingFieldKey: null,
      editingFieldLabel: "",
    }));
  };

  return {
    addExtraField,
    removeExtraField,
    cycleExtraFieldType,
    toggleExtraFieldRequired,
    startRenameExtraField,
    saveRenameExtraField,
  };
}
