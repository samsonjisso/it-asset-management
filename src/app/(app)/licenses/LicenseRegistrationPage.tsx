"use client";
import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { License } from "@/lib/supabase";
import { LicenseRegistrationPageProps } from "./types";
import { useLicenseData } from "./hooks/useLicenseData";
import { useLicenseForm } from "./hooks/useLicenseForm";
import { LicenseHeader } from "./components/LicenseHeader";
import { LicenseTable } from "./components/LicenseTable";
import { LicenseDetailsModal } from "./components/LicenseDetailsModal";
import { LicenseFormModal } from "./components/LicenseFormModal";

export function LicenseRegistrationPage({
  autoOpenCreate,
}: LicenseRegistrationPageProps = {}) {
  const { canWrite, hasRole } = useAuth();
  const [viewing, setViewing] = useState<License | null>(null);

  const {
    records,
    licenseTypeOptions,
    licenseSubtypes,
    loading,
    loadData,
    handleDelete,
    getExpiryStatus,
    exportCSV,
  } = useLicenseData();

  const {
    modalOpen,
    setModalOpen,
    editing,
    form,
    setForm,
    saving,
    skipKey,
    setSkipKey,
    openAdd,
    openEdit,
    handleSave,
  } = useLicenseForm(licenseTypeOptions, loadData, autoOpenCreate);

  const openView = useCallback((rec: License) => setViewing(rec), []);

  const handleEditFromView = useCallback(() => {
    if (!viewing) return;
    const rec = viewing;
    setViewing(null);
    openEdit(rec);
  }, [viewing, openEdit]);

  const viewingStatus = viewing ? getExpiryStatus(viewing) : null;

  return (
    <div className="space-y-4">
      <LicenseHeader
        count={records.length}
        onExport={exportCSV}
        onAdd={openAdd}
        canWrite={canWrite()}
      />
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <LicenseTable
          records={records}
          licenseTypeOptions={licenseTypeOptions}
          getExpiryStatus={getExpiryStatus}
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDelete}
          canWrite={canWrite}
          hasRole={hasRole}
        />
      )}
      <LicenseDetailsModal
        viewing={viewing}
        onClose={() => setViewing(null)}
        licenseTypeOptions={licenseTypeOptions}
        viewingStatus={viewingStatus}
        onEdit={canWrite() ? handleEditFromView : undefined}
      />
      <LicenseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        skipKey={skipKey}
        setSkipKey={setSkipKey}
        licenseTypeOptions={licenseTypeOptions}
        licenseSubtypes={licenseSubtypes}
        onSubmit={handleSave}
      />
    </div>
  );
}
