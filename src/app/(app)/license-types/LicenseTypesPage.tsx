"use client";
import { Plus, Tags } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/FormControls";
import { useLicenseTypes } from "./hooks/useLicenseTypes";
import { useLicenseTypeForm } from "./hooks/useLicenseTypeForm";
import { LicenseTypeCard } from "./components/LicenseTypeCard";
import { LicenseTypeFormModal } from "./components/LicenseTypeFormModal";

export function LicenseTypesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");

  const {
    types,
    subtypesByType,
    loading,
    loadData,
    subtypeDrafts,
    setSubtypeDraft,
    savingSubtypeFor,
    handleDeleteType,
    handleAddSubtype,
    handleDeleteSubtype,
  } = useLicenseTypes();

  const {
    typeModalOpen,
    editingType,
    typeLabel,
    setTypeLabel,
    savingType,
    openAddType,
    openEditType,
    closeModal,
    handleSaveType,
  } = useLicenseTypeForm(loadData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Tags size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              License Type Management
            </h1>
            <p className="text-sm text-gray-500">
              {types.length} license type{types.length === 1 ? "" : "s"}{" "}
              available on the License Registration form
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={openAddType}>
            <Plus size={16} /> Add License Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No license types yet. Add one to make it available on the License
          Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {types.map((t) => (
            <LicenseTypeCard
              key={t.id}
              type={t}
              subtypes={subtypesByType[t.id] ?? []}
              canManage={canManage}
              subtypeDraft={subtypeDrafts[t.id] ?? ""}
              savingSubtype={savingSubtypeFor === t.id}
              onChangeDraft={setSubtypeDraft}
              onAddSubtype={handleAddSubtype}
              onDeleteSubtype={handleDeleteSubtype}
              onEditType={openEditType}
              onDeleteType={handleDeleteType}
            />
          ))}
        </div>
      )}

      <LicenseTypeFormModal
        open={typeModalOpen}
        editingType={editingType}
        typeLabel={typeLabel}
        saving={savingType}
        onChangeLabel={setTypeLabel}
        onClose={closeModal}
        onSubmit={handleSaveType}
      />
    </div>
  );
}
