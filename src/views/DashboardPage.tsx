"use client";

import { useState, useEffect } from 'react';
import { supabase, PCRegistration, License, Device, Server, Reminder } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Monitor, KeyRound, HardDrive, Server as ServerIcon, Bell, AlertTriangle, TrendingUp, Calendar, Boxes, Network } from 'lucide-react';

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
    { label: 'PCs', value: pcCount, icon: <Monitor size={24} />, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: 'Assets', value: assetCount, icon: <Boxes size={24} />, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50' },
    { label: 'IP Addresses', value: ipCount, icon: <Network size={24} />, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Licenses', value: licenseCount, icon: <KeyRound size={24} />, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
    { label: 'Devices', value: deviceCount, icon: <HardDrive size={24} />, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
    { label: 'Servers', value: serverCount, icon: <ServerIcon size={24} />, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
  ];

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const deviceTypeLabels: Record<string, string> = {
    network: 'Network', physical_server: 'Physical Server', storage_server: 'Storage Server',
    wifi_access_point: 'WiFi AP', core_switch: 'Core Switch', access_switch: 'Access Switch',
    edge_router: 'Edge Router', ups: 'UPS', ac: 'AC', rack: 'Rack', cctv_camera: 'CCTV',
    printer_photocopy: 'Printer', fire_extinguisher: 'Fire Ext.', monitoring_tv: 'Monitor TV',
  };

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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 gbb-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-md`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring licenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-amber-600" />
            <h3 className="font-semibold text-gray-800">Expiring Licenses (60 days)</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{expiringLicenses.length}</span>
          </div>
          {expiringLicenses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No licenses expiring soon</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expiringLicenses.map((l) => {
                const days = Math.ceil((new Date(l.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={l.id} className="flex items-center justify-between bg-amber-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.license_subtype ?? l.license_type}</p>
                      <p className="text-xs text-gray-500">Expires: {new Date(l.expiry_date!).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days < 0 ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-100'}`}>
                      {days < 0 ? 'Expired' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming reminders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-[#343494]" />
            <h3 className="font-semibold text-gray-800">Upcoming Reminders</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium">{upcomingReminders.length}</span>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No upcoming reminders</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingReminders.map((r) => {
                const days = Math.ceil((new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={r.id} className="flex items-center justify-between bg-blue-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.reminder_type} - {new Date(r.remind_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-100'}`}>
                      {days <= 0 ? 'Due!' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly registration trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-[#343494]" />
            <h3 className="font-semibold text-gray-800">Registration Trend (6 months)</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-40 pt-4">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                  <div
                    className="w-full max-w-[40px] bg-gradient-to-t from-[#343494] to-[#4e4ec1] rounded-t-lg transition-all hover:from-[#4e4ec1] hover:to-[#ffc800] relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-medium">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Server by environment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ServerIcon size={20} className="text-[#343494]" />
            <h3 className="font-semibold text-gray-800">Servers by Environment</h3>
          </div>
          <div className="space-y-3">
            {['production', 'test', 'standby'].map((env) => {
              const count = serverByEnv[env] ?? 0;
              const pct = serverCount > 0 ? (count / serverCount) * 100 : 0;
              const colors = { production: 'bg-red-500', test: 'bg-blue-500', standby: 'bg-gray-400' };
              return (
                <div key={env}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-gray-700">{env}</span>
                    <span className="text-gray-500">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[env as keyof typeof colors]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Device type breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Devices by Type</h3>
        {Object.keys(deviceByType).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No devices registered</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(deviceByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-sm text-gray-700">{deviceTypeLabels[type] ?? type}</span>
                <span className="text-sm font-bold text-[#343494]">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent registrations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-[#343494]" />
          <h3 className="font-semibold text-gray-800">Recent PC Registrations</h3>
        </div>
        {recentPCs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No PCs registered yet</p>
        ) : (
          <div className="space-y-2">
            {recentPCs.map((pc) => (
              <div key={pc.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Monitor size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pc.hostname}</p>
                    <p className="text-xs text-gray-500">{pc.ip_address ?? 'No IP'} - {pc.service_tag ?? 'No tag'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(pc.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
