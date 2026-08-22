"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase, License, LicenseType } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../components/Toast";
import { LicenseFormData, LicenseRegistrationPageProps } from "../types";

const emptyForm: LicenseFormData = {
  license_type: "",
  license_subtype: "",
  vendor: "",
  license_key: "",
  number_of_licenses: "",
  effective_date: "",
  expiry_date: "",
  notes: "",
};

export function useLicenseForm(
  licenseTypeOptions: LicenseType[],
  loadData: () => Promise<void>,
  autoOpenCreate?: LicenseRegistrationPageProps["autoOpenCreate"],
) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState<LicenseFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [skipKey, setSkipKey] = useState(false);

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm({ ...emptyForm, license_type: licenseTypeOptions[0]?.code ?? "" });
    setSkipKey(false);
    setModalOpen(true);
  }, [licenseTypeOptions]);

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate, openAdd]);

  const openEdit = useCallback((rec: License) => {
    setEditing(rec);
    setForm({
      license_type: rec.license_type,
      license_subtype: rec.license_subtype ?? "",
      vendor: rec.vendor ?? "",
      license_key: rec.license_key ?? "",
      number_of_licenses: rec.number_of_licenses?.toString() ?? "",
      effective_date: rec.effective_date ?? "",
      expiry_date: rec.expiry_date ?? "",
      notes: rec.notes ?? "",
    });
    setSkipKey(!rec.license_key);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.license_type) {
      toast("License Type is required. Ask an admin to add one under License Type Management.", "error");
      return;
    }
    if (form.number_of_licenses.trim() && !/^\d+$/.test(form.number_of_licenses.trim())) {
      toast("Number of Licenses must be a whole number", "error");
      return;
    }
    if (form.effective_date && form.expiry_date && form.expiry_date < form.effective_date) {
      toast("Expiry Date cannot be before the Effective Date", "error");
      return;
    }
    setSaving(true);
    const payload = {
      license_type: form.license_type,
      license_subtype: form.license_subtype || null,
      vendor: form.vendor || null,
      license_key: skipKey ? null : form.license_key || null,
      number_of_licenses: form.number_of_licenses ? parseInt(form.number_of_licenses) : null,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from("licenses").update(payload).eq("id", editing.id)
      : await supabase.from("licenses").insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(editing ? "License updated" : "License registered", "success");
      setModalOpen(false);
      loadData();
    }
  }, [form, editing, skipKey, profile, toast, loadData]);

  return {
    modalOpen, setModalOpen, editing, form, setForm,
    saving, skipKey, setSkipKey, openAdd, openEdit, handleSave,
  };
}
