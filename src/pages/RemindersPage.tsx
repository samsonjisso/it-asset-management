"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Reminder, ReminderType } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { DataTable, Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, TextInput, TextArea, Button } from "../components/FormControls";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const emptyForm = {
  title: "",
  reminder_type: "",
  detail: "",
  remind_at: "",
};

export function RemindersPage() {
  const { canWrite, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Reminder[]>([]);
  const [reminderTypes, setReminderTypes] = useState<ReminderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [remindersRes, typesRes] = await Promise.all([
      supabase
        .from("reminders")
        .select("*")
        .order("remind_at", { ascending: true }),
      supabase.from("reminder_types").select("*").order("label"),
    ]);
    if (remindersRes.data) setRecords(remindersRes.data as Reminder[]);
    if (typesRes.data) setReminderTypes(typesRes.data as ReminderType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, reminder_type: reminderTypes[0]?.label ?? "" });
    setModalOpen(true);
  };

  const openEdit = (rec: Reminder) => {
    setEditing(rec);
    setForm({
      title: rec.title,
      reminder_type: rec.reminder_type,
      detail: rec.detail ?? "",
      remind_at: rec.remind_at.slice(0, 16),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.remind_at) {
      toast("Title and reminder date are required", "error");
      return;
    }
    if (!form.reminder_type) {
      toast(
        "Reminder Type is required. Add one under Customization > Reminder Types.",
        "error",
      );
      return;
    }
    setSaving(true);
    const newRemindAt = new Date(form.remind_at).toISOString();
    const payload: Record<string, unknown> = {
      title: form.title,
      reminder_type: form.reminder_type,
      detail: form.detail || null,
      remind_at: newRemindAt,
      created_by: profile?.id,
    };
    // If the due date changed on an already-processed reminder, allow
    // the in-app notification to fire again.
    if (editing && editing.remind_at !== newRemindAt) {
      payload.is_notified = false;
    }
    const { error } = editing
      ? await supabase.from("reminders").update(payload).eq("id", editing.id)
      : await supabase.from("reminders").insert(payload);
    setSaving(false);
    if (error) toast(error.message, "error");
    else {
      toast(editing ? "Reminder updated" : "Reminder created", "success");
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Reminder) => {
    if (!confirm(`Delete reminder "${rec.title}"?`)) return;
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", rec.id);
    if (error) toast(error.message, "error");
    else {
      toast("Reminder deleted", "success");
      loadData();
    }
  };

  const dismiss = async (rec: Reminder) => {
    await supabase
      .from("reminders")
      .update({ is_dismissed: true })
      .eq("id", rec.id);
    loadData();
  };

  const getStatus = (rec: Reminder) => {
    if (rec.is_dismissed)
      return {
        label: "Dismissed",
        color: "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800",
        icon: <CheckCircle size={12} />,
      };
    const days = Math.ceil(
      (new Date(rec.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0)
      return {
        label: "Overdue",
        color: "text-red-700 bg-red-50 border border-red-200",
        icon: <AlertCircle size={12} />,
      };
    if (days <= 7)
      return {
        label: `Due in ${days}d`,
        color: "text-amber-700 bg-amber-50 border border-amber-200",
        icon: <Clock size={12} />,
      };
    return {
      label: "Upcoming",
      color: "text-green-700 bg-green-50 border border-green-200",
      icon: <Calendar size={12} />,
    };
  };

  const columns: Column<Reminder>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "reminder_type",
      label: "Type",
      sortable: true,
      sortValue: (r) => r.reminder_type,
      render: (r) => (
        <span className="text-xs px-2 py-1 rounded-full bg-brand-600/10 text-brand-600 font-medium">
          {r.reminder_type}
        </span>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (r) =>
        r.detail ? (
          <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {r.detail}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "remind_at",
      label: "Remind Date",
      sortable: true,
      sortValue: (r) => r.remind_at,
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">
            {new Date(r.remind_at).toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(r.remind_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const status = getStatus(r);
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        canWrite() ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {!r.is_dismissed && (
              <button
                onClick={() => dismiss(r)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                title="Dismiss"
              >
                <CheckCircle size={16} />
              </button>
            )}
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            Read only
          </span>
        ),
    },
  ];

  const upcoming = records.filter(
    (r) =>
      !r.is_dismissed &&
      new Date(r.remind_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Reminders & Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {records.length} reminders, {upcoming.length} upcoming
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Create Reminder
          </Button>
        )}
      </div>

      {/* Upcoming reminders banner */}
      {upcoming.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-4 gbb-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              Upcoming Reminders (within 1 week)
            </h3>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 3).map((r) => {
              const days = Math.ceil(
                (new Date(r.remind_at).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {r.reminder_type} -{" "}
                      {new Date(r.remind_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? "text-red-600 bg-red-50" : "text-amber-700 bg-amber-50"}`}
                  >
                    {days <= 0 ? "Due now!" : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={["title", "reminder_type", "detail"]}
          searchPlaceholder="Search reminders..."
          dateFilterKey="remind_at"
          emptyMessage="No reminders created yet"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Reminder" : "Create New Reminder"}
        size="md"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          <Field label="Reminder Name / Title" required>
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Quarterly Server Maintenance"
              required
            />
          </Field>
          <Field label="Reminder Type" required>
            <SearchableSelect
              options={reminderTypes.map((t) => ({
                value: t.label,
                label: t.label,
              }))}
              value={form.reminder_type}
              onChange={(val) => setForm({ ...form, reminder_type: val })}
              placeholder="Select reminder type"
              searchPlaceholder="Search reminder types…"
              emptyMessage={
                reminderTypes.length === 0
                  ? "No reminder types configured."
                  : "No matching types."
              }
              required
            />
          </Field>
          <Field label="Remind Date & Time" required>
            <TextInput
              type="datetime-local"
              value={form.remind_at}
              onChange={(e) => setForm({ ...form, remind_at: e.target.value })}
              required
            />
          </Field>
          <Field label="Detail">
            <TextArea
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              rows={3}
              placeholder="Write details about this reminder..."
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
              {saving ? "Saving..." : editing ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
