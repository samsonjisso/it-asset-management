import { useCallback, useEffect, useState } from "react";
import { supabase, Department } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import type { DepartmentForm } from "../types";

export function useDepartments() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    if (data) setDepartments(data as Department[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createDepartment = async (form: DepartmentForm) => {
    if (!form.name) {
      toast("Department name is required", "error");
      return false;
    }

    setSaving(true);
    const { error } = await supabase.from("departments").insert({
      name: form.name,
      is_branch: form.is_branch,
      description: form.description || null,
    });
    setSaving(false);

    if (error) {
      toast(error.message, "error");
      return false;
    }

    toast("Department created", "success");
    await loadData();
    return true;
  };

  const updateDepartment = async (id: number, form: DepartmentForm) => {
    if (!form.name) {
      toast("Department name is required", "error");
      return false;
    }

    setSaving(true);
    const { error } = await supabase
      .from("departments")
      .update({
        name: form.name,
        is_branch: form.is_branch,
        description: form.description || null,
      })
      .eq("id", id);
    setSaving(false);

    if (error) {
      toast(error.message, "error");
      return false;
    }

    toast("Department updated", "success");
    await loadData();
    return true;
  };

  const deleteDepartment = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", dept.id);

    if (error) toast(error.message, "error");
    else {
      toast("Department deleted", "success");
      await loadData();
    }
  };

  return {
    departments,
    loading,
    saving,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
