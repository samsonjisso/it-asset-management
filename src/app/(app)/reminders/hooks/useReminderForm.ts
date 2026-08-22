"use client";
import { useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../components/Toast";
import {
  Reminder,
  ReminderType,
  ReminderFormState,
  emptyForm,
  emailPattern,
} from "../types";

interface UseReminderFormOptions {
  reminderTypes: ReminderType[];
  onSaved: () => void;
}

export function useReminderForm({
  reminderTypes,
  onSaved,
}: UseReminderFormOptions) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<ReminderFormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

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
      alert_email: rec.alert_email ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.remind_at) {
      toast("Title and reminder date are required", "error");
      return;
    }
    if (form.alert_email && !emailPattern.test(form.alert_email)) {
      toast("Please enter a valid alert email address", "error");
      return;
    }
    setSaving(true);
    const newRemindAt = new Date(form.remind_at).toISOString();
    const payload: Record<string, unknown> = {
      title: form.title,
      reminder_type: form.reminder_type,
      detail: form.detail || null,
      remind_at: newRemindAt,
      alert_email: form.alert_email || null,
      created_by: profile?.id,
    };
    // If the due date, or the alert email itself, changed on an
    // already-processed reminder, allow the email alert to fire again.
    if (
      editing &&
      (editing.remind_at !== newRemindAt ||
        (editing.alert_email ?? "") !== form.alert_email)
    ) {
      payload.email_sent = false;
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
      onSaved();
    }
  };

  return {
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    closeModal,
    handleSave,
  };
}
