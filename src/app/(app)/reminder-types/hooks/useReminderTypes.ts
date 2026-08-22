import { useState, useEffect, useCallback } from "react";
import { supabase, ReminderType } from "../../../../lib/supabase";
import { useToast } from "../../../../components/Toast";

export function useReminderTypes() {
  const { toast } = useToast();
  const [types, setTypes] = useState<ReminderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reminder_types")
      .select("*")
      .order("label");
    if (data) setTypes(data as ReminderType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveType = async (
    label: string,
    editing: ReminderType | null,
  ): Promise<boolean> => {
    if (!label.trim()) {
      toast("Name is required", "error");
      return false;
    }

    setSaving(true);
    const { error } = editing
      ? await supabase
          .from("reminder_types")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase.from("reminder_types").insert({ label: label.trim() });
    setSaving(false);

    if (error) {
      toast(error.message, "error");
      return false;
    }

    toast(
      editing ? "Reminder type updated" : "Reminder type created",
      "success",
    );
    loadData();
    return true;
  };

  const deleteType = async (t: ReminderType) => {
    if (!confirm(`Delete reminder type "${t.label}"?`)) return;
    const { error } = await supabase
      .from("reminder_types")
      .delete()
      .eq("id", t.id);
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Reminder type deleted", "success");
      loadData();
    }
  };

  return { types, loading, saving, saveType, deleteType };
}
