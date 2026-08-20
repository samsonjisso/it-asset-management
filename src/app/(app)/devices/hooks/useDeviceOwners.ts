import { useState, type Dispatch, type SetStateAction } from "react";
import { supabase, type DeviceOwner } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

export function useDeviceOwners(
  owners: DeviceOwner[],
  setOwners: Dispatch<SetStateAction<DeviceOwner[]>>,
) {
  const { toast } = useToast();
  const [managerOpen, setManagerOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const addOwner = async () => {
    const label = newLabel.trim();
    if (!label) return;
    if (
      owners.some((owner) => owner.label.toLowerCase() === label.toLowerCase())
    ) {
      toast("That owner/department already exists", "error");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("device_owners")
      .insert({ label })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setOwners((current) =>
      [...current, data as DeviceOwner].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    );
    setNewLabel("");
  };
  const startRename = (owner: DeviceOwner) => {
    setEditingId(owner.id);
    setEditingLabel(owner.label);
  };
  const cancelRename = () => {
    setEditingId(null);
    setEditingLabel("");
  };
  const saveRename = async () => {
    const label = editingLabel.trim();
    if (!label || !editingId) return cancelRename();
    const { data, error } = await supabase
      .from("device_owners")
      .update({ label })
      .eq("id", editingId)
      .select()
      .single();
    if (error) {
      toast(error.message, "error");
      return;
    }
    setOwners((current) =>
      current
        .map((owner) => (owner.id === data.id ? (data as DeviceOwner) : owner))
        .sort((a, b) => a.label.localeCompare(b.label)),
    );
    cancelRename();
  };
  const deleteOwner = async (owner: DeviceOwner) => {
    if (!confirm(`Delete owner/department "${owner.label}"?`)) return false;
    const { error } = await supabase
      .from("device_owners")
      .delete()
      .eq("id", owner.id);
    if (error) {
      toast(error.message, "error");
      return false;
    }
    toast("Owner/department deleted", "success");
    setOwners((current) => current.filter((item) => item.id !== owner.id));
    return true;
  };
  return {
    managerOpen,
    setManagerOpen,
    newLabel,
    setNewLabel,
    saving,
    editingId,
    editingLabel,
    setEditingLabel,
    addOwner,
    startRename,
    cancelRename,
    saveRename,
    deleteOwner,
  };
}
