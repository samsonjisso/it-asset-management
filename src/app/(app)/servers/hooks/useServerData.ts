import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  Server,
  ServerOwner,
  ServerType,
  ServerEnvironment,
  IPSubnet,
} from '../../../../lib/supabase';

/**
 * Loads and holds all reference + record data for the server registration
 * page (servers, owners, types, environments, subnets).
 */
export function useServerData() {
  const [records, setRecords] = useState<Server[]>([]);
  const [serverOwners, setServerOwners] = useState<ServerOwner[]>([]);
  const [serverTypes, setServerTypes] = useState<ServerType[]>([]);
  const [environments, setEnvironments] = useState<ServerEnvironment[]>([]);
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [serversRes, ownersRes, typesRes, envRes, subnetsRes] = await Promise.all([
      supabase.from('servers').select('*').order('created_at', { ascending: false }),
      supabase.from('server_owners').select('*').order('label'),
      supabase.from('server_types').select('*').order('label'),
      supabase.from('server_environments').select('*').order('label'),
      supabase.from('ip_subnets').select('*').order('prefix'),
    ]);
    if (serversRes.data) setRecords(serversRes.data as Server[]);
    if (ownersRes.data) setServerOwners(ownersRes.data as ServerOwner[]);
    if (typesRes.data) setServerTypes(typesRes.data as ServerType[]);
    if (envRes.data) setEnvironments(envRes.data as ServerEnvironment[]);
    if (subnetsRes.data) setSubnets(subnetsRes.data as IPSubnet[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    records,
    serverOwners,
    serverTypes,
    environments,
    subnets,
    loading,
    loadData,
  };
}
