"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, LicenseType, LicenseSubtype } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { Modal } from "../../../components/Modal";
import { Field, TextInput, Button } from "../../../components/FormControls";
import { Plus, Pencil, Trash2, Tags, Layers } from "lucide-react";

export function LicenseTypesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [subtypes, setSubtypes] = useState<LicenseSubtype[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LicenseType | null>(null);
  const [typeLabel, setTypeLabel] = useState("");
  const [savingType, setSavingType] = useState(false);

  const [subtypeDrafts, setSubtypeDrafts] = useState<Record<string, string>>(
    {},
  );
  const [savingSubtypeFor, setSavingSubtypeFor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [typesRes, subtypesRes] = await Promise.all([
      supabase.from("license_types").select("*").order("label"),
      supabase.from("license_subtypes").select("*").order("label"),
    ]);
    if (typesRes.data) setTypes(typesRes.data as LicenseType[]);
    if (subtypesRes.data) setSubtypes(subtypesRes.data as LicenseSubtype[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subtypesByType = useMemo(() => {
    const map: Record<string, LicenseSubtype[]> = {};
    for (const s of subtypes) {
      (map[s.license_type_id] ??= []).push(s);
    }
    return map;
  }, [subtypes]);

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
      loadData();
    }
  };

  const handleDeleteType = async (t: LicenseType) => {
    if (
      !confirm(
        `Delete license type "${t.label}"? Its subtypes will also be removed.`,
      )
    )
      return;
    const { error } = await supabase
      .from("license_types")
      .delete()
      .eq("id", t.id);
    if (error) toast(error.message, "error");
    else {
      toast("License type deleted", "success");
      loadData();
    }
  };

  const handleAddSubtype = async (typeId: string) => {
    const label = (subtypeDrafts[typeId] ?? "").trim();
    if (!label) {
      toast("Subtype name is required", "error");
      return;
    }
    setSavingSubtypeFor(typeId);
    const { error } = await supabase
      .from("license_subtypes")
      .insert({ license_type_id: typeId, label });
    setSavingSubtypeFor(null);
    if (error) {
      toast(error.message, "error");
    } else {
      setSubtypeDrafts((d) => ({ ...d, [typeId]: "" }));
      toast("Subtype added", "success");
      loadData();
    }
  };

  const handleDeleteSubtype = async (s: LicenseSubtype) => {
    if (!confirm(`Delete subtype "${s.label}"?`)) return;
    const { error } = await supabase
      .from("license_subtypes")
      .delete()
      .eq("id", s.id);
    if (error) toast(error.message, "error");
    else {
      toast("Subtype deleted", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Tags size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              License Type Management
            </h1>
            <p className="text-sm text-gray-500">
              {types.length} license type{types.length === 1 ? "" : "s"}{" "}
              available on the License Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAddType}>
            <Plus size={16} /> Add License Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No license types yet. Add one to make it available on the License
          Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {types.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 gbb-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-400 font-mono">{t.code}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditType(t)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Rename"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteType(t)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Subtypes
                </p>
                {(subtypesByType[t.id] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic mb-2">
                    No subtypes yet
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(subtypesByType[t.id] ?? []).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                      >
                        {s.label}
                        {canManage && (
                          <button
                            onClick={() => handleDeleteSubtype(s)}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Delete subtype"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {canManage && (
                  <div className="flex gap-2">
                    <TextInput
                      value={subtypeDrafts[t.id] ?? ""}
                      onChange={(e) =>
                        setSubtypeDrafts((d) => ({
                          ...d,
                          [t.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubtype(t.id);
                        }
                      }}
                      placeholder="New subtype name"
                      className="flex-1 !py-2 !text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSubtype(t.id)}
                      loading={savingSubtypeFor === t.id}
                    >
                      <Plus size={14} /> Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title={editingType ? "Rename License Type" : "Add License Type"}
        size="sm"
      >
        <form onSubmit={handleSaveType} className="space-y-4">
          <Field
            label="Name"
            required
            hint="e.g., Antivirus License, Firewall License"
          >
            <TextInput
              value={typeLabel}
              onChange={(e) => setTypeLabel(e.target.value)}
              placeholder="e.g., Antivirus License"
              required
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTypeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingType}>
              {savingType ? "Saving..." : editingType ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
