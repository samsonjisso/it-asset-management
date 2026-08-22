import { useState, useRef, useEffect } from 'react';
import { Server, ServerOwner, ServerType, ServerEnvironment } from '../../../../lib/supabase';
import { emptyForm, ServerFormState } from '../types';

interface UseServerFormStateArgs {
  serverOwners: ServerOwner[];
  serverTypes: ServerType[];
  environments: ServerEnvironment[];
  autoOpenCreate?: number;
}

/**
 * Owns the register/edit modal's open/closed state, the current edit target,
 * and the form field values (create defaults + populate-from-record).
 */
export function useServerFormState({
  serverOwners,
  serverTypes,
  environments,
  autoOpenCreate,
}: UseServerFormStateArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState<ServerFormState>({ ...emptyForm });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      server_owner: serverOwners[0]?.code ?? '',
      server_type: serverTypes[0]?.code ?? '',
      environment: environments[0]?.code ?? '',
    });
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (autoOpenCreate !== undefined && autoOpenCreate !== lastAutoOpen.current) {
      lastAutoOpen.current = autoOpenCreate;
      openAdd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCreate]);

  const openEdit = (rec: Server) => {
    setEditing(rec);
    setForm({
      server_type: rec.server_type,
      hostname: rec.hostname,
      ip_address: rec.ip_address ?? '',
      ssh_port: rec.ssh_port.toString(),
      environment: rec.environment,
      server_owner: rec.server_owner,
      ram: rec.ram ?? '',
      cpu: rec.cpu ?? '',
      storage: rec.storage ?? '',
      os_release: rec.os_release ?? '',
      host_location: rec.host_location ?? '',
      image: rec.image ?? null,
      notes: rec.notes ?? '',
    });
    setModalOpen(true);
  };

  return { modalOpen, setModalOpen, editing, form, setForm, openAdd, openEdit };
}
