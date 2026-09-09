"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Vendor } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Field, TextInput, Button } from "../components/FormControls";
import { Plus, Pencil, Trash2, Truck, Building2 } from "lucide-react";

// Vendor Management (Customization): the set of vendors/manufacturers
// offered on the License, Asset Model and Server Registration forms is
// configured here rather than typed as free text each time, so the
// same company name is always entered consistently.
export function VendorsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("vendors").select("*").order("label");
    if (data) setVendors(data as Vendor[]);
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

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setLabel(v.label);
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
          .from("vendors")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase.from("vendors").insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(editing ? "Vendor updated" : "Vendor created", "success");
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (v: Vendor) => {
    if (!confirm(`Delete vendor "${v.label}"?`)) return;
    const { error } = await supabase.from("vendors").delete().eq("id", v.id);
    if (error) toast(error.message, "error");
    else {
      toast("Vendor deleted", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Vendor Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {vendors.length} vendor{vendors.length === 1 ? "" : "s"} available
              on the License, Asset Model and Server Registration forms
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Vendor
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No vendors yet. Add one to make it available when registering.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {v.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      {v.code}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(v)}
                      className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
                      title="Rename"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
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
        title={editing ? "Rename Vendor" : "Add Vendor"}
        size="sm"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field
            label="Name"
            required
            hint="e.g., Microsoft, Dell, Cisco, VMware"
          >
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Microsoft"
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
