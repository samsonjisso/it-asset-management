"use client";
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useAssetModelsData } from './hooks/useAssetModelsData';
import { useAssetModelForm } from './hooks/useAssetModelForm';
import { AssetModelsHeader } from './components/AssetModelsHeader';
import { AssetModelsFilter } from './components/AssetModelsFilter';
import { AssetModelsGrid } from './components/AssetModelsGrid';
import { AssetModelFormModal } from './components/AssetModelFormModal';
import { AssetFilter } from './types/assetModel.types';

// Customization: define computer/device models up front (with a
// reference photo) so that when registering a PC or device, the user
// just picks the model from a dropdown instead of uploading a photo
// and typing manufacturer/model details every single time.
//
// This page is intentionally just composition + a bit of local UI
// state (the active filter). Data fetching lives in
// useAssetModelsData, and the add/edit/delete workflow lives in
// useAssetModelForm — both testable in isolation from this component.
export function AssetModelsPage() {
  const { canWrite, hasRole } = useAuth();
  const { models, deviceTypes, loading, reload } = useAssetModelsData();
  const {
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  } = useAssetModelForm(reload);

  const [filter, setFilter] = useState<AssetFilter>('all');
  const visible = models.filter((m) => filter === 'all' || m.target === filter);

  return (
    <div className="space-y-4">
      <AssetModelsHeader modelCount={models.length} canAdd={canWrite()} onAdd={openAdd} />

      <AssetModelsFilter value={filter} onChange={setFilter} />

      <AssetModelsGrid
        loading={loading}
        models={visible}
        canWrite={canWrite()}
        canDelete={hasRole('admin')}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <AssetModelFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        deviceTypes={deviceTypes}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSave}
      />
    </div>
  );
}
