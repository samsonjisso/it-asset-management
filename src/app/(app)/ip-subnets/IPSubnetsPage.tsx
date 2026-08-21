"use client";

import { useState } from "react";
import { IPSubnet } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { isValidIPPrefix } from "@/lib/validation";
import { useIPSubnets } from "./hooks/useIPSubnets";
import { SubnetsPageHeader } from "./components/SubnetsPageHeader";
import { SubnetsGrid } from "./components/SubnetsGrid";
import { SubnetFormModal } from "./components/SubnetFormModal";
import { SubnetFormState, emptySubnetForm } from "./types";

// Customization: lets an admin define IP subnet prefixes (e.g. "10.6.13.")
// and label them (e.g. "Head Office - Server Room"), so registration
// forms with an IP address field (starting with Server Registration)
// can automatically show which network segment an entered IP belongs to.
export function IPSubnetsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const { subnets, loading, saving, saveSubnet, deleteSubnet } = useIPSubnets();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IPSubnet | null>(null);
  const [form, setForm] = useState<SubnetFormState>({ ...emptySubnetForm });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptySubnetForm });
    setModalOpen(true);
  };

  const openEdit = (s: IPSubnet) => {
    setEditing(s);
    setForm({ prefix: s.prefix, label: s.label, notes: s.notes ?? "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.prefix.trim() || !form.label.trim()) {
      toast("IP prefix and label are required", "error");
      return;
    }
    if (!isValidIPPrefix(form.prefix)) {
      toast(
        "IP prefix must contain only numbers and dots, e.g. 10.6.13.",
        "error",
      );
      return;
    }

    const result = await saveSubnet(form, editing?.id ?? null);
    if (result.success) setModalOpen(false);
  };

  const handleDelete = (s: IPSubnet) => {
    if (!confirm(`Delete subnet "${s.prefix}" (${s.label})?`)) return;
    deleteSubnet(s.id);
  };

  return (
    <div className="space-y-4">
      <SubnetsPageHeader
        count={subnets.length}
        canManage={canManage}
        onAdd={openAdd}
      />

      <SubnetsGrid
        subnets={subnets}
        loading={loading}
        canManage={canManage}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <SubnetFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
