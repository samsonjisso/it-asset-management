import { useCallback, useState } from "react";
import { supabase, ServerEnvironment } from "../../../../lib/supabase";
import { useToast } from "../../../../components/Toast";

/**
 * Encapsulates all data-fetching and mutation logic for server
 * environments. No UI/JSX lives here — components consume this hook
 * and render based on the state + actions it returns.
 */
export function useServerEnvironments() {
  const { toast } = useToast();
  const [types, setTypes] = useState<ServerEnvironment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("server_environments")
      .select("*")
      .order("label");
    if (data) setTypes(data as ServerEnvironment[]);
    setLoading(false);
  }, []);

  /**
   * Creates or updates an environment depending on whether editingId is
   * provided. Returns true on success, false on validation/save failure,
   * so callers (the modal) can decide whether to close themselves.
   */
  const saveEnvironment = useCallback(
    async (label: string, editingId?: string) => {
      const trimmed = label.trim();
      if (!trimmed) {
        toast("Name is required", "error");
        return false;
      }

      const { error } = editingId
        ? await supabase
            .from("server_environments")
            .update({ label: trimmed })
            .eq("id", editingId)
        : await supabase.from("server_environments").insert({ label: trimmed });

      if (error) {
        toast(error.message, "error");
        return false;
      }

      toast(editingId ? "Environment updated" : "Environment added", "success");
      await loadData();
      return true;
    },
    [loadData, toast],
  );

  const deleteEnvironment = useCallback(
    async (t: ServerEnvironment) => {
      if (!confirm(`Delete environment "${t.label}"?`)) return;
      const { error } = await supabase
        .from("server_environments")
        .delete()
        .eq("id", t.id);
      if (error) {
        toast(error.message, "error");
      } else {
        toast("Environment deleted", "success");
        await loadData();
      }
    },
    [loadData, toast],
  );

  return { types, loading, loadData, saveEnvironment, deleteEnvironment };
}
