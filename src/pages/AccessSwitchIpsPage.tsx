"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, AccessSwitchIp } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { Field, TextInput, Button } from "../components/FormControls";
import { isValidIPv4, IPV4_PATTERN } from "../lib/validation";
import { Plus, Pencil, Trash2, Router } from "lucide-react";

export function AccessSwitchIpsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const { toast } = useToast();
  const [ips, setIps] = useState<AccessSwitchIp[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccessSwitchIp | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_switch_ips")
      .select("*")
      .order("label");
    if (data) setIps(data as AccessSwitchIp[]);
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

  const openEdit = (ip: AccessSwitchIp) => {
    setEditing(ip);
    setLabel(ip.label);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast("IP Address is required", "error");
      return;
    }
    if (!isValidIPv4(label)) {
      toast("Enter a valid IPv4 address (e.g. 10.6.1.103)", "error");
      return;
    }
    const normalized = label.trim();
    const conflict = ips.find(
      (ip) => ip.id !== editing?.id && ip.label.trim() === normalized,
    );
    if (conflict) {
      toast(
        `"${normalized}" is already registered as an access switch IP.`,
        "error",
      );
      return;
    }
    setSaving(true);
    const { error } = editing
      ? await supabase
          .from("access_switch_ips")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase
          .from("access_switch_ips")
          .insert({ label: label.trim() });
    setSaving(false);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(
        editing ? "Access switch IP updated" : "Access switch IP added",
        "success",
      );
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (ip: AccessSwitchIp) => {
    if (!confirm(`Delete access switch IP "${ip.label}"?`)) return;
    const { error } = await supabase
      .from("access_switch_ips")
      .delete()
      .eq("id", ip.id);
    if (error) toast(error.message, "error");
    else {
      toast("Access switch IP deleted", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Router size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Access Switch IP Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {ips.length} IP address{ips.length === 1 ? "" : "es"} available on
              the PC Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add IP Address
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : ips.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-10 text-center text-gray-500 dark:text-gray-400">
          No access switch IP addresses yet. Add one to make it available on the
          PC Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ips.map((ip) => (
            <div
              key={ip.id}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                    <Router size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 font-mono">
                      {ip.label}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(ip)}
                      className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(ip)}
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
        title={editing ? "Edit Access Switch IP" : "Add Access Switch IP"}
        size="sm"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field label="IP Address" required hint="e.g., 10.6.1.103">
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., 10.6.1.103"
              pattern={IPV4_PATTERN}
              title="Enter a valid IPv4 address, e.g. 10.6.1.103"
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
