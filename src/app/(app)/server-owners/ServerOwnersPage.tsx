"use client";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { Button } from "../../../components/FormControls";
import { Plus, Briefcase } from "lucide-react";
import { useServerOwners } from "./hooks/useServerOwners";
import { ServerOwnerCard } from "./components/ServerOwnerCard";
import { ServerOwnerModal } from "./components/ServerOwnerModal";
import type { ServerOwner } from "./types";

export function ServerOwnersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const { owners, loading, saveOwner, deleteOwner } = useServerOwners();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerOwner | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setLabel("");
    setModalOpen(true);
  };

  const openEdit = (o: ServerOwner) => {
    setEditing(o);
    setLabel(o.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    const ok = await saveOwner(label, editing);
    setSaving(false);
    if (ok) setModalOpen(false);
  };

  const handleDelete = async (o: ServerOwner) => {
    if (!confirm(`Delete server owner "${o.label}"?`)) return;
    await deleteOwner(o);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Server Owner Management
            </h1>
            <p className="text-sm text-gray-500">
              {owners.length} owner department{owners.length === 1 ? "" : "s"}{" "}
              available on the Server Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Server Owner
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : owners.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No server owner departments yet. Add one to make it available on the
          Server Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((o) => (
            <ServerOwnerCard
              key={o.id}
              owner={o}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ServerOwnerModal
        open={modalOpen}
        editing={editing}
        label={label}
        saving={saving}
        onLabelChange={setLabel}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
