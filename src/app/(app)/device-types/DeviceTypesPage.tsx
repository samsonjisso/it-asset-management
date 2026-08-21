"use client";

import { useAuth } from "@/context/AuthContext";
import { DeviceTypeEditor } from "./components/DeviceTypeEditor";
import { DeviceTypeList } from "./components/DeviceTypeList";
import { useDeviceTypeEditor } from "./hooks/useDeviceTypeEditor";
import { useDeviceTypes } from "./hooks/useDeviceTypes";

export default function DeviceTypesPage() {
  const { canWrite, hasRole } = useAuth();
  const canManage = hasRole("admin");

  const {
    deviceTypes,
    loading,
    createDeviceType,
    updateDeviceType,
    deleteDeviceType,
  } = useDeviceTypes();

  const editor = useDeviceTypeEditor();

  const handleSubmit = async () => {
    const result = await editor.validate(deviceTypes);
    if (!result.ok) return;

    editor.setSaving(true);
    try {
      const saved = editor.mode === "edit"
        ? await updateDeviceType(editor.editingTypeId!, result.value)
        : await createDeviceType(result.value);

      if (saved) editor.close();
    } finally {
      editor.setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const deleted = await deleteDeviceType(id);
    if (deleted && editor.editingTypeId === id) editor.close();
  };

  return (
    <div className="space-y-4">
      <DeviceTypeList
        deviceTypes={deviceTypes}
        loading={loading}
        canWrite={canWrite()}
        canManage={canManage}
        onAdd={editor.openCreate}
        onEdit={editor.openEdit}
        onDelete={handleDelete}
      />

      <DeviceTypeEditor
        editor={editor}
        deviceTypes={deviceTypes}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
}
