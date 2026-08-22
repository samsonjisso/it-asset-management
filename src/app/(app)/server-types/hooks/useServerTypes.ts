"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { ServerType } from '../types';

/**
 * Owns all Supabase reads/writes for server types. No UI concerns live here —
 * callers are responsible for validation messaging, modal state, and toasts.
 */
export function useServerTypes() {
  const [types, setTypes] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('server_types').select('*').order('label');
    if (data) setTypes(data as ServerType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveServerType = useCallback(
    async (label: string, editing: ServerType | null) => {
      setSaving(true);
      const { error } = editing
        ? await supabase.from('server_types').update({ label }).eq('id', editing.id)
        : await supabase.from('server_types').insert({ label });
      setSaving(false);
      if (!error) {
        await loadData();
      }
      return { error };
    },
    [loadData]
  );

  const deleteServerType = useCallback(
    async (t: ServerType) => {
      const { error } = await supabase.from('server_types').delete().eq('id', t.id);
      if (!error) {
        await loadData();
      }
      return { error };
    },
    [loadData]
  );

  return { types, loading, saving, loadData, saveServerType, deleteServerType };
}
