"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDepartments } from "./hooks/useDepartments";
import { DepartmentFormModal } from "./components/DepartmentFormModal";
import { DepartmentHeader } from "./components/DepartmentHeader";
import { DepartmentGrid } from "./components/DepartmentGrid";
import type { DepartmentFormState } from "./types";

export function DepartmentsPage() {
  const { canWrite, hasRole } = useAuth();
  const {
    departments,
    loading,
    saving,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentFormState["editing"]>(null);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (dept: DepartmentFormState["editing"]) => {
    setEditing(dept);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <DepartmentHeader
        count={departments.length}
        canWrite={canWrite()}
        onAdd={openAdd}
      />
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DepartmentGrid
          departments={departments}
          canWrite={canWrite()}
          canDelete={hasRole("admin")}
          onEdit={openEdit}
          onDelete={deleteDepartment}
        />
      )}
      <DepartmentFormModal
        open={modalOpen}
        editing={editing}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onCreate={async (form) => {
          const success = await createDepartment(form);
          if (success) setModalOpen(false);
        }}
        onUpdate={async (id, form) => {
          const success = await updateDepartment(id, form);
          if (success) setModalOpen(false);
        }}
      />
    </div>
  );
}
