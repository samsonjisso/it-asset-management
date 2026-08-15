"use client";

import { useState, useEffect } from 'react';
import { supabase, PCRegistration, License, Device, Server, Reminder } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Monitor, KeyRound, HardDrive, Server as ServerIcon, Bell, AlertTriangle, TrendingUp, Calendar, Boxes, Network } from 'lucide-react';
import StatsCards from './views/StatsCards';
import AlertsRow from './views/AlertsRow';
import ChartsRow from './views/ChartsRow';
import DeviceType from './views/DeviceType';
import RecentRegistration from './views/RecentRegistration';

export function DashboardPage() {
  const { profile } = useAuth();
  const [pcCount, setPcCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [ipCount, setIpCount] = useState(0);
  const [licenseCount, setLicenseCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [serverCount, setServerCount] = useState(0);
  const [, setReminderCount] = useState(0);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [recentPCs, setRecentPCs] = useState<PCRegistration[]>([]);
  const [deviceByType, setDeviceByType] = useState<Record<string, number>>({});
  const [serverByEnv, setServerByEnv] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [pc, ast, ip, lic, dev, srv, rem] = await Promise.all([
        supabase.from('pc_registrations').select('*'),
        supabase.from('assets').select('*'),
        supabase.from('ip_addresses').select('*'),
        supabase.from('licenses').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('servers').select('*'),
        supabase.from('reminders').select('*').eq('is_dismissed', false),
      ]);

      const pcs = (pc.data ?? []) as PCRegistration[];
      const assets = (ast.data ?? []) as any[];
      const ips = (ip.data ?? []) as any[];
      const licenses = (lic.data ?? []) as License[];
      const devices = (dev.data ?? []) as Device[];
      const servers = (srv.data ?? []) as Server[];
      const reminders = (rem.data ?? []) as Reminder[];

      setPcCount(pcs.length);
      setAssetCount(assets.length);
      setIpCount(ips.length);
      setLicenseCount(licenses.length);
      setDeviceCount(devices.length);
      setServerCount(servers.length);
      setReminderCount(reminders.length);
      setRecentPCs(pcs.slice(0, 5));

      // Expiring licenses (within 60 days)
      const expiring = licenses.filter((l) => {
        if (!l.expiry_date) return false;
        const days = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 60;
      });
      setExpiringLicenses(expiring);

      // Upcoming reminders (within 1 week)
      const upcoming = reminders.filter((r) => {
        const days = Math.ceil((new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 7;
      });
      setUpcomingReminders(upcoming);

      // Device by type
      const byType: Record<string, number> = {};
      devices.forEach((d) => { byType[d.device_type] = (byType[d.device_type] ?? 0) + 1; });
      setDeviceByType(byType);

      // Server by environment
      const byEnv: Record<string, number> = {};
      servers.forEach((s) => { byEnv[s.environment] = (byEnv[s.environment] ?? 0) + 1; });
      setServerByEnv(byEnv);

      // Monthly registration data (last 6 months)
      const months: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleDateString('en', { month: 'short' });
        const count = [...pcs, ...assets, ...licenses, ...devices, ...servers].filter((r) => {
          const created = new Date(r.created_at);
          return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
        }).length;
        months.push({ month: monthName, count });
      }
      setMonthlyData(months);
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: 'PCs', value: pcCount, icon: <Monitor size={24} />, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', href: '/pc' },
    { label: 'Assets', value: assetCount, icon: <Boxes size={24} />, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', href: '/assets' },
    { label: 'IP Addresses', value: ipCount, icon: <Network size={24} />, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', href: '/ip' },
    { label: 'Licenses', value: licenseCount, icon: <KeyRound size={24} />, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', href: '/licenses' },
    { label: 'Devices', value: deviceCount, icon: <HardDrive size={24} />, color: 'from-green-500 to-green-600', bg: 'bg-green-50', href: '/devices' },
    { label: 'Servers', value: serverCount, icon: <ServerIcon size={24} />, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', href: '/servers' },
  ];

 

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-[#343494] to-[#4e4ec1] rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
        <p className="text-white/80 mt-1">Here's your IT asset inventory overview</p>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Alerts row */}
      <AlertsRow expiringLicenses={expiringLicenses} upcomingReminders={upcomingReminders} />

      {/* Charts row */}
      <ChartsRow monthlyData={monthlyData} serverByEnv={serverByEnv} serverCount={serverCount} />

      {/* Device type breakdown */}
      <DeviceType deviceByType={deviceByType} />

      {/* Recent registrations */}
     <RecentRegistration recentPCs={recentPCs} />
    </div>
  );
}
