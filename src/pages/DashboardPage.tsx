'use client';

import { useState, useEffect } from 'react';
import { supabase, PCRegistration, License, Device, Server, Reminder } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Monitor, KeyRound, HardDrive, Server as ServerIcon, Bell, AlertTriangle, TrendingUp, Calendar, Network } from 'lucide-react';

export function DashboardPage({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const { profile, hasModuleAccess } = useAuth();
  const [pcCount, setPcCount] = useState(0);
  const [ipCount, setIpCount] = useState(0);
  const [licenseCount, setLicenseCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [serverCount, setServerCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [recentPCs, setRecentPCs] = useState<PCRegistration[]>([]);
  const [deviceByType, setDeviceByType] = useState<Record<string, number>>({});
  const [serverByEnv, setServerByEnv] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [pc, ip, lic, dev, srv, rem] = await Promise.all([
        supabase.from('pc_registrations').select('*'),
        supabase.from('ip_addresses').select('*'),
        supabase.from('licenses').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('servers').select('*'),
        supabase.from('reminders').select('*').eq('is_dismissed', false),
      ]);

      const pcs = (pc.data ?? []) as PCRegistration[];
      const ips = (ip.data ?? []) as any[];
      const licenses = (lic.data ?? []) as License[];
      const devices = (dev.data ?? []) as Device[];
      const servers = (srv.data ?? []) as Server[];
      const reminders = (rem.data ?? []) as Reminder[];

      setPcCount(pcs.length);
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
        const count = [...pcs, ...licenses, ...devices, ...servers].filter((r) => {
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
    { label: 'PCs', value: pcCount, icon: <Monitor size={24} />, color: 'from-brand-500 to-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/40', page: 'pc' },
    { label: 'IP Addresses', value: ipCount, icon: <Network size={24} />, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', page: 'ip' },
    { label: 'Licenses', value: licenseCount, icon: <KeyRound size={24} />, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', page: 'licenses' },
    { label: 'Devices', value: deviceCount, icon: <HardDrive size={24} />, color: 'from-green-500 to-green-600', bg: 'bg-green-50', page: 'devices' },
    { label: 'Servers', value: serverCount, icon: <ServerIcon size={24} />, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', page: 'servers' },
    { label: 'Reminders', value: reminderCount, icon: <Bell size={24} />, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', page: 'reminders' },
  ];

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const deviceTypeLabels: Record<string, string> = {
    network: 'Network', physical_server: 'Physical Server', storage_server: 'Storage Server',
    wifi_access_point: 'WiFi AP', core_switch: 'Core Switch', access_switch: 'Access Switch',
    edge_router: 'Edge Router', ups: 'UPS', ac: 'AC', rack: 'Rack', cctv_camera: 'CCTV',
    printer_photocopy: 'Printer', fire_extinguisher: 'Fire Ext.', monitoring_tv: 'Monitor TV',
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome header — Goh Betoch Bank corporate navy, matching the
          top bar and footer branding, not the brighter accent blue. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 rounded-2xl p-6 sm:p-7 text-white shadow-lift">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gold-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-gold-300 text-xs font-semibold uppercase tracking-wider mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-white/70 mt-1.5 text-sm">Here's your IT asset inventory overview</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 self-start sm:self-auto ring-1 ring-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400 gbb-pulse" />
            <span className="text-xs font-medium text-white/90">
              {pcCount + ipCount + licenseCount + deviceCount + serverCount} assets tracked
            </span>
          </div>
        </div>
      </div>

      {/* Stats cards — each is clickable, jumping straight to that
          module's page, but only when onNavigate is wired up and the
          signed-in account actually has access to that module (Per-
          User Module Access); otherwise it renders as a plain,
          non-interactive card exactly as before. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const clickable = !!onNavigate && hasModuleAccess(stat.page);
          return (
            <button
              key={stat.label}
              type="button"
              onClick={clickable ? () => onNavigate!(stat.page) : undefined}
              disabled={!clickable}
              aria-label={clickable ? `Go to ${stat.label}` : undefined}
              className={`text-left w-full bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5 gbb-card-hover transition-shadow ${
                clickable ? 'cursor-pointer hover:shadow-lift hover:border-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2' : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-soft`}>
                  {stat.icon}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring licenses */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Expiring Licenses (60 days)</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">{expiringLicenses.length}</span>
          </div>
          {expiringLicenses.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No licenses expiring soon</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expiringLicenses.map((l) => {
                const days = Math.ceil((new Date(l.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={l.id} className="flex items-center justify-between bg-amber-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{l.license_subtype ?? l.license_type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expires: {new Date(l.expiry_date!).toLocaleDateString()}</p>
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
              <Bell size={16} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Upcoming Reminders</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 font-semibold">{upcomingReminders.length}</span>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No upcoming reminders</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingReminders.map((r) => {
                const days = Math.ceil((new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={r.id} className="flex items-center justify-between bg-brand-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{r.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{r.reminder_type} - {new Date(r.remind_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? 'text-red-600 bg-red-50' : 'text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/50'}`}>
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Registration Trend (6 months)</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-40 pt-4">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                  <div
                    className="w-full max-w-[40px] bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-lg transition-all hover:from-brand-500 hover:to-gold-400 relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Server by environment */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
              <ServerIcon size={16} />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Servers by Environment</h3>
          </div>
          <div className="space-y-3">
            {['production', 'test', 'standby'].map((env) => {
              const count = serverByEnv[env] ?? 0;
              const pct = serverCount > 0 ? (count / serverCount) * 100 : 0;
              const colors = { production: 'bg-red-500', test: 'bg-brand-500', standby: 'bg-gray-400 dark:bg-gray-600' };
              return (
                <div key={env}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-gray-700 dark:text-gray-300">{env}</span>
                    <span className="text-gray-500 dark:text-gray-400">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[env as keyof typeof colors]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Device type breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Devices by Type</h3>
        {Object.keys(deviceByType).length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No devices registered</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(deviceByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2.5">
                <span className="text-sm text-gray-700 dark:text-gray-300">{deviceTypeLabels[type] ?? type}</span>
                <span className="text-sm font-bold text-brand-600">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent registrations */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
            <Calendar size={16} />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Recent PC Registrations</h3>
        </div>
        {recentPCs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No PCs registered yet</p>
        ) : (
          <div className="space-y-2">
            {recentPCs.map((pc) => (
              <div key={pc.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center"><Monitor size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{pc.hostname}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{pc.ip_address ?? 'No IP'} - {pc.service_tag ?? 'No tag'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(pc.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
