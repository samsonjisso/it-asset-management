"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/FormControls";
import { Plus, BellRing } from "lucide-react";
import { useReminderTypes } from "./hooks/useReminderTypes";
import { ReminderTypeCard } from "./components/ReminderTypeCard";
import { ReminderTypeModal } from "./components/ReminderTypeModal";
import { ReminderType } from "./types";

export function ReminderTypesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { types, loading, saving, saveType, deleteType } =
    useReminderTypes();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderType | null>(null);
  const [label, setLabel] = useState("");

  const openAdd = () => {
    setEditing(null);
    setLabel("");
    setModalOpen(true);
  };

  const openEdit = (t: ReminderType) => {
    setEditing(t);
    setLabel(t.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveType(label, editing);
    if (ok) setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <BellRing size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Reminder Type Management
            </h1>
            <p className="text-sm text-gray-500">
              {types.length} reminder type{types.length === 1 ? "" : "s"}{" "}
              available on the Reminders form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Reminder Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No reminder types yet. Add one to make it available on the Reminders
          form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <ReminderTypeCard
              key={t.id}
              type={t}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={deleteType}
            />
          ))}
        </div>
      )}

      <ReminderTypeModal
        open={modalOpen}
        editing={editing}
        label={label}
        saving={saving}
        onLabelChange={setLabel}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
