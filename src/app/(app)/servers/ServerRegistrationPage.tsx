"use client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/FormControls";
import { Plus, Server as ServerIcon, Download } from "lucide-react";
import { useServerData } from "./hooks/useServerData";
import { useServerFormState } from "./hooks/useServerFormState";
import { useServerFormSave } from "./hooks/useServerFormSave";
import { useServerActions } from "./hooks/useServerActions";
import { ServerTable } from "./components/ServerTable";
import { ServerDetailsView } from "./components/ServerDetailsView";
import { ServerFormModal } from "./components/ServerFormModal";
import type { ServerRegistrationPageProps } from "./types";

export function ServerRegistrationPage({
  autoOpenCreate,
}: ServerRegistrationPageProps = {}) {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();

  const {
    records,
    serverOwners,
    serverTypes,
    environments,
    subnets,
    loading,
    loadData,
  } = useServerData();

  const { modalOpen, setModalOpen, editing, form, setForm, openAdd, openEdit } =
    useServerFormState({
      serverOwners,
      serverTypes,
      environments,
      autoOpenCreate,
    });

  const { saving, detectedSubnet, handleSave } = useServerFormSave({
    form,
    editing,
    subnets,
    profileId: profile?.id,
    toast,
    loadData,
    onSaved: () => setModalOpen(false),
  });

  const { viewing, setViewing, openView, handleDelete, exportCSV } =
    useServerActions({
      records,
      serverTypes,
      environments,
      serverOwners,
      toast,
      loadData,
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <ServerIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Server Registration
            </h1>
            <p className="text-sm text-gray-500">
              {records.length} registered servers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register Server
            </Button>
          )}
        </div>
      </div>

      <ServerTable
        records={records}
        loading={loading}
        serverTypes={serverTypes}
        environments={environments}
        serverOwners={serverOwners}
        canWrite={canWrite}
        hasRole={hasRole}
        onView={openView}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <ServerDetailsView
        viewing={viewing}
        onClose={() => setViewing(null)}
        onEdit={(rec) => {
          setViewing(null);
          openEdit(rec);
        }}
        canWrite={canWrite}
        serverTypes={serverTypes}
        environments={environments}
        serverOwners={serverOwners}
      />

      <ServerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        serverTypes={serverTypes}
        environments={environments}
        serverOwners={serverOwners}
        detectedSubnet={detectedSubnet}
      />
    </div>
  );
}
