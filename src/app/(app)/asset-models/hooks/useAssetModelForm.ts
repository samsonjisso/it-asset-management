import { useState } from "react";
import { supabase, AssetModel } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import {
  AssetModelForm,
  emptyForm,
  toPayload,
} from "../types/assetModel.types";

// Encapsulates everything related to the create/edit modal: its open
// state, the current form values, and the save/delete mutations.
// `onSaved` lets the caller trigger a data reload without this hook
// needing to know how the list is fetched.
export function useAssetModelForm(onSaved: () => void) {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetModel | null>(null);
  const [form, setForm] = useState<AssetModelForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (m: AssetModel) => {
    setEditing(m);
    setForm({
      target: m.target,
      device_type: m.device_type ?? "",
      name: m.name,
      manufacturer: m.manufacturer ?? "",
      image: m.image ?? null,
      notes: m.notes ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Model name is required", "error");
      return;
    }
    setSaving(true);
    const payload = toPayload(form);
    const { error } = editing
      ? await supabase.from("asset_models").update(payload).eq("id", editing.id)
      : await supabase.from("asset_models").insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast(editing ? "Model updated" : "Model added", "success");
    setModalOpen(false);
    onSaved();
  };

  const handleDelete = async (m: AssetModel) => {
    if (!confirm(`Delete model "${m.name}"?`)) return;
    const { error } = await supabase
      .from("asset_models")
      .delete()
      .eq("id", m.id);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Model deleted", "success");
    onSaved();
  };

  return {
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  };
}
