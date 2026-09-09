"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, AccessSwitch } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Field, TextInput, Button } from "../components/FormControls";
import { Plus, Pencil, Trash2, Network } from "lucide-react";

export function AccessSwitchesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [switches, setSwitches] = useState<AccessSwitch[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccessSwitch | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_switches")
      .select("*")
      .order("label");
    if (data) setSwitches(data as AccessSwitch[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setLabel("");
    setModalOpen(true);
  };

  const openEdit = (s: AccessSwitch) => {
    setEditing(s);
    setLabel(s.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase
          .from("access_switches")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase.from("access_switches").insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(
        editing ? "Access switch updated" : "Access switch added",
        "success",
      );
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (s: AccessSwitch) => {
    if (!confirm(`Delete access switch "${s.label}"?`)) return;
    const { error } = await supabase
      .from("access_switches")
      .delete()
      .eq("id", s.id);
    if (error) toast(error.message, "error");
    else {
      toast("Access switch deleted", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Network size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Access Switch Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {switches.length} access switch{switches.length === 1 ? "" : "es"}{" "}
              available on the PC Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Access Switch
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : switches.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No access switches yet. Add one to make it available on the PC
          Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {switches.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                    <Network size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      {s.code}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
                      title="Rename"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Rename Access Switch" : "Add Access Switch"}
        size="sm"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field
            label="Name"
            required
            hint="e.g., Access Switch 01, Core-SW-2F"
          >
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Access Switch 01"
              required
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
