import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import type { LicenseType, LicenseSubtype, SubtypeDraftMap } from "../types";

/**
 * Owns loading/refreshing the license type + subtype lists, and every
 * mutation that isn't the "create/edit a type" form (see useLicenseTypeForm
 * for that). Kept separate from the form hook so each stays small and each
 * has a single, obvious reason to change.
 */
export function useLicenseTypes() {
  const { toast } = useToast();
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [subtypes, setSubtypes] = useState<LicenseSubtype[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtypeDrafts, setSubtypeDrafts] = useState<SubtypeDraftMap>({});
  const [savingSubtypeFor, setSavingSubtypeFor] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [typesRes, subtypesRes] = await Promise.all([
      supabase.from("license_types").select("*").order("label"),
      supabase.from("license_subtypes").select("*").order("label"),
    ]);
    if (typesRes.data) setTypes(typesRes.data as LicenseType[]);
    if (subtypesRes.data) setSubtypes(subtypesRes.data as LicenseSubtype[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subtypesByType = useMemo(() => {
    const map: Record<string, LicenseSubtype[]> = {};
    for (const s of subtypes) {
      (map[s.license_type_id] ??= []).push(s);
    }
    return map;
  }, [subtypes]);

  const setSubtypeDraft = (typeId: string, value: string) => {
    setSubtypeDrafts((d) => ({ ...d, [typeId]: value }));
  };

  const handleDeleteType = async (t: LicenseType) => {
    if (
      !confirm(
        `Delete license type "${t.label}"? Its subtypes will also be removed.`,
      )
    )
      return;
    const { error } = await supabase
      .from("license_types")
      .delete()
      .eq("id", t.id);
    if (error) toast(error.message, "error");
    else {
      toast("License type deleted", "success");
      loadData();
    }
  };

  const handleAddSubtype = async (typeId: string) => {
    const label = (subtypeDrafts[typeId] ?? "").trim();
    if (!label) {
      toast("Subtype name is required", "error");
      return;
    }
    setSavingSubtypeFor(typeId);
    const { error } = await supabase
      .from("license_subtypes")
      .insert({ license_type_id: typeId, label });
    setSavingSubtypeFor(null);
    if (error) {
      toast(error.message, "error");
    } else {
      setSubtypeDrafts((d) => ({ ...d, [typeId]: "" }));
      toast("Subtype added", "success");
      loadData();
    }
  };

  const handleDeleteSubtype = async (s: LicenseSubtype) => {
    if (!confirm(`Delete subtype "${s.label}"?`)) return;
    const { error } = await supabase
      .from("license_subtypes")
      .delete()
      .eq("id", s.id);
    if (error) toast(error.message, "error");
    else {
      toast("Subtype deleted", "success");
      loadData();
    }
  };

  return {
    types,
    subtypes,
    subtypesByType,
    loading,
    loadData,
    subtypeDrafts,
    setSubtypeDraft,
    savingSubtypeFor,
    handleDeleteType,
    handleAddSubtype,
    handleDeleteSubtype,
  };
}
