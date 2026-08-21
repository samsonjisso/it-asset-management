import { useCallback, useEffect, useState } from 'react';
import type { IPAddress, Department } from '../../../../lib/supabase';
import { useToast } from '../../../../components/Toast';
import {
  createIpAddress,
  deleteIpAddress,
  fetchIpData,
  updateIpAddress,
} from '../services/ipAddressService';
import type { IPFormData } from '../types/ipManagement.types';

export function useIPAddresses(profileId?: string) {
  const { toast } = useToast();
  const [records, setRecords] = useState<IPAddress[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIpData();
      setRecords(data.records);
      setDepartments(data.departments);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load IP data', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const save = useCallback(
    async (form: IPFormData, editing: IPAddress | null) => {
      const result = editing
        ? await updateIpAddress(editing.id, form, profileId)
        : await createIpAddress(form, profileId);

      if (result.error) {
        toast(result.error.message, 'error');
        return false;
      }

      toast(
        editing ? 'IP address updated' : 'IP address registered',
        'success',
      );
      await loadData();
      return true;
    },
    [loadData, profileId, toast],
  );

  const remove = useCallback(
    async (record: IPAddress) => {
      if (!confirm(`Delete IP address "${record.ip_address}"?`)) return false;

      const { error } = await deleteIpAddress(record.id);
      if (error) {
        toast(error.message, 'error');
        return false;
      }

      toast('IP address deleted', 'success');
      await loadData();
      return true;
    },
    [loadData, toast],
  );

  return { records, departments, loading, loadData, save, remove };
}
