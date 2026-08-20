import { useCallback, useMemo } from "react";
import type { DeviceType } from "@/lib/supabase";
import {
  STD_FIELD_META,
  parseBaseFields,
  parseRequiredBaseFields,
  parseCoreFields,
  parseRequiredCoreFields,
  parseFieldLabels,
  parseExtraFields,
} from "@/lib/deviceTypeFields";

export function useDeviceFields(selectedType: DeviceType | null) {
  const baseFields = useMemo(
    () => parseBaseFields(selectedType),
    [selectedType],
  );
  const requiredBaseFields = useMemo(
    () => parseRequiredBaseFields(selectedType),
    [selectedType],
  );
  const coreFields = useMemo(
    () => parseCoreFields(selectedType),
    [selectedType],
  );
  const requiredCoreFields = useMemo(
    () => parseRequiredCoreFields(selectedType),
    [selectedType],
  );
  const fieldLabels = useMemo(
    () => parseFieldLabels(selectedType),
    [selectedType],
  );
  const extraFields = useMemo(
    () => parseExtraFields(selectedType),
    [selectedType],
  );
  const fieldLabel = useCallback(
    (key: string) => fieldLabels[key] ?? STD_FIELD_META[key]?.label ?? key,
    [fieldLabels],
  );
  const fieldPlaceholder = useCallback(
    (key: string) => STD_FIELD_META[key]?.placeholder,
    [],
  );
  return {
    baseFields,
    requiredBaseFields,
    coreFields,
    requiredCoreFields,
    extraFields,
    fieldLabel,
    fieldPlaceholder,
  };
}
