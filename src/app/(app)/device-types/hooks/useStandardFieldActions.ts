import type { Dispatch, SetStateAction } from "react";
import { isCoreField } from "../utils/editorFieldHelpers";
import type { DeviceTypeEditorState } from "../types";
import { getStandardFieldLabel } from "../utils/editorFieldHelpers";

export function useStandardFieldActions(
  state: DeviceTypeEditorState,
  setState: Dispatch<SetStateAction<DeviceTypeEditorState>>,
) {
  const toggleStandardIncluded = (key: string) => {
    setState((current) => {
      const isCore = isCoreField(key);
      const fields = isCore ? current.coreFields : current.baseFields;
      const next = fields.includes(key)
        ? fields.filter((item) => item !== key)
        : [...fields, key];

      if (isCore) {
        return {
          ...current,
          coreFields: next,
          requiredCoreFields: next.includes(key)
            ? current.requiredCoreFields
            : current.requiredCoreFields.filter((item) => item !== key),
        };
      }

      return {
        ...current,
        baseFields: next,
        requiredBaseFields: next.includes(key)
          ? current.requiredBaseFields
          : current.requiredBaseFields.filter((item) => item !== key),
      };
    });
  };

  const toggleStandardRequired = (key: string) => {
    setState((current) => {
      const isCore = isCoreField(key);
      const required = isCore
        ? current.requiredCoreFields
        : current.requiredBaseFields;
      const next = required.includes(key)
        ? required.filter((item) => item !== key)
        : [...required, key];

      return isCore
        ? { ...current, requiredCoreFields: next }
        : { ...current, requiredBaseFields: next };
    });
  };

  const startRenameStandardField = (key: string) => {
    setState((current) => ({
      ...current,
      editingStdFieldKey: key,
      editingStdFieldLabel: getStandardFieldLabel(key, current.fieldLabels),
    }));
  };

  const saveRenameStandardField = () => {
    setState((current) => {
      const key = current.editingStdFieldKey;
      const label = current.editingStdFieldLabel.trim();
      if (!key) return current;

      const labels = { ...current.fieldLabels };
      const defaultLabel = getStandardFieldLabel(key, {});

      if (!label || label === defaultLabel) delete labels[key];
      else labels[key] = label;

      return {
        ...current,
        fieldLabels: labels,
        editingStdFieldKey: null,
        editingStdFieldLabel: "",
      };
    });
  };

  const cancelRenameStandardField = () => {
    setState((current) => ({
      ...current,
      editingStdFieldKey: null,
      editingStdFieldLabel: "",
    }));
  };

  return {
    toggleStandardIncluded,
    toggleStandardRequired,
    startRenameStandardField,
    saveRenameStandardField,
    cancelRenameStandardField,
  };
}
