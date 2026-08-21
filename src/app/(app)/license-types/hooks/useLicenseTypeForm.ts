import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import type { LicenseType } from "../types";

/**
 * Owns the "add / rename license type" modal: its open state, the form
 * field, and the save mutation. Takes an `onSaved` callback so it can
 * trigger a list refresh without needing to know about useLicenseTypes.
 */
export function useLicenseTypeForm(onSaved: () => void) {
  const { toast } = useToast();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LicenseType | null>(null);
  const [typeLabel, setTypeLabel] = useState("");
  const [savingType, setSavingType] = useState(false);

  const openAddType = () => {
    setEditingType(null);
    setTypeLabel("");
    setTypeModalOpen(true);
  };

  const openEditType = (t: LicenseType) => {
    setEditingType(t);
    setTypeLabel(t.label);
    setTypeModalOpen(true);
  };

  const closeModal = () => setTypeModalOpen(false);

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeLabel.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSavingType(true);
    const { error } = editingType
      ? await supabase
          .from("license_types")
          .update({ label: typeLabel.trim() })
          .eq("id", editingType.id)
      : await supabase
          .from("license_types")
          .insert({ label: typeLabel.trim() });
    setSavingType(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(
        editingType ? "License type updated" : "License type created",
        "success",
      );
      setTypeModalOpen(false);
      onSaved();
    }
  };

  return {
    typeModalOpen,
    editingType,
    typeLabel,
    setTypeLabel,
    savingType,
    openAddType,
    openEditType,
    closeModal,
    handleSaveType,
  };
}
