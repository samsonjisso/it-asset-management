"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { GBBLogo } from "./GBBLogo";
import { supabase, Reminder } from "../lib/supabase";
import { api } from "../lib/api";
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
  Search,
  Plus,
  Moon,
  Sun,
  MonitorCog,
  Settings2,
  UserRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { UserRole } from "../lib/supabase";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
}
const ALL: UserRole[] = [
  "admin",
  "manager",
  "register_user",
  "assessor",
  "editor",
  "reader",
  "audit",
];
const WRITE: UserRole[] = ["admin", "manager", "register_user", "editor"];
const navItems: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={19} />,
    roles: ALL,
  },
  {
    id: "pc",
    href: "/pc",
    label: "PC Registration",
    icon: <Monitor size={19} />,
    roles: ALL,
  },
  {
    id: "ip",
    href: "/ip",
    label: "IP Management",
    icon: <Network size={19} />,
    roles: ALL,
  },
  {
    id: "licenses",
    href: "/licenses",
    label: "License Registration",
    icon: <KeyRound size={19} />,
    roles: ALL,
  },
  {
    id: "devices",
    href: "/devices",
    label: "Device Registration",
    icon: <HardDrive size={19} />,
    roles: ALL,
  },
  {
    id: "servers",
    href: "/servers",
    label: "Server Registration",
    icon: <Server size={19} />,
    roles: ALL,
  },
  {
    id: "reminders",
    href: "/reminders",
    label: "Reminders",
    icon: <Bell size={19} />,
    roles: ALL,
  },
  {
    id: "reports",
    href: "/reports",
    label: "Reports",
    icon: <FileBarChart size={19} />,
    roles: ALL,
  },
  {
    id: "departments",
    href: "/departments",
    label: "Departments",
    icon: <Building2 size={19} />,
    roles: ["admin", "manager"],
  },
  {
    id: "users",
    href: "/users",
    label: "User Management",
    icon: <Users size={19} />,
    roles: ["admin"],
  },
  {
    id: "backup",
    href: "/backup",
    label: "Backup & Restore",
    icon: <DatabaseBackup size={19} />,
    roles: ["admin", "manager"],
  },
  {
    id: "about",
    href: "/about",
    label: "About",
    icon: <Info size={19} />,
    roles: ALL,
  },
];
const customization = [
  ["device-types", "Device Types"],
  ["license-types", "License Types"],
  ["reminder-types", "Reminder Types"],
  ["server-owners", "Server Owners"],
  ["server-types", "Server Types"],
  ["server-environments", "Server Environments"],
  ["ip-subnets", "IP Subnets"],
  ["asset-models", "Asset Models"],
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const active =
    navItems.find((i) => pathname?.startsWith(i.href))?.id ??
    customization.find(([id]) => pathname?.startsWith("/" + id))?.[0] ??
    "dashboard";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const visible = navItems.filter(
    (i) => profile && i.roles.includes(profile.role),
  );
  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    manager: "Manager",
    register_user: "Register User",
    assessor: "Assessor (Read Only)",
    editor: "Editor",
    reader: "Reader",
    audit: "Audit",
  };
  useEffect(() => {
    loadReminders();
    const t = setInterval(loadReminders, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const saved = (localStorage.getItem("gbb_theme") as any) || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);
  const applyTheme = (mode: "light" | "dark" | "system") => {
    const dark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  };
  useEffect(() => {
    if (theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      const fn = () => applyTheme("system");
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    }
  }, [theme]);
  async function loadReminders() {
    const now = new Date(),
      later = new Date(now.getTime() + 7 * 86400000);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_dismissed", false)
      .lte("remind_at", later.toISOString())
      .order("remind_at", { ascending: true });
    if (data) setReminders(data as Reminder[]);
  }
  async function searchAll(q: string) {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const [pc, dev, srv, ip, lic] = await Promise.all([
      api.get<any[]>("/pc_registrations"),
      api.get<any[]>("/devices"),
      api.get<any[]>("/servers"),
      api.get<any[]>("/ip_addresses"),
      api.get<any[]>("/licenses"),
    ]);
    const term = q.toLowerCase();
    const out = [
      ...(pc.data || []).map((x) => ({ ...x, _type: "PC", _href: "/pc" })),
      ...(dev.data || []).map((x) => ({
        ...x,
        _type: "Device",
        _href: "/devices",
      })),
      ...(srv.data || []).map((x) => ({
        ...x,
        _type: "Server",
        _href: "/servers",
      })),
      ...(ip.data || []).map((x) => ({ ...x, _type: "IP", _href: "/ip" })),
      ...(lic.data || []).map((x) => ({
        ...x,
        _type: "License",
        _href: "/licenses",
      })),
    ]
      .filter((x) => JSON.stringify(x).toLowerCase().includes(term))
      .slice(0, 12);
    setResults(out);
  }
  useEffect(() => {
    const t = setTimeout(() => searchAll(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const createItems = useMemo(
    () => [
      { href: "/pc", label: "PC / Computer" },
      { href: "/devices", label: "Device" },
      { href: "/servers", label: "Server" },
      { href: "/ip", label: "IP Address" },
      { href: "/licenses", label: "License" },
    ],
    [],
  );
  return (
    <div className="flex h-screen bg-[var(--gbb-bg)] text-[var(--gbb-text)]">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#242467] to-[#343494] text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <GBBLogo size={44} className="rounded-lg" />
          <div>
            <h1 className="text-sm font-bold">Goh Betoch Bank</h1>
            <p className="text-[10px] text-[#ffc800] uppercase tracking-wider">
              IT Asset Management
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visible.map((i) => (
            <Link
              key={i.id}
              href={i.href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${active === i.id ? "bg-[#ffc800] text-[#0c0c23]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
            >
              {i.icon}
              {i.label}
            </Link>
          ))}
          {(profile?.role === "admin" || profile?.role === "manager") && (
            <>
              <div className="pt-4 pb-1 px-2 text-[10px] uppercase tracking-wider text-white/40">
                Customization
              </div>
              {customization.map(([id, label]) => (
                <Link
                  key={id}
                  href={"/" + id}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active === id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"}`}
                >
                  <Settings2 size={16} />
                  {label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-[10px] text-white/50">
          Developed In-house by
          <br />
          <span className="text-[#ffc800]">
            Infrastructure Management Dept.
          </span>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-[#1b1b29] border-b border-[#dadaf1] dark:border-white/10 px-4 lg:px-6 py-2.5 flex items-center gap-3 shadow-sm z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gbb-icon-button lg:hidden text-gray-600 dark:text-gray-200"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <h2 className="font-semibold text-[#343494] dark:text-[#b7b7ff] hidden sm:block">
            {navItems.find((i) => i.id === active)?.label ||
              customization.find(([id]) => id === active)?.[1] ||
              "Dashboard"}
          </h2>
          <div className="relative flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search assets, servers, devices, IPs..."
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#343494]/30"
              />
            </div>
            {showSearch && search.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1b1b29] rounded-lg shadow-xl border dark:border-white/10 max-h-96 overflow-y-auto z-50">
                {results.length ? (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        router.push(r._href);
                        setShowSearch(false);
                        setSearch("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b last:border-0 dark:border-white/10"
                    >
                      <div className="text-sm font-medium">
                        {r.hostname ||
                          r.ip_address ||
                          r.asset_id ||
                          r.license_type ||
                          "Record"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r._type} {r.asset_id ? `• ${r.asset_id}` : ""}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-gray-500">
                    No matching records
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setCreateOpen(!createOpen)}
              className="gbb-button hidden sm:flex bg-[#343494] text-white shadow-sm hover:bg-[#242467]"
            >
              <Plus size={16} />
              Create
            </button>
            {createOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1b1b29] rounded-lg shadow-xl border dark:border-white/10 z-50 py-1">
                {createItems.map((x) => (
                  <Link
                    key={x.href}
                    href={x.href}
                    onClick={() => setCreateOpen(false)}
                    className="block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    {x.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="gbb-icon-button relative text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Show reminders"
            >
              <Bell size={20} />
              {reminders.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  {reminders.length}
                </span>
              )}
            </button>
            {showReminders && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1b1b29] rounded-xl shadow-xl border dark:border-white/10 z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-3 bg-[#343494] text-white font-semibold">
                  Upcoming Reminders
                </div>
                {reminders.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">
                    No upcoming reminders
                  </p>
                ) : (
                  reminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 border-b dark:border-white/10"
                    >
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-gray-500">
                        {r.reminder_type} •{" "}
                        {new Date(r.remind_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="gbb-icon-button gap-2 px-1.5 hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Open account menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#343494] text-white flex items-center justify-center text-sm font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <ChevronDown size={15} />
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1b1b29] z-50">
                <div className="bg-gradient-to-br from-[#343494] to-[#242467] px-4 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                      <UserRound size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {profile?.full_name || "User"}
                      </p>
                      <p className="truncate text-xs text-white/70">
                        {roleLabels[profile?.role || ""]}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-white/15 pt-3 text-xs text-white/80">
                    <Mail size={14} />
                    <span className="truncate">
                      {profile?.email || "No email available"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <ShieldCheck
                    size={16}
                    className="text-[#343494] dark:text-[#b7b7ff]"
                  />
                  My Profile
                </Link>
                <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">
                  <p className="text-xs font-medium mb-2">Theme</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setTheme("light");
                        localStorage.setItem("gbb_theme", "light");
                        applyTheme("light");
                      }}
                      className="gbb-icon-button gbb-theme-button h-9 min-h-0 min-w-0 border px-2 hover:bg-gray-100 dark:hover:bg-white/5"
                      aria-label="Use light theme"
                    >
                      <Sun size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setTheme("dark");
                        localStorage.setItem("gbb_theme", "dark");
                        applyTheme("dark");
                      }}
                      className="gbb-icon-button gbb-theme-button h-9 min-h-0 min-w-0 border px-2 hover:bg-gray-100 dark:hover:bg-white/5"
                      aria-label="Use dark theme"
                    >
                      <Moon size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setTheme("system");
                        localStorage.setItem("gbb_theme", "system");
                        applyTheme("system");
                      }}
                      className="gbb-icon-button gbb-theme-button h-9 min-h-0 min-w-0 border px-2 hover:bg-gray-100 dark:hover:bg-white/5"
                      aria-label="Use system theme"
                    >
                      <MonitorCog size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    router.push("/login");
                  }}
                  className="gbb-button w-full justify-start rounded-none border-t border-gray-100 px-4 text-left text-red-600 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-950/30"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 gbb-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
