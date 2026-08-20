"use client";

import { useEffect, useState } from "react";
import type { Device } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DevicePageHeader } from "./components/DevicePageHeader";
import { DeviceTable } from "./components/DeviceTable";
import { DeviceFormModal } from "./components/DeviceFormModal";
import { DeviceDetailsModal } from "./components/DeviceDetailsModal";
import { useDeviceData } from "./hooks/useDeviceData";
import { useDeviceForm } from "./hooks/useDeviceForm";
import { useDeviceFields } from "./hooks/useDeviceFields";
import { useDeviceOwners } from "./hooks/useDeviceOwners";
import { useDeviceRegistration } from "./hooks/useDeviceRegistration";
import { useDeviceLifecycle } from "./hooks/useDeviceLifecycle";
import { exportDevicesCSV } from "./utils/csv";
import type { DeviceRegistrationProps } from "./types/device";

export function DeviceRegistrationPage({
  autoOpenCreate,
  onNavigate,
}: DeviceRegistrationProps = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const data = useDeviceData();
  const form = useDeviceForm(data.deviceTypes, data.deviceModels);
  const fields = useDeviceFields(form.selectedType);
  const owners = useDeviceOwners(data.deviceOwners, data.setDeviceOwners);
  const registration = useDeviceRegistration();
  const lifecycle = useDeviceLifecycle(data.loadData);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<Device | null>(null);

  useEffect(
    () =>
      lifecycle.autoOpen(autoOpenCreate, () => {
        form.openAdd(data.deviceOwners[0]?.code ?? "");
        setModalOpen(true);
      }),
    [autoOpenCreate],
  );
  const openAdd = () => {
    form.openAdd(data.deviceOwners[0]?.code ?? "");
    owners.setManagerOpen(false);
    setModalOpen(true);
  };
  const openEdit = (device: Device) => {
    form.openEdit(device);
    setModalOpen(true);
  };
  const closeForm = () => setModalOpen(false);
  const updateForm = (patch: Partial<typeof form.form>) =>
    form.setForm((current) => ({ ...current, ...patch }));

  return (
    <div className="space-y-4">
      <DevicePageHeader
        count={data.records.length}
        canWrite={canWrite()}
        onExport={() =>
          exportDevicesCSV(data.records, data.deviceTypes, data.deviceOwners)
        }
        onCreate={openAdd}
      />
      {data.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DeviceTable
          records={data.records}
          types={data.deviceTypes}
          owners={data.deviceOwners}
          canWrite={canWrite()}
          isAdmin={hasRole("admin")}
          onView={setViewing}
          onEdit={openEdit}
          onDelete={lifecycle.deleteDevice}
        />
      )}
      <DeviceDetailsModal
        device={viewing}
        types={data.deviceTypes}
        owners={data.deviceOwners}
        canWrite={canWrite()}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
      />
      <DeviceFormModal
        open={modalOpen}
        editing={form.editing}
        form={form.form}
        types={data.deviceTypes}
        owners={data.deviceOwners}
        models={form.modelsForType}
        selectedType={form.selectedType}
        coreFields={fields.coreFields}
        requiredCoreFields={fields.requiredCoreFields}
        baseFields={fields.baseFields}
        requiredBaseFields={fields.requiredBaseFields}
        extraFields={fields.extraFields}
        skipIP={form.skipIP}
        saving={registration.saving}
        fieldLabel={fields.fieldLabel}
        placeholder={fields.fieldPlaceholder}
        onClose={closeForm}
        onSubmit={(event) =>
          registration.save(event, {
            form: form.form,
            editing: form.editing,
            selectedType: form.selectedType,
            baseFields: fields.baseFields,
            requiredBaseFields: fields.requiredBaseFields,
            coreFields: fields.coreFields,
            requiredCoreFields: fields.requiredCoreFields,
            extraFields: fields.extraFields,
            skipIP: form.skipIP,
            profileId: profile?.id,
            fieldLabel: fields.fieldLabel,
            onSaved: data.loadData,
            onClose: closeForm,
          })
        }
        onChange={updateForm}
        onType={form.selectDeviceType}
        onExtra={form.setExtraField}
        onModel={form.selectModel}
        onToggleIP={() => form.setSkipIP((value) => !value)}
        typeManager={
          onNavigate && (hasRole("admin") || canWrite())
            ? () => onNavigate("device_types")
            : undefined
        }
        ownerManager={{
          owners: data.deviceOwners,
          open: owners.managerOpen,
          onToggle: () => owners.setManagerOpen((value) => !value),
          editingId: owners.editingId,
          editingLabel: owners.editingLabel,
          newLabel: owners.newLabel,
          saving: owners.saving,
          onNewLabel: owners.setNewLabel,
          onEditingLabel: owners.setEditingLabel,
          onAdd: owners.addOwner,
          onStartRename: owners.startRename,
          onCancelRename: owners.cancelRename,
          onSaveRename: owners.saveRename,
          onDelete: async (owner) => {
            const deleted = await owners.deleteOwner(owner);
            if (deleted && form.form.device_owner === owner.code)
              updateForm({ device_owner: "" });
          },
        }}
      />
    </div>
  );
}
