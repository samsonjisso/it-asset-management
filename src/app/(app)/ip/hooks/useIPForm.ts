import { useCallback, useEffect, useState } from 'react';
import type { IPAddress } from '../../../../lib/supabase';
import { emptyForm } from '../utils/ipConstants';
import type { IPFormData, IPFormCheckState } from '../types/ipManagement.types';

function mapRecordToForm(record: IPAddress): IPFormData {
  return {
    ip_address: record.ip_address,
    hostname: record.hostname ?? '',
    department_id: record.department_id ?? '',
    ip_owner: record.ip_owner ?? '',
    mac_address: record.mac_address ?? '',
    access_switch_port: record.access_switch_port ?? '',
    patch_panel_label: record.patch_panel_label ?? '',
    status: record.status,
    notes: record.notes ?? '',
  };
}

export function useIPForm() {
  const [editing, setEditing] = useState<IPAddress | null>(null);
  const [form, setForm] = useState<IPFormData>({ ...emptyForm });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkState, setCheckState] = useState<IPFormCheckState>('idle');

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ ...emptyForm });
    setCheckState('idle');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((record: IPAddress) => {
    setEditing(record);
    setForm(mapRecordToForm(record));
    setCheckState('idle');
    setModalOpen(true);
  }, []);

  const close = useCallback(() => {
    setModalOpen(false);
  }, []);

  const updateField = useCallback(
    <K extends keyof IPFormData>(field: K, value: IPFormData[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
      if (field === 'ip_address') setCheckState('idle');
    },
    [],
  );

  useEffect(() => {
    if (!modalOpen) setSaving(false);
  }, [modalOpen]);

  return {
    editing,
    form,
    modalOpen,
    saving,
    checkState,
    setSaving,
    setCheckState,
    openCreate,
    openEdit,
    close,
    updateField,
  };
}
