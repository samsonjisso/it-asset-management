"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, IPSubnet } from '../../../../lib/supabase';
import { useToast } from '../../../../components/Toast';
import { SubnetFormState } from '../types';

interface SaveResult {
  success: boolean;
}

/**
 * Encapsulates all data access for IP subnets (load / save / delete),
 * so UI components stay free of Supabase-specific logic.
 */
export function useIPSubnets() {
  const { toast } = useToast();
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ip_subnets').select('*').order('prefix');
    if (data) setSubnets(data as IPSubnet[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSubnet = useCallback(
    async (form: SubnetFormState, editingId: string | null): Promise<SaveResult> => {
      setSaving(true);
      const payload = {
        prefix: form.prefix.trim(),
        label: form.label.trim(),
        notes: form.notes || null,
      };

      const { error } = editingId
        ? await supabase.from('ip_subnets').update(payload).eq('id', editingId)
        : await supabase.from('ip_subnets').insert(payload);

      setSaving(false);

      if (error) {
        toast(error.message, 'error');
        return { success: false };
      }

      toast(editingId ? 'Subnet updated' : 'Subnet added', 'success');
      await loadData();
      return { success: true };
    },
    [toast, loadData]
  );

  const deleteSubnet = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('ip_subnets').delete().eq('id', id);
      if (error) {
        toast(error.message, 'error');
        return;
      }
      toast('Subnet deleted', 'success');
      await loadData();
    },
    [toast, loadData]
  );

  return { subnets, loading, saving, saveSubnet, deleteSubnet };
}
