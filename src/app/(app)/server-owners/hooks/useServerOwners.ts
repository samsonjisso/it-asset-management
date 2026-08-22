"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../lib/supabase";
import { useToast } from "../../../../components/Toast";
import type { ServerOwner } from "../types";

export function useServerOwners() {
  const { toast } = useToast();
  const [owners, setOwners] = useState<ServerOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("server_owners")
      .select("*")
      .order("label");
    if (data) setOwners(data as ServerOwner[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveOwner = async (
    label: string,
    editing: ServerOwner | null,
  ): Promise<boolean> => {
    const { error } = editing
      ? await supabase
          .from("server_owners")
          .update({ label: label.trim() })
          .eq("id", editing.id)
      : await supabase.from("server_owners").insert({ label: label.trim() });

    if (error) {
      toast(error.message, "error");
      return false;
    }

    toast(
      editing ? "Server owner updated" : "Server owner created",
      "success",
    );
    loadData();
    return true;
  };

  const deleteOwner = async (o: ServerOwner): Promise<boolean> => {
    const { error } = await supabase
      .from("server_owners")
      .delete()
      .eq("id", o.id);

    if (error) {
      toast(error.message, "error");
      return false;
    }

    toast("Server owner deleted", "success");
    loadData();
    return true;
  };

  return { owners, loading, saveOwner, deleteOwner };
}
