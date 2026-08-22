import type { Department } from "@/lib/supabase";

export type DepartmentForm = {
  name: string;
  is_branch: boolean;
  description: string;
};

export type DepartmentFormState = {
  editing: Department | null;
  form: DepartmentForm;
};

export type DepartmentMutationForm = DepartmentForm;
