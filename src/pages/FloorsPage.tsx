"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Floor } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Field, TextInput, Button } from "../components/FormControls";
import {
  Plus,
  Pencil,
  Trash2,
  Building,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export function FloorsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Floor | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("floors")
      .select("*")
      .order("position");
    if (data) setFloors(data as Floor[]);
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

  const openEdit = (f: Floor) => {
    setEditing(f);
    setLabel(f.label);
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
          .from("floors")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase.from("floors").insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(editing ? "Floor updated" : "Floor added", "success");
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (f: Floor) => {
    if (!confirm(`Delete floor "${f.label}"?`)) return;
    const { error } = await supabase.from("floors").delete().eq("id", f.id);
    if (error) toast(error.message, "error");
    else {
      toast("Floor deleted", "success");
      loadData();
    }
  };

  // Reorder (Admin Customization > Floors): swaps this floor's
  // position with its neighbor above/below and saves both, so the
  // Register New PC dropdown reflects the admin-defined order rather
  // than alphabetical.
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= floors.length || reordering) return;
    const a = floors[index]!;
    const b = floors[target]!;
    setReordering(true);
    const next = [...floors];
    next[index] = b;
    next[target] = a;
    setFloors(next);
    const [{ error: errA }, { error: errB }] = await Promise.all([
      supabase.from("floors").update({ position: b.position }).eq("id", a.id),
      supabase.from("floors").update({ position: a.position }).eq("id", b.id),
    ]);
    setReordering(false);
    if (errA || errB) {
      toast(
        errA?.message || errB?.message || "Could not reorder floors",
        "error",
      );
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Building size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Floor / Location Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {floors.length} floor{floors.length === 1 ? "" : "s"} available on
              the PC Registration form for Head Office — use the arrows to
              reorder
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Floor
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : floors.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No floors yet. Add one to make it available on the PC Registration
          form.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 divide-y divide-gray-100 overflow-hidden">
          {floors.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col -my-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reordering}
                  className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600"
                  title="Move up"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === floors.length - 1 || reordering}
                  className="text-gray-300 dark:text-gray-600 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600"
                  title="Move down"
                >
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center shrink-0">
                <Building size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {f.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {f.code}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(f)}
                    className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
                    title="Rename"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Rename Floor" : "Add Floor"}
        size="sm"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field
            label="Name"
            required
            hint="e.g., Ground Floor, 1st Floor, 2nd Floor"
          >
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., 4th Floor"
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
