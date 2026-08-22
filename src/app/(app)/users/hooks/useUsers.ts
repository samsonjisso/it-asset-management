"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Profile, NewUserForm, EditUserForm } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createUser = async (newUser: NewUserForm) => {
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUser.email,
      password: newUser.password,
      email_confirm: true,
      user_metadata: { full_name: newUser.full_name, role: newUser.role },
    });
    if (error) {
      return { error };
    }
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone || null,
      }).eq('id', data.user.id);
    }
    await loadData();
    return { error: null };
  };

  const editUser = async (userId: string, editForm: EditUserForm) => {
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      role: editForm.role,
      phone: editForm.phone || null,
      is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (!error) await loadData();
    return { error };
  };

  const toggleActive = async (user: Profile) => {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    loadData();
  };

  return { users, loading, loadData, createUser, editUser, toggleActive };
}
