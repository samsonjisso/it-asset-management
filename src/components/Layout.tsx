"use client";

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { GBBLogo } from './GBBLogo';
import { supabase, Reminder } from '../lib/supabase';
import {
  LayoutDashboard,
  Monitor,
  KeyRound,
  HardDrive,
  Server,
  Bell,
  FileBarChart,
  Users,
  Info,
  DatabaseBackup,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
  Calendar,
  Boxes,
  Network,
} from 'lucide-react';
import { UserRole } from '../lib/supabase';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'pc', href: '/pc', label: 'PC Registration', icon: <Monitor size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'assets', href: '/assets', label: 'Asset Registration', icon: <Boxes size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'ip', href: '/ip', label: 'IP Management', icon: <Network size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'licenses', href: '/licenses', label: 'License Registration', icon: <KeyRound size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'devices', href: '/devices', label: 'Device Registration', icon: <HardDrive size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'servers', href: '/servers', label: 'Server Registration', icon: <Server size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'reminders', href: '/reminders', label: 'Reminders', icon: <Bell size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'reports', href: '/reports', label: 'Reports', icon: <FileBarChart size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
  { id: 'departments', href: '/departments', label: 'Departments', icon: <Building2 size={20} />, roles: ['admin', 'manager'] },
  { id: 'users', href: '/users', label: 'User Management', icon: <Users size={20} />, roles: ['admin'] },
  { id: 'backup', href: '/backup', label: 'Backup & Restore', icon: <DatabaseBackup size={20} />, roles: ['admin', 'manager'] },
  { id: 'about', href: '/about', label: 'About', icon: <Info size={20} />, roles: ['admin', 'manager', 'register_user', 'assessor'] },
];

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const activePage = navItems.find((item) => pathname?.startsWith(item.href))?.id ?? 'dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  const visibleItems = navItems.filter((item) => profile && item.roles.includes(profile.role));

  useEffect(() => {
    loadReminders();
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_dismissed', false)
      .lte('remind_at', oneWeekLater.toISOString())
      .order('remind_at', { ascending: true });
    if (data) setReminders(data as Reminder[]);
  };

  const dismissReminder = async (id: string) => {
    await supabase.from('reminders').update({ is_dismissed: true }).eq('id', id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    register_user: 'Register User',
    assessor: 'Assessor (Read Only)',
  };

  return (
    <div className="flex h-screen bg-[#f5f5fc]">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#242467] to-[#343494] text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <GBBLogo size={44} className="rounded-lg bg-white p-1" />
          <div>
            <h1 className="text-sm font-bold leading-tight">Goh Betoch Bank</h1>
            <p className="text-[10px] text-[#ffc800] uppercase tracking-wider">IT Asset Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activePage === item.id
                  ? 'bg-[#ffc800] text-[#0c0c23] shadow-lg'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-white/50 leading-relaxed">
            Developed In-house by
            <br />
            <span className="text-[#ffc800] font-medium">Infrastructure Management Dept.</span>
            <br />
            Server & Datacenter Team / Samuel T.
          </p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#dadaf1] px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h2 className="text-lg font-semibold text-[#343494] capitalize hidden sm:block">
              {navItems.find((i) => i.id === activePage)?.label ?? 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Reminder bell */}
            <div className="relative">
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="relative p-2 rounded-lg text-gray-600 hover:bg-purple-50 transition-colors"
              >
                <Bell size={22} />
                {reminders.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center gbb-pulse">
                    {reminders.length}
                  </span>
                )}
              </button>

              {showReminders && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowReminders(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-[#dadaf1] z-40 gbb-fade-in max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-[#dadaf1] bg-[#343494] rounded-t-xl">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Calendar size={16} /> Upcoming Reminders
                      </h3>
                    </div>
                    {reminders.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 text-center">No upcoming reminders</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {reminders.map((r) => {
                          const days = Math.ceil(
                            (new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          );
                          return (
                            <div key={r.id} className="px-4 py-3 hover:bg-purple-50">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{r.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{r.reminder_type}</p>
                                  {r.detail && <p className="text-xs text-gray-600 mt-1">{r.detail}</p>}
                                  <p className="text-xs mt-1">
                                    <span
                                      className={`font-medium ${
                                        days <= 0
                                          ? 'text-red-600'
                                          : days <= 3
                                          ? 'text-amber-600'
                                          : 'text-[#343494]'
                                      }`}
                                    >
                                      {days <= 0
                                        ? 'Due now!'
                                        : `In ${days} day${days === 1 ? '' : 's'}`}
                                    </span>
                                    <span className="text-gray-400 ml-2">
                                      {new Date(r.remind_at).toLocaleDateString()}
                                    </span>
                                  </p>
                                </div>
                                <button
                                  onClick={() => dismissReminder(r.id)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#343494] to-[#4e4ec1] text-white flex items-center justify-center text-sm font-semibold">
                  {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-800">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{roleLabels[profile?.role ?? '']}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-[#dadaf1] z-40 gbb-fade-in py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                      <p className="text-xs text-[#343494] font-medium mt-1">
                        {roleLabels[profile?.role ?? '']}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50"
                    >
                      <Users size={16} /> My Profile
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        router.push('/login');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 gbb-fade-in">{children}</main>
      </div>
    </div>
  );
}
