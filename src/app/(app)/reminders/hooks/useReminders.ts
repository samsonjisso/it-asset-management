"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../lib/supabase";
import { useToast } from "../../../../components/Toast";
import { Reminder, ReminderType } from "../types";

export function useReminders() {
  const { toast } = useToast();
  const [records, setRecords] = useState<Reminder[]>([]);
  const [reminderTypes, setReminderTypes] = useState<ReminderType[]>([]);
  const [loading, setLoading] = useState(true);

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

  return { records, reminderTypes, loading, loadData, handleDelete, dismiss };
}
