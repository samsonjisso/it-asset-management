"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import type { PCRegistration } from "../../../lib/supabase";
import { DataTable } from "../../../components/DataTable";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { createPC, deletePC, updatePC } from "./services/pcRegistrationService";
import { usePCData } from "./hooks/usePCData";
import { usePCForm } from "./hooks/usePCForm";
import { buildPCPayload } from "./utils/pcPayload";
import { validatePCForm } from "./utils/pcValidation";
import { exportPCsToCSV } from "./utils/pcExport";
import { createPCColumns } from "./utils/pcColumns";
import { PCPageHeader } from "./components/PCPageHeader";
import { PCLoadingState } from "./components/PCLoadingState";
import { PCDetailsModal } from "./components/PCDetailsModal";
import { PCFormModal } from "./components/PCFormModal";

export function PCRegistrationPage({
  autoOpenCreate,
}: { autoOpenCreate?: number } = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const { records, departments, pcModels, loading, reload } = usePCData();
  const form = usePCForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PCRegistration | null>(null);
  const [viewing, setViewing] = useState<PCRegistration | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditing(null);
    form.reset();
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (record: PCRegistration) => {
      setEditing(record);
      form.edit(record);
      setModalOpen(true);
    },
    [form],
  );

  const closeForm = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

  const handleSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePCForm(form.form);
    if (validationError) return toast(validationError, "error");

    setSaving(true);
    try {
      const department = departments.find(
        (d) => d.id === form.form.department_id,
      );
      const payload = buildPCPayload(
        form.form,
        {
          skipAssetTag: form.skipAssetTag,
          skipFloor: form.skipFloor || !!department?.is_branch,
        },
        profile?.id,
      );
      const result = editing
        ? await updatePC(editing.id, payload)
        : await createPC(payload);
      if (result.error) return toast(result.error.message, "error");
      toast(
        editing ? "PC updated successfully" : "PC registered successfully",
        "success",
      );
      closeForm();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: PCRegistration) => {
    if (!confirm(`Delete PC "${record.hostname}"?`)) return;
    const { error } = await deletePC(record.id);
    if (error) return toast(error.message, "error");
    toast("PC deleted", "success");
    await reload();
  };

  const columns = createPCColumns({
    canEdit: canWrite(),
    canDelete: canWrite() && hasRole("admin"),
    onView: setViewing,
    onEdit: openEdit,
    onDelete: handleDelete,
  });
  const lastAutoOpen = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      autoOpenCreate !== undefined &&
      autoOpenCreate !== lastAutoOpen.current
    ) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
  }, [autoOpenCreate, openAdd]);

  return (
    <div className="space-y-4">
      <PCPageHeader
        count={records.length}
        canWrite={canWrite()}
        onCreate={openAdd}
        onExport={() => exportPCsToCSV(records)}
      />
      {loading ? (
        <PCLoadingState />
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={[
            "hostname",
            "service_tag",
            "asset_tag",
            "mac_address",
            "ip_address",
            "owner_name",
          ]}
          searchPlaceholder="Search by hostname, tag, MAC, IP..."
          dateFilterKey="created_at"
          emptyMessage="No PCs registered yet"
          onRowClick={setViewing}
        />
      )}
      <PCDetailsModal
        viewing={viewing}
        pcModels={pcModels}
        canEdit={canWrite()}
        onClose={() => setViewing(null)}
        onEdit={(record) => {
          setViewing(null);
          openEdit(record);
        }}
      />
      <PCFormModal
        open={modalOpen}
        editing={editing}
        form={form.form}
        departments={departments}
        pcModels={pcModels}
        skipAssetTag={form.skipAssetTag}
        skipFloor={form.skipFloor}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSave}
        onChange={form.update}
        onToggleAssetTag={() => form.setSkipAssetTag(!form.skipAssetTag)}
        onToggleFloor={() => form.setSkipFloor(!form.skipFloor)}
        onSelectModel={(id) => form.selectModel(id, pcModels)}
      />
    </div>
  );
}
